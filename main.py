import os
import re
import uuid
from io import BytesIO
from contextlib import asynccontextmanager
import asyncio

import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from supabase import create_client

from app.auth import criar_hash_senha
from app.auth_routes import router as auth_router
from app.carteirinha_routes import criar_router_carteirinha
from app.consulta_schemas import (
    ConsultaAtendimento,
    ConsultaCreate,
    ConsultaStatus,
    VeterinarioCreate,
    VeterinarioUpdate,
)
from app.database import conectar
from app.estoque_routes import criar_router_estoque
from app.exame_routes import criar_router_exame
from app.schemas import PetCreate
from app.tutor_schemas import TutorCreate
from app.vacinacao_routes import criar_router_vacinacao


load_dotenv()


# ==========================================
# CONEXÃO COM SUPABASE STORAGE
# ==========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")


def conectar_supabase():
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise RuntimeError(
            "Configurações do Supabase não encontradas."
        )

    return create_client(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY
    )


# ==========================================
# CONFIGURAÇÃO DO VET CARE
# ==========================================

EM_PRODUCAO = os.getenv("COOKIE_SECURE", "false").lower() == "true"


async def sincronizacao_automatica():
    from sincronizar_carteirinha import processar_pendencias

    while True:
        try:
            await asyncio.to_thread(processar_pendencias)
        except Exception as erro:
            print("Erro na sincronização automática:", erro)

        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app):
    tarefa = None

    if os.getenv("ATIVAR_SYNC_AUTOMATICA", "false").lower() == "true":
        tarefa = asyncio.create_task(sincronizacao_automatica())

    try:
        yield
    finally:
        if tarefa:
            tarefa.cancel()
            try:
                await tarefa
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="Vet Care",
    version="1.0.0",
    docs_url=None if EM_PRODUCAO else "/docs",
    redoc_url=None if EM_PRODUCAO else "/redoc",
    openapi_url=None if EM_PRODUCAO else "/openapi.json",
    lifespan=lifespan
)

chave_sessao = os.getenv("SESSION_SECRET_KEY")

if not chave_sessao:
    raise RuntimeError(
        "Configure SESSION_SECRET_KEY no arquivo .env"
    )

app.add_middleware(
    SessionMiddleware,
    secret_key=chave_sessao,
    session_cookie="vetcare_session",
    max_age=28800,
    same_site="lax",
    https_only=EM_PRODUCAO
)

app.include_router(auth_router)

app.mount(
    "/static",
    StaticFiles(directory="frontend"),
    name="static"
)


@app.get("/")
def pagina_inicial():
    return FileResponse("frontend/index.html")


# ==========================================
# FUNÇÕES AUXILIARES DO BANCO
# ==========================================

@app.get("/verificar-banco", include_in_schema=False)
def verificar_banco():
    if EM_PRODUCAO:
        raise HTTPException(
            status_code=404,
            detail="Not Found"
        )

    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute("SELECT DATABASE()")
            return {
                "banco_conectado": cur.fetchone()[0]
            }

        finally:
            cur.close()

    finally:
        db.close()


def consultar(sql, params=()):
    db = conectar()

    try:
        cur = db.cursor(dictionary=True)

        try:
            cur.execute(sql, params)
            return cur.fetchall()

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        raise HTTPException(
            500,
            "Erro ao consultar o banco de dados."
        ) from exc

    finally:
        db.close()


def executar(sql, params=(), verificar=False):
    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(sql, params)

            if verificar and cur.rowcount == 0:
                db.rollback()
                raise HTTPException(
                    404,
                    "Registro não encontrado ou desativado."
                )

            novo_id = cur.lastrowid
            db.commit()

            return novo_id

        finally:
            cur.close()

    except mysql.connector.IntegrityError as exc:
        db.rollback()

        if exc.errno == 1062:
            raise HTTPException(
                409,
                "Já existe um registro com esse CPF ou dado único."
            ) from exc

        if exc.errno == 1452:
            raise HTTPException(
                404,
                "Registro relacionado não encontrado."
            ) from exc

        raise HTTPException(
            400,
            "Dados inválidos para o banco de dados."
        ) from exc

    except mysql.connector.Error as exc:
        db.rollback()
        raise HTTPException(
            500,
            "Erro ao salvar no banco de dados."
        ) from exc

    finally:
        db.close()


# ==========================================
# SINCRONIZAÇÃO DA CARTEIRINHA (PETS)
# ==========================================

def registrar_sincronizacao(cursor, id_pet, operacao):
    cursor.execute(
        """
        INSERT INTO sincronizacao_carteirinha
            (id_pet, operacao, status)
        VALUES (%s, %s, 'pendente')
        """,
        (id_pet, operacao)
    )


def cadastrar_pet_com_sincronizacao(sql, params, sincronizar=True):
    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(sql, params)
            id_pet = cur.lastrowid

            if sincronizar:
                registrar_sincronizacao(
                    cur,
                    id_pet,
                    "atualizar"
                )

            db.commit()
            return id_pet

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao cadastrar animal."
        ) from exc

    finally:
        db.close()


def editar_pet_com_sincronizacao(sql, params, id_pet, sincronizar=True):
    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(sql, params)

            if cur.rowcount == 0:
                cur.execute(
                    """
                    SELECT id_pet
                    FROM PET
                    WHERE id_pet = %s
                      AND ativo = 1
                    """,
                    (id_pet,)
                )

                if cur.fetchone() is None:
                    db.rollback()
                    raise HTTPException(
                        status_code=404,
                        detail="Animal não encontrado ou desativado."
                    )

            if sincronizar:
                registrar_sincronizacao(
                    cur,
                    id_pet,
                    "atualizar"
                )

            db.commit()

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao atualizar animal."
        ) from exc

    finally:
        db.close()


def desativar_pet_com_sincronizacao(id_pet):
    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(
                """
                UPDATE PET
                SET ativo = 0
                WHERE id_pet = %s
                  AND ativo = 1
                """,
                (id_pet,)
            )

            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Animal não encontrado ou desativado."
                )

            registrar_sincronizacao(
                cur,
                id_pet,
                "desativar"
            )

            db.commit()

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao desativar animal."
        ) from exc

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# ==========================================
# AUTENTICAÇÃO E PERMISSÕES
# ==========================================

def exigir_funcionario(request: Request):
    id_funcionario = request.session.get(
        "id_funcionario"
    )

    if not id_funcionario:
        raise HTTPException(
            401,
            "Você precisa fazer login."
        )

    funcionarios = consultar(
        """
        SELECT
            id_funcionario,
            nome,
            perfil
        FROM FUNCIONARIO
        WHERE id_funcionario = %s
          AND ativo = 1
          AND status_cadastro = 'aprovado'
        """,
        (id_funcionario,)
    )

    if not funcionarios:
        request.session.clear()

        raise HTTPException(
            401,
            "Sessão inválida."
        )

    return funcionarios[0]


def exigir_administrador(request: Request):
    funcionario = exigir_funcionario(request)

    if funcionario["perfil"] != "administrador":
        raise HTTPException(
            403,
            "Acesso permitido apenas para administradores."
        )

    return funcionario


def exigir_perfil(request: Request, perfis):
    funcionario = exigir_funcionario(request)

    if funcionario["perfil"] not in perfis:
        raise HTTPException(
            403,
            "Você não tem permissão para esta operação."
        )

    return funcionario


def validar_dados_veterinario(dados):
    nome = dados.nome.strip()
    email = dados.email.strip().lower()
    cpf = re.sub(r"\D", "", dados.cpf)

    telefone = (
        re.sub(r"\D", "", dados.telefone)
        if dados.telefone else None
    )

    crmv = dados.crmv.strip().upper()

    if len(nome) < 2:
        raise HTTPException(
            400,
            "Informe o nome do veterinário."
        )

    if len(cpf) != 11:
        raise HTTPException(
            400,
            "O CPF deve conter 11 dígitos."
        )

    if not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email
    ):
        raise HTTPException(
            400,
            "Informe um e-mail válido."
        )

    if telefone and len(telefone) not in (10, 11):
        raise HTTPException(
            400,
            "Informe um telefone válido."
        )

    if not crmv:
        raise HTTPException(
            400,
            "Informe o CRMV."
        )

    return nome, email, cpf, telefone, crmv


# ==========================================
# MÓDULO DE ANIMAIS
# ==========================================

@app.get("/pets")
def listar_pets(request: Request):
    exigir_funcionario(request)

    return consultar(
        """
        SELECT
            id_pet,
            nome,
            especie,
            raca,
            sexo,
            data_nascimento,
            peso
        FROM PET
        WHERE ativo = 1
        ORDER BY id_pet
        """
    )


@app.get("/pets/{id_pet}")
def buscar_pet_por_id(
    id_pet: int,
    request: Request
):
    exigir_funcionario(request)

    pets = consultar(
        """
        SELECT
            id_pet,
            nome,
            especie,
            raca,
            sexo,
            data_nascimento,
            peso,
            foto_url
        FROM PET
        WHERE id_pet = %s
          AND ativo = 1
        """,
        (id_pet,)
    )

    if not pets:
        raise HTTPException(
            404,
            "Animal não encontrado."
        )

    return pets[0]


@app.post("/pets", status_code=201)
def cadastrar_pet(
    pet: PetCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente", "veterinario")
    )

    # O cabeçalho de teste só vale fora de produção
    cadastro_de_teste = (
        not EM_PRODUCAO
        and request.headers.get("x-vetcare-teste") == "cypress"
    )

    pid = cadastrar_pet_com_sincronizacao(
        """
        INSERT INTO PET
        (
            nome,
            especie,
            raca,
            sexo,
            data_nascimento,
            peso,
            codigo_carteirinha
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            pet.nome,
            pet.especie,
            pet.raca,
            pet.sexo,
            pet.data_nascimento,
            pet.peso,
            str(uuid.uuid4())
        ),
        sincronizar=not cadastro_de_teste
    )

    return {
        "mensagem": "Animal cadastrado com sucesso!",
        "id_pet": pid
    }


@app.put("/pets/{id_pet}")
def editar_pet(
    id_pet: int,
    pet: PetCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente", "veterinario")
    )
    cadastro_de_teste = (
        request.headers.get("x-vetcare-teste") == "cypress"
    )

    editar_pet_com_sincronizacao(
        """
        UPDATE PET
        SET
            nome = %s,
            especie = %s,
            raca = %s,
            sexo = %s,
            data_nascimento = %s,
            peso = %s
        WHERE id_pet = %s
          AND ativo = 1
        """,
        (
            pet.nome,
            pet.especie,
            pet.raca,
            pet.sexo,
            pet.data_nascimento,
            pet.peso,
            id_pet
        ),
        id_pet,
        sincronizar=not cadastro_de_teste
    )

    return {
        "mensagem": "Animal atualizado com sucesso!"
    }


@app.post("/pets/{id_pet}/foto")
async def enviar_foto_pet(
    id_pet: int,
    request: Request,
    foto: UploadFile = File(...)
):
    exigir_perfil(
        request,
        ("administrador", "atendente", "veterinario")
    )

    # Verifica se o animal existe e está ativo
    pets = consultar(
        """
        SELECT id_pet
        FROM PET
        WHERE id_pet = %s AND ativo = 1
        """,
        (id_pet,)
    )

    if not pets:
        raise HTTPException(
            status_code=404,
            detail="Animal não encontrado ou desativado."
        )

    tipos_permitidos = (
        "image/jpeg",
        "image/png",
        "image/webp"
    )

    if foto.content_type not in tipos_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Envie uma imagem JPG, PNG ou WEBP."
        )

    # Lê a imagem enviada
    conteudo_foto = await foto.read()

    if not conteudo_foto:
        raise HTTPException(
            status_code=400,
            detail="A foto enviada está vazia."
        )

    # Limite de 5 MB
    tamanho_maximo = 5 * 1024 * 1024

    if len(conteudo_foto) > tamanho_maximo:
        raise HTTPException(
            status_code=400,
            detail="A foto deve ter no máximo 5 MB."
        )

    # Verifica o formato real da imagem
    try:
        imagem = Image.open(BytesIO(conteudo_foto))
        formato_real = imagem.format
        imagem.verify()

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="O arquivo enviado não é uma imagem válida."
        )

    formatos_permitidos = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp"
    }

    if formatos_permitidos.get(formato_real) != foto.content_type:
        raise HTTPException(
            status_code=400,
            detail="O formato da imagem não corresponde ao tipo enviado."
        )

    extensoes = {
        "JPEG": "jpg",
        "PNG": "png",
        "WEBP": "webp"
    }

    extensao = extensoes[formato_real]

    # Gera nome único
    nome_arquivo = f"pets/{uuid.uuid4()}.{extensao}"

    # Conecta ao Supabase e envia a foto
    try:
        supabase = conectar_supabase()

        supabase.storage.from_("fotos-pets").upload(
            path=nome_arquivo,
            file=conteudo_foto,
            file_options={
                "content-type": foto.content_type
            }
        )

        url_foto = supabase.storage.from_(
            "fotos-pets"
        ).get_public_url(nome_arquivo)

    except Exception as erro:
        print(
            "ERRO NO UPLOAD SUPABASE:",
            type(erro).__name__,
            str(erro),
            flush=True
        )

        raise HTTPException(
            status_code=502,
            detail="Não foi possível enviar a foto ao Supabase."
        ) from erro

    # Salva a URL da foto e registra a sincronização
    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(
                """
                UPDATE PET
                SET foto_url = %s
                WHERE id_pet = %s AND ativo = 1
                """,
                (url_foto, id_pet)
            )

            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Animal não encontrado ou desativado."
                )

            registrar_sincronizacao(
                cur,
                id_pet,
                "atualizar"
            )

            db.commit()

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao salvar a foto do animal."
        ) from exc

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    return {
        "mensagem": "Foto enviada e salva com sucesso!",
        "id_pet": id_pet,
        "foto_url": url_foto
    }


@app.delete("/pets/{id_pet}")
def excluir_pet(
    id_pet: int,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    desativar_pet_com_sincronizacao(id_pet)

    return {
        "mensagem": "Animal desativado com sucesso!"
    }


# ==========================================
# MÓDULO DE TUTORES
# ==========================================

@app.get("/tutores")
def listar_tutores(request: Request):
    exigir_funcionario(request)

    tutores = consultar(
        """
        SELECT
            id_tutor,
            nome,
            cpf,
            email,
            telefone,
            endereco
        FROM TUTOR
        WHERE ativo = 1
        ORDER BY id_tutor
        """
    )

    return {
        "total": len(tutores),
        "tutores": tutores
    }


@app.post("/tutores", status_code=201)
def cadastrar_tutor(
    tutor: TutorCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    tid = executar(
        """
        INSERT INTO TUTOR
        (
            nome,
            cpf,
            email,
            telefone,
            endereco
        )
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            tutor.nome,
            tutor.cpf,
            tutor.email,
            tutor.telefone,
            tutor.endereco
        )
    )

    return {
        "mensagem": "Tutor cadastrado com sucesso!",
        "id_tutor": tid
    }


@app.put("/tutores/{id_tutor}")
def editar_tutor(
    id_tutor: int,
    tutor: TutorCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    executar(
        """
        UPDATE TUTOR
        SET
            nome = %s,
            cpf = %s,
            email = %s,
            telefone = %s,
            endereco = %s
        WHERE id_tutor = %s
          AND ativo = 1
        """,
        (
            tutor.nome,
            tutor.cpf,
            tutor.email,
            tutor.telefone,
            tutor.endereco,
            id_tutor
        ),
        True
    )

    return {
        "mensagem": "Tutor atualizado com sucesso!"
    }


@app.delete("/tutores/{id_tutor}")
def excluir_tutor(
    id_tutor: int,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    executar(
        """
        UPDATE TUTOR
        SET ativo = 0
        WHERE id_tutor = %s
          AND ativo = 1
        """,
        (id_tutor,),
        True
    )

    return {
        "mensagem": "Tutor desativado com sucesso!"
    }


# ==========================================
# MÓDULO DE VÍNCULOS
# ==========================================

class VinculoCreate(BaseModel):
    id_pet: int
    id_tutor: int
    tutor_principal: bool = False


@app.get("/vinculos")
def listar_vinculos(request: Request):
    exigir_funcionario(request)

    return consultar(
        """
        SELECT
            tp.id_pet,
            p.nome AS pet_nome,
            tp.id_tutor,
            t.nome AS tutor_nome,
            tp.tutor_principal
        FROM TUTOR_PET tp
        JOIN PET p
            ON p.id_pet = tp.id_pet
        JOIN TUTOR t
            ON t.id_tutor = tp.id_tutor
        WHERE p.ativo = 1
          AND t.ativo = 1
        ORDER BY
            p.nome,
            tp.tutor_principal DESC,
            t.nome
        """
    )


@app.post("/vinculos", status_code=201)
def criar_vinculo(
    v: VinculoCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(
                """
                SELECT id_pet
                FROM PET
                WHERE id_pet = %s
                  AND ativo = 1
                """,
                (v.id_pet,)
            )

            if not cur.fetchone():
                raise HTTPException(
                    404,
                    "Animal não encontrado ou desativado."
                )

            cur.execute(
                """
                SELECT id_tutor
                FROM TUTOR
                WHERE id_tutor = %s
                  AND ativo = 1
                """,
                (v.id_tutor,)
            )

            if not cur.fetchone():
                raise HTTPException(
                    404,
                    "Tutor não encontrado ou desativado."
                )

            cur.execute(
                """
                SELECT id_pet
                FROM TUTOR_PET
                WHERE id_pet = %s
                  AND id_tutor = %s
                """,
                (v.id_pet, v.id_tutor)
            )

            if cur.fetchone():
                raise HTTPException(
                    409,
                    "Esse vínculo já existe."
                )

            if v.tutor_principal:
                cur.execute(
                    """
                    UPDATE TUTOR_PET
                    SET tutor_principal = 0
                    WHERE id_pet = %s
                    """,
                    (v.id_pet,)
                )

            cur.execute(
                """
                INSERT INTO TUTOR_PET
                (
                    id_tutor,
                    id_pet,
                    tutor_principal
                )
                VALUES (%s, %s, %s)
                """,
                (
                    v.id_tutor,
                    v.id_pet,
                    v.tutor_principal
                )
            )

            db.commit()

            return {
                "mensagem": "Vínculo cadastrado com sucesso!"
            }

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao vincular tutor e animal."
        ) from exc

    finally:
        db.close()


@app.put("/vinculos/{id_pet}/{id_tutor}/principal")
def definir_principal(
    id_pet: int,
    id_tutor: int,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(
                """
                SELECT id_pet
                FROM TUTOR_PET
                WHERE id_pet = %s
                  AND id_tutor = %s
                """,
                (id_pet, id_tutor)
            )

            if not cur.fetchone():
                raise HTTPException(
                    404,
                    "Vínculo não encontrado."
                )

            cur.execute(
                """
                UPDATE TUTOR_PET
                SET tutor_principal = 0
                WHERE id_pet = %s
                """,
                (id_pet,)
            )

            cur.execute(
                """
                UPDATE TUTOR_PET
                SET tutor_principal = 1
                WHERE id_pet = %s
                  AND id_tutor = %s
                """,
                (id_pet, id_tutor)
            )

            db.commit()

            return {
                "mensagem": "Tutor principal atualizado!"
            }

        finally:
            cur.close()

    except mysql.connector.Error as exc:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao atualizar tutor principal."
        ) from exc

    finally:
        db.close()


@app.delete("/vinculos/{id_pet}/{id_tutor}")
def remover_vinculo(
    id_pet: int,
    id_tutor: int,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    executar(
        """
        DELETE FROM TUTOR_PET
        WHERE id_pet = %s
          AND id_tutor = %s
        """,
        (id_pet, id_tutor),
        True
    )

    return {
        "mensagem": "Vínculo removido com sucesso!"
    }


# ==========================================
# MÓDULO DE VETERINÁRIOS
# ==========================================

@app.get("/veterinarios")
def listar_veterinarios(request: Request):
    exigir_funcionario(request)

    return consultar(
        """
        SELECT
            id_funcionario,
            nome,
            email,
            telefone,
            cargo,
            crmv
        FROM FUNCIONARIO
        WHERE perfil = 'veterinario'
          AND ativo = 1
          AND crmv IS NOT NULL
          AND TRIM(crmv) <> ''
        ORDER BY nome
        """
    )


@app.post("/veterinarios", status_code=201)
def cadastrar_veterinario(
    dados: VeterinarioCreate,
    request: Request
):
    exigir_administrador(request)

    nome, email, cpf, telefone, crmv = (
        validar_dados_veterinario(dados)
    )

    senha_hash = criar_hash_senha(dados.senha)

    db = conectar()
    cur = db.cursor()

    try:
        # status_cadastro = 'aprovado' porque exigir_funcionario()
        # só aceita funcionários aprovados; sem isso o veterinário
        # criado pelo administrador não conseguiria usar o sistema.
        cur.execute(
            """
            INSERT INTO FUNCIONARIO
            (
                nome,
                email,
                cpf,
                telefone,
                senha,
                cargo,
                perfil,
                ativo,
                crmv,
                status_cadastro
            )
            VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                nome,
                email,
                cpf,
                telefone,
                senha_hash,
                "Veterinário",
                "veterinario",
                1,
                crmv,
                "aprovado"
            )
        )

        novo_id = cur.lastrowid
        db.commit()

        return {
            "mensagem": "Veterinário cadastrado com sucesso!",
            "id_funcionario": novo_id
        }

    except mysql.connector.IntegrityError as erro:
        db.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                409,
                "E-mail, CPF ou outro dado único já cadastrado."
            ) from erro

        raise HTTPException(
            400,
            "Não foi possível cadastrar o veterinário."
        ) from erro

    except mysql.connector.Error as erro:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao cadastrar veterinário."
        ) from erro

    finally:
        cur.close()
        db.close()


@app.put("/veterinarios/{id_veterinario}")
def editar_veterinario(
    id_veterinario: int,
    dados: VeterinarioUpdate,
    request: Request
):
    exigir_administrador(request)

    nome, email, cpf, telefone, crmv = (
        validar_dados_veterinario(dados)
    )

    db = conectar()
    cur = db.cursor()

    try:
        cur.execute(
            """
            SELECT id_funcionario
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
              AND perfil = 'veterinario'
              AND ativo = 1
            """,
            (id_veterinario,)
        )

        if not cur.fetchone():
            raise HTTPException(
                404,
                "Veterinário não encontrado."
            )

        cur.execute(
            """
            UPDATE FUNCIONARIO
            SET
                nome = %s,
                email = %s,
                cpf = %s,
                telefone = %s,
                crmv = %s
            WHERE id_funcionario = %s
              AND perfil = 'veterinario'
              AND ativo = 1
            """,
            (
                nome,
                email,
                cpf,
                telefone,
                crmv,
                id_veterinario
            )
        )

        db.commit()

        return {
            "mensagem": "Veterinário atualizado com sucesso!"
        }

    except HTTPException:
        db.rollback()
        raise

    except mysql.connector.IntegrityError as erro:
        db.rollback()

        raise HTTPException(
            409,
            "E-mail, CPF ou outro dado único já cadastrado."
        ) from erro

    except mysql.connector.Error as erro:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao atualizar veterinário."
        ) from erro

    finally:
        cur.close()
        db.close()


@app.delete("/veterinarios/{id_veterinario}")
def desativar_veterinario(
    id_veterinario: int,
    request: Request
):
    exigir_administrador(request)

    db = conectar()
    cur = db.cursor()

    try:
        cur.execute(
            """
            SELECT id_funcionario
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
              AND perfil = 'veterinario'
              AND ativo = 1
            """,
            (id_veterinario,)
        )

        if not cur.fetchone():
            raise HTTPException(
                404,
                "Veterinário não encontrado."
            )

        cur.execute(
            """
            SELECT id_consulta
            FROM CONSULTA
            WHERE id_veterinario = %s
              AND status_consulta IN (
                  'agendada',
                  'em_atendimento'
              )
            LIMIT 1
            """,
            (id_veterinario,)
        )

        if cur.fetchone():
            raise HTTPException(
                409,
                "O veterinário possui consultas pendentes. "
                "Reagende ou finalize antes de desativá-lo."
            )

        cur.execute(
            """
            UPDATE FUNCIONARIO
            SET ativo = 0
            WHERE id_funcionario = %s
              AND perfil = 'veterinario'
            """,
            (id_veterinario,)
        )

        db.commit()

        return {
            "mensagem": "Veterinário desativado com sucesso!"
        }

    except HTTPException:
        db.rollback()
        raise

    except mysql.connector.Error as erro:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao desativar veterinário."
        ) from erro

    finally:
        cur.close()
        db.close()


# ==========================================
# MÓDULO DE CONSULTAS
# ==========================================

def validar_agendamento(cur, consulta):
    cur.execute(
        """
        SELECT id_pet
        FROM PET
        WHERE id_pet = %s
          AND ativo = 1
        """,
        (consulta.id_pet,)
    )

    if not cur.fetchone():
        raise HTTPException(
            404,
            "Animal não encontrado ou desativado."
        )

    cur.execute(
        """
        SELECT id_tutor
        FROM TUTOR
        WHERE id_tutor = %s
          AND ativo = 1
        """,
        (consulta.id_tutor,)
    )

    if not cur.fetchone():
        raise HTTPException(
            404,
            "Tutor não encontrado ou desativado."
        )

    cur.execute(
        """
        SELECT id_pet
        FROM TUTOR_PET
        WHERE id_pet = %s
          AND id_tutor = %s
        """,
        (
            consulta.id_pet,
            consulta.id_tutor
        )
    )

    if not cur.fetchone():
        raise HTTPException(
            400,
            "O tutor selecionado não está vinculado ao animal."
        )

    cur.execute(
        """
        SELECT id_funcionario
        FROM FUNCIONARIO
        WHERE id_funcionario = %s
          AND perfil = 'veterinario'
          AND ativo = 1
          AND crmv IS NOT NULL
          AND TRIM(crmv) <> ''
        """,
        (consulta.id_veterinario,)
    )

    if not cur.fetchone():
        raise HTTPException(
            400,
            "Selecione um veterinário ativo com CRMV."
        )


@app.get("/consultas")
def listar_consultas(request: Request):
    funcionario = exigir_funcionario(request)

    # LEFT(CAST(... AS CHAR), 5) devolve "HH:MM" sem usar "%" no SQL,
    # o que evita erro de formatação quando a query recebe parâmetros.
    sql = """
        SELECT
            c.id_consulta,
            c.id_pet,
            p.nome AS pet_nome,
            c.id_tutor,
            t.nome AS tutor_nome,
            c.id_veterinario,
            f.nome AS veterinario_nome,
            f.crmv,
            c.data_consulta,
            LEFT(CAST(c.horario AS CHAR), 5) AS horario,
            c.motivo,
            c.status_consulta,
            c.observacoes,
            c.diagnostico,
            c.orientacoes
        FROM CONSULTA c
        JOIN PET p
            ON p.id_pet = c.id_pet
        JOIN TUTOR t
            ON t.id_tutor = c.id_tutor
        JOIN FUNCIONARIO f
            ON f.id_funcionario = c.id_veterinario
    """

    if funcionario["perfil"] == "veterinario":
        sql += """
            WHERE c.id_veterinario = %s
            ORDER BY
                c.data_consulta DESC,
                c.horario DESC
        """

        return consultar(
            sql,
            (funcionario["id_funcionario"],)
        )

    sql += """
        ORDER BY
            c.data_consulta DESC,
            c.horario DESC
    """

    return consultar(sql)


@app.post("/consultas", status_code=201)
def cadastrar_consulta(
    consulta: ConsultaCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    db = conectar()

    try:
        cur = db.cursor()

        try:
            validar_agendamento(cur, consulta)

            cur.execute(
                """
                SELECT id_consulta
                FROM CONSULTA
                WHERE id_veterinario = %s
                  AND data_consulta = %s
                  AND horario = %s
                  AND status_consulta IN (
                      'agendada',
                      'em_atendimento'
                  )
                """,
                (
                    consulta.id_veterinario,
                    consulta.data_consulta,
                    consulta.horario
                )
            )

            if cur.fetchone():
                raise HTTPException(
                    409,
                    "O veterinário já possui uma consulta nesse horário."
                )

            cur.execute(
                """
                INSERT INTO CONSULTA
                (
                    id_pet,
                    id_tutor,
                    id_veterinario,
                    data_consulta,
                    horario,
                    motivo,
                    observacoes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    consulta.id_pet,
                    consulta.id_tutor,
                    consulta.id_veterinario,
                    consulta.data_consulta,
                    consulta.horario,
                    consulta.motivo,
                    consulta.observacoes
                )
            )

            novo_id = cur.lastrowid
            db.commit()

            return {
                "mensagem": "Consulta agendada com sucesso!",
                "id_consulta": novo_id
            }

        finally:
            cur.close()

    except mysql.connector.Error as erro:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao cadastrar consulta."
        ) from erro

    finally:
        db.close()


@app.put("/consultas/{id_consulta}")
def editar_consulta(
    id_consulta: int,
    consulta: ConsultaCreate,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "atendente")
    )

    db = conectar()

    try:
        cur = db.cursor()

        try:
            cur.execute(
                """
                SELECT status_consulta
                FROM CONSULTA
                WHERE id_consulta = %s
                """,
                (id_consulta,)
            )

            registro = cur.fetchone()

            if not registro:
                raise HTTPException(
                    404,
                    "Consulta não encontrada."
                )

            if registro[0] in (
                "concluida",
                "cancelada"
            ):
                raise HTTPException(
                    400,
                    "Consultas concluídas ou canceladas não podem ser reagendadas."
                )

            validar_agendamento(cur, consulta)

            cur.execute(
                """
                SELECT id_consulta
                FROM CONSULTA
                WHERE id_veterinario = %s
                  AND data_consulta = %s
                  AND horario = %s
                  AND id_consulta <> %s
                  AND status_consulta IN (
                      'agendada',
                      'em_atendimento'
                  )
                """,
                (
                    consulta.id_veterinario,
                    consulta.data_consulta,
                    consulta.horario,
                    id_consulta
                )
            )

            if cur.fetchone():
                raise HTTPException(
                    409,
                    "O veterinário já possui uma consulta nesse horário."
                )

            cur.execute(
                """
                UPDATE CONSULTA
                SET
                    id_pet = %s,
                    id_tutor = %s,
                    id_veterinario = %s,
                    data_consulta = %s,
                    horario = %s,
                    motivo = %s,
                    observacoes = %s
                WHERE id_consulta = %s
                """,
                (
                    consulta.id_pet,
                    consulta.id_tutor,
                    consulta.id_veterinario,
                    consulta.data_consulta,
                    consulta.horario,
                    consulta.motivo,
                    consulta.observacoes,
                    id_consulta
                )
            )

            db.commit()

            return {
                "mensagem": "Consulta atualizada com sucesso!"
            }

        finally:
            cur.close()

    except mysql.connector.Error as erro:
        db.rollback()

        raise HTTPException(
            500,
            "Erro ao editar consulta."
        ) from erro

    finally:
        db.close()


# ==========================================
# ALTERAR STATUS DA CONSULTA
# ==========================================

@app.put("/consultas/{id_consulta}/status")
def alterar_status_consulta(
    id_consulta: int,
    dados: ConsultaStatus,
    request: Request
):
    funcionario = exigir_funcionario(request)

    if dados.status_consulta in ("em_atendimento", "concluida"):
        if funcionario["perfil"] != "veterinario":
            raise HTTPException(
                status_code=403,
                detail="Somente veterinários podem iniciar ou concluir atendimentos."
            )

    registros = consultar(
        """
        SELECT
            status_consulta,
            id_veterinario
        FROM CONSULTA
        WHERE id_consulta = %s
        """,
        (id_consulta,)
    )

    if not registros:
        raise HTTPException(
            404,
            "Consulta não encontrada."
        )

    consulta = registros[0]

    if funcionario["perfil"] == "veterinario":
        if (
            consulta["id_veterinario"]
            != funcionario["id_funcionario"]
        ):
            raise HTTPException(
                403,
                "Esta consulta pertence a outro veterinário."
            )

    status_atual = consulta["status_consulta"]
    novo_status = dados.status_consulta

    transicoes = {
        "agendada": [
            "em_atendimento",
            "cancelada"
        ],
        "em_atendimento": [
            "concluida",
            "cancelada"
        ],
        "concluida": [],
        "cancelada": []
    }

    if novo_status not in transicoes.get(
        status_atual, []
    ):
        raise HTTPException(
            400,
            "Alteração de status não permitida."
        )

    executar(
        """
        UPDATE CONSULTA
        SET status_consulta = %s
        WHERE id_consulta = %s
        """,
        (
            novo_status,
            id_consulta
        )
    )

    return {
        "mensagem": "Status atualizado com sucesso!"
    }


# ==========================================
# REGISTRAR ATENDIMENTO
# ==========================================

@app.put("/consultas/{id_consulta}/atendimento")
def registrar_atendimento(
    id_consulta: int,
    dados: ConsultaAtendimento,
    request: Request
):
    funcionario = exigir_perfil(
        request,
        ("veterinario",)
    )

    registros = consultar(
        """
        SELECT
            status_consulta,
            id_veterinario
        FROM CONSULTA
        WHERE id_consulta = %s
        """,
        (id_consulta,)
    )

    if not registros:
        raise HTTPException(
            404,
            "Consulta não encontrada."
        )

    consulta = registros[0]

    if (
        consulta["id_veterinario"]
        != funcionario["id_funcionario"]
    ):
        raise HTTPException(
            403,
            "Esta consulta pertence a outro veterinário."
        )

    if consulta["status_consulta"] != "em_atendimento":
        raise HTTPException(
            400,
            "A consulta precisa estar em atendimento."
        )

    executar(
        """
        UPDATE CONSULTA
        SET
            observacoes = %s,
            diagnostico = %s,
            orientacoes = %s
        WHERE id_consulta = %s
        """,
        (
            dados.observacoes,
            dados.diagnostico,
            dados.orientacoes,
            id_consulta
        )
    )

    return {
        "mensagem": "Atendimento registrado com sucesso!"
    }


# ==========================================
# CANCELAR CONSULTA
# ==========================================

@app.delete("/consultas/{id_consulta}")
def cancelar_consulta(
    id_consulta: int,
    request: Request
):
    funcionario = exigir_funcionario(request)

    registros = consultar(
        """
        SELECT
            status_consulta,
            id_veterinario
        FROM CONSULTA
        WHERE id_consulta = %s
        """,
        (id_consulta,)
    )

    if not registros:
        raise HTTPException(
            404,
            "Consulta não encontrada."
        )

    consulta = registros[0]

    if funcionario["perfil"] == "veterinario":
        if (
            consulta["id_veterinario"]
            != funcionario["id_funcionario"]
        ):
            raise HTTPException(
                403,
                "Esta consulta pertence a outro veterinário."
            )

    if consulta["status_consulta"] in (
        "concluida",
        "cancelada"
    ):
        raise HTTPException(
            400,
            "Essa consulta não pode ser cancelada."
        )

    executar(
        """
        UPDATE CONSULTA
        SET status_consulta = 'cancelada'
        WHERE id_consulta = %s
        """,
        (id_consulta,)
    )

    return {
        "mensagem": "Consulta cancelada com sucesso!"
    }


# ==========================================
# HISTÓRICO VETERINÁRIO
# ==========================================

@app.get("/pets/{id_pet}/prontuario")
def consultar_prontuario(
    id_pet: int,
    request: Request
):
    exigir_perfil(
        request,
        ("administrador", "veterinario")
    )

    animais = consultar(
        """
        SELECT
            id_pet,
            nome,
            especie,
            raca,
            sexo,
            data_nascimento,
            peso
        FROM PET
        WHERE id_pet = %s
          AND ativo = 1
        """,
        (id_pet,)
    )

    if not animais:
        raise HTTPException(
            404,
            "Animal não encontrado."
        )

    historico = consultar(
        """
        SELECT
            c.id_consulta,
            c.data_consulta,
            LEFT(CAST(c.horario AS CHAR), 5) AS horario,
            c.motivo,
            c.status_consulta,
            c.observacoes,
            c.diagnostico,
            c.orientacoes,
            f.nome AS veterinario_nome,
            f.crmv
        FROM CONSULTA c
        JOIN FUNCIONARIO f
            ON f.id_funcionario = c.id_veterinario
        WHERE c.id_pet = %s
        ORDER BY
            c.data_consulta DESC,
            c.horario DESC,
            c.id_consulta DESC
        """,
        (id_pet,)
    )

    return {
        "animal": animais[0],
        "total_atendimentos": len(historico),
        "historico": historico
    }


# ==========================================
# MÓDULO DE VACINAÇÃO
# ==========================================

router_vacinacao = criar_router_vacinacao(
    consultar,
    executar,
    exigir_funcionario,
    exigir_perfil
)

app.include_router(router_vacinacao)


# ==========================================
# MÓDULO DE EXAMES
# ==========================================

router_exame = criar_router_exame(
    consultar,
    executar,
    exigir_funcionario,
    exigir_perfil
)

app.include_router(router_exame)


# ==========================================
# MÓDULO DE ESTOQUE DE MEDICAMENTOS
# ==========================================

router_estoque = criar_router_estoque(
    consultar,
    executar,
    exigir_funcionario,
    exigir_perfil
)

app.include_router(router_estoque)


# ==========================================
# MÓDULO DE CARTEIRINHA
# ==========================================

router_carteirinha = criar_router_carteirinha(
    consultar,
    exigir_funcionario
)

app.include_router(router_carteirinha)


# ==========================================
# MANUTENÇÃO: ATUALIZAR CÓDIGOS ANTIGOS
# (função utilitária: chame manualmente quando precisar)
# ==========================================

def atualizar_codigos_antigos():
    pets = consultar(
        """
        SELECT id_pet, codigo_carteirinha
        FROM PET
        """
    )

    atualizados = 0

    for pet in pets:
        codigo = pet["codigo_carteirinha"]

        try:
            identificador = uuid.UUID(codigo) if codigo else None
        except (ValueError, TypeError, AttributeError):
            identificador = None

        if identificador is not None and identificador.version == 4:
            continue

        novo_codigo = str(uuid.uuid4())

        executar(
            """
            UPDATE PET
            SET codigo_carteirinha = %s
            WHERE id_pet = %s
            """,
            (novo_codigo, pet["id_pet"])
        )

        atualizados += 1

    print(f"{atualizados} carteirinhas atualizadas!")