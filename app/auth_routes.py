
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import verificar_senha, criar_hash_senha
from app.database import conectar


router = APIRouter(prefix="/auth", tags=["Autenticação"])


# ==========================================
# MODELOS DE DADOS
# ==========================================

class LoginDados(BaseModel):
    email: str
    senha: str


class SolicitacaoFuncionario(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    cpf: str
    email: str
    telefone: str | None = None
    senha: str = Field(min_length=12)
    perfil: str = "atendente"
    crmv: str | None = None


# ==========================================
# VERIFICAR ADMINISTRADOR
# ==========================================

def exigir_administrador(request: Request):
    id_funcionario = request.session.get("id_funcionario")

    if not id_funcionario:
        raise HTTPException(
            status_code=401,
            detail="Você precisa fazer login."
        )

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id_funcionario, perfil
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
              AND ativo = 1
              AND status_cadastro = 'aprovado'
            """,
            (id_funcionario,)
        )

        funcionario = cursor.fetchone()

    finally:
        cursor.close()
        conexao.close()

    if not funcionario or funcionario["perfil"] != "administrador":
        raise HTTPException(
            status_code=403,
            detail="Acesso exclusivo do administrador."
        )

    return funcionario


# ==========================================
# LOGIN
# ==========================================

@router.post("/login")
def login(dados: LoginDados, request: Request):
    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                id_funcionario,
                nome,
                email,
                senha,
                cargo,
                perfil,
                crmv,
                foto_perfil
            FROM FUNCIONARIO
            WHERE email = %s
              AND ativo = 1
              AND status_cadastro = 'aprovado'
            """,
            (dados.email.strip().lower(),)
        )

        funcionario = cursor.fetchone()

    finally:
        cursor.close()
        conexao.close()

    if not funcionario or not verificar_senha(
        dados.senha,
        funcionario["senha"]
    ):
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos, ou cadastro não aprovado."
        )

    request.session.clear()

    request.session["id_funcionario"] = (
        funcionario["id_funcionario"]
    )

    return {
        "mensagem": "Login realizado com sucesso!",
        "funcionario": {
            chave: valor
            for chave, valor in funcionario.items()
            if chave != "senha"
        }
    }


# ==========================================
# DADOS DO FUNCIONÁRIO LOGADO
# ==========================================

@router.get("/me")
def minha_conta(request: Request):
    id_funcionario = request.session.get("id_funcionario")

    if not id_funcionario:
        raise HTTPException(
            status_code=401,
            detail="Você precisa fazer login."
        )

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                id_funcionario,
                nome,
                email,
                telefone,
                cargo,
                perfil,
                crmv,
                foto_perfil
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
              AND ativo = 1
              AND status_cadastro = 'aprovado'
            """,
            (id_funcionario,)
        )

        funcionario = cursor.fetchone()

    finally:
        cursor.close()
        conexao.close()

    if not funcionario:
        request.session.clear()

        raise HTTPException(
            status_code=401,
            detail="Sessão inválida ou cadastro não aprovado."
        )

    return funcionario


# ==========================================
# LOGOUT
# ==========================================

@router.post("/logout")
def logout(request: Request):
    request.session.clear()

    return {
        "mensagem": "Logout realizado com sucesso!"
    }


# ==========================================
# SOLICITAR CADASTRO
# ==========================================

@router.post("/solicitar-cadastro", status_code=201)
def solicitar_cadastro(dados: SolicitacaoFuncionario):
    nome = dados.nome.strip()
    email = dados.email.strip().lower()

    cpf = re.sub(r"\D", "", dados.cpf)

    telefone = (
        re.sub(r"\D", "", dados.telefone)
        if dados.telefone else None
    )

    perfil = dados.perfil.strip().lower()

    crmv = (
        dados.crmv.strip().upper()
        if dados.crmv else None
    )

    # Validar nome
    if len(nome) < 2:
        raise HTTPException(
            status_code=400,
            detail="Informe um nome válido."
        )

    # Somente atendentes e veterinários
    # podem solicitar cadastro publicamente.
    if perfil not in ("atendente", "veterinario"):
        raise HTTPException(
            status_code=400,
            detail="Tipo de cadastro inválido."
        )

    # Validar CPF
    if len(cpf) != 11:
        raise HTTPException(
            status_code=400,
            detail="O CPF deve conter 11 dígitos."
        )

    # Validar e-mail
    if not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email
    ):
        raise HTTPException(
            status_code=400,
            detail="Informe um e-mail válido."
        )

    # Validar telefone
    if telefone and len(telefone) not in (10, 11):
        raise HTTPException(
            status_code=400,
            detail="Informe um telefone válido."
        )

    # Validar CRMV
    if perfil == "veterinario":
        if not crmv:
            raise HTTPException(
                status_code=400,
                detail="Informe o CRMV do veterinário."
            )

        if len(crmv) < 3 or len(crmv) > 30:
            raise HTTPException(
                status_code=400,
                detail="O CRMV deve conter entre 3 e 30 caracteres."
            )

    else:
        crmv = None

    # Criar hash da senha
    senha_hash = criar_hash_senha(dados.senha)

    conexao = conectar()
    cursor = conexao.cursor()

    try:
        # Verificar CPF ou e-mail existente
        cursor.execute(
            """
            SELECT id_funcionario
            FROM FUNCIONARIO
            WHERE email = %s OR cpf = %s
            LIMIT 1
            """,
            (email, cpf)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="E-mail ou CPF já cadastrado."
            )

        # Criar solicitação pendente
        cursor.execute(
            """
            INSERT INTO FUNCIONARIO
                (
                    nome,
                    cpf,
                    email,
                    telefone,
                    senha,
                    cargo,
                    perfil,
                    crmv,
                    ativo,
                    status_cadastro
                )
            VALUES
                (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, 0, 'pendente'
                )
            """,
            (
                nome,
                cpf,
                email,
                telefone,
                senha_hash,
                "Veterinário"
                if perfil == "veterinario"
                else "Atendente",
                perfil,
                crmv
            )
        )

        conexao.commit()

        return {
            "mensagem": (
                "Solicitação enviada com sucesso! "
                "Aguarde a aprovação do administrador."
            )
        }

    except HTTPException:
        conexao.rollback()
        raise

    except Exception:
        conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Não foi possível registrar a solicitação."
        )

    finally:
        cursor.close()
        conexao.close()


# ==========================================
# LISTAR SOLICITAÇÕES PENDENTES
# SOMENTE ADMINISTRADOR
# ==========================================

@router.get("/solicitacoes")
def listar_solicitacoes(request: Request):
    exigir_administrador(request)

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                id_funcionario,
                nome,
                cpf,
                email,
                telefone,
                perfil,
                crmv,
                criado_em,
                status_cadastro
            FROM FUNCIONARIO
            WHERE status_cadastro = 'pendente'
            ORDER BY criado_em DESC
            """
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        conexao.close()


# ==========================================
# APROVAR SOLICITAÇÃO
# SOMENTE ADMINISTRADOR
# ==========================================

@router.put("/solicitacoes/{id_funcionario}/aprovar")
def aprovar_solicitacao(
    id_funcionario: int,
    request: Request
):
    exigir_administrador(request)

    conexao = conectar()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            UPDATE FUNCIONARIO
            SET
                ativo = 1,
                status_cadastro = 'aprovado'
            WHERE id_funcionario = %s
              AND status_cadastro = 'pendente'
            """,
            (id_funcionario,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Solicitação pendente não encontrada."
            )

        conexao.commit()

        return {
            "mensagem": "Cadastro aprovado com sucesso!"
        }

    except Exception:
        conexao.rollback()
        raise

    finally:
        cursor.close()
        conexao.close()


# ==========================================
# REJEITAR SOLICITAÇÃO
# SOMENTE ADMINISTRADOR
# ==========================================

@router.delete("/solicitacoes/{id_funcionario}")
def rejeitar_solicitacao(
    id_funcionario: int,
    request: Request
):
    exigir_administrador(request)

    conexao = conectar()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            UPDATE FUNCIONARIO
            SET
                ativo = 0,
                status_cadastro = 'rejeitado'
            WHERE id_funcionario = %s
              AND status_cadastro = 'pendente'
            """,
            (id_funcionario,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Solicitação pendente não encontrada."
            )

        conexao.commit()

        return {
            "mensagem": "Solicitação rejeitada com sucesso!"
        }

    except Exception:
        conexao.rollback()
        raise

    finally:
        cursor.close()
        conexao.close()

# ==========================================
# GERENCIAMENTO DE FUNCIONÁRIOS
# ACESSO EXCLUSIVO DO ADMINISTRADOR
# ==========================================

from pydantic import BaseModel, Field
from typing import Optional


class EdicaoFuncionario(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=100)
    telefone: Optional[str] = Field(default=None, max_length=20)
    crmv: Optional[str] = Field(default=None, max_length=30)


@router.get("/funcionarios")
def listar_funcionarios(request: Request):
    exigir_administrador(request)

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                id_funcionario,
                nome,
                email,
                cpf,
                telefone,
                cargo,
                perfil,
                crmv,
                ativo,
                status_cadastro,
                criado_em
            FROM FUNCIONARIO
            ORDER BY nome
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conexao.close()


@router.put("/funcionarios/{id_funcionario}")
def editar_funcionario(
    id_funcionario: int,
    dados: EdicaoFuncionario,
    request: Request
):
    exigir_administrador(request)

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT perfil
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
        """, (id_funcionario,))

        funcionario = cursor.fetchone()

        if not funcionario:
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        nome = dados.nome.strip()
        email = dados.email.strip().lower()
        telefone = (
            dados.telefone.strip()
            if dados.telefone else None
        )
        crmv = (
            dados.crmv.strip()
            if dados.crmv else None
        )

        if "@" not in email or "." not in email.split("@")[-1]:
            raise HTTPException(
                status_code=400,
                detail="E-mail inválido."
            )

        if funcionario["perfil"] == "veterinario":
            if not crmv:
                raise HTTPException(
                    status_code=400,
                    detail="O CRMV é obrigatório para veterinários."
                )
        else:
            crmv = None

        cursor.execute("""
            SELECT id_funcionario
            FROM FUNCIONARIO
            WHERE email = %s
              AND id_funcionario <> %s
        """, (email, id_funcionario))

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="E-mail já cadastrado."
            )

        cursor.execute("""
            UPDATE FUNCIONARIO
            SET nome = %s,
                email = %s,
                telefone = %s,
                crmv = %s
            WHERE id_funcionario = %s
        """, (
            nome,
            email,
            telefone,
            crmv,
            id_funcionario
        ))

        conexao.commit()

        return {"mensagem": "Funcionário atualizado com sucesso."}

    except Exception:
        conexao.rollback()
        raise

    finally:
        cursor.close()
        conexao.close()


@router.put("/funcionarios/{id_funcionario}/ativo")
def alterar_ativo_funcionario(
    id_funcionario: int,
    request: Request
):
    exigir_administrador(request)

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id_funcionario, perfil, ativo, status_cadastro
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
            FOR UPDATE
        """, (id_funcionario,))

        funcionario = cursor.fetchone()

        if not funcionario:
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        if funcionario["status_cadastro"] != "aprovado":
            raise HTTPException(
                status_code=400,
                detail="Somente contas aprovadas podem ser ativadas."
            )

        if funcionario["perfil"] == "administrador":
            raise HTTPException(
                status_code=403,
                detail="Contas administrativas não podem ser alteradas por esta rota."
            )

        novo_status = 0 if funcionario["ativo"] else 1

        cursor.execute("""
            UPDATE FUNCIONARIO
            SET ativo = %s
            WHERE id_funcionario = %s
        """, (novo_status, id_funcionario))

        conexao.commit()

        return {
            "mensagem": (
                "Funcionário ativado."
                if novo_status else "Funcionário desativado."
            ),
            "ativo": bool(novo_status)
        }

    except Exception:
        conexao.rollback()
        raise

    finally:
        cursor.close()
        conexao.close()

def exigir_perfil(request: Request, *perfis_permitidos):
    id_funcionario = request.session.get("id_funcionario")

    if not id_funcionario:
        raise HTTPException(
            status_code=401,
            detail="Você precisa fazer login."
        )

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id_funcionario, nome, perfil
            FROM FUNCIONARIO
            WHERE id_funcionario = %s
              AND ativo = 1
              AND status_cadastro = 'aprovado'
        """, (id_funcionario,))

        funcionario = cursor.fetchone()

    finally:
        cursor.close()
        conexao.close()

    if not funcionario:
        raise HTTPException(
            status_code=401,
            detail="Sessão inválida ou funcionário inativo."
        )

    if funcionario["perfil"] not in perfis_permitidos:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para realizar esta ação."
        )

    return funcionario
