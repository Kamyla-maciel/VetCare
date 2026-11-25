
from fastapi import APIRouter, HTTPException, Request

from app.vacinacao_schemas import VacinacaoCreate


def criar_router_vacinacao(
    consultar,
    executar,
    exigir_funcionario,
    exigir_perfil
):
    router = APIRouter(tags=["Vacinação"])

    @router.get("/vacinacoes")
    def listar_vacinacoes(request: Request):
        exigir_funcionario(request)

        return consultar("""
            SELECT
                v.*,
                p.nome AS nome_pet
            FROM VACINACAO v
            INNER JOIN PET p ON p.id_pet = v.id_pet
            ORDER BY v.id_vacinacao DESC
        """)

    @router.get("/vacinacoes/{id_vacinacao}")
    def buscar_vacinacao(
        id_vacinacao: int,
        request: Request
    ):
        exigir_funcionario(request)

        registros = consultar("""
            SELECT
                v.*,
                p.nome AS nome_pet
            FROM VACINACAO v
            INNER JOIN PET p ON p.id_pet = v.id_pet
            WHERE v.id_vacinacao = %s
        """, (id_vacinacao,))

        if not registros:
            raise HTTPException(
                404,
                "Vacinação não encontrada."
            )

        return registros[0]

    @router.post("/vacinacoes", status_code=201)
    def cadastrar_vacinacao(
        dados: VacinacaoCreate,
        request: Request
    ):
        exigir_perfil(
            request,
            ["administrador", "veterinario"]
        )

        pets = consultar("""
            SELECT id_pet
            FROM PET
            WHERE id_pet = %s AND ativo = 1
        """, (dados.id_pet,))

        if not pets:
            raise HTTPException(
                404,
                "Animal não encontrado ou inativo."
            )

        novo_id = executar("""
            INSERT INTO VACINACAO (
                id_pet,
                nome_vacina,
                data_aplicacao,
                proxima_dose,
                lote,
                observacoes
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            dados.id_pet,
            dados.nome_vacina,
            dados.data_aplicacao,
            dados.proxima_dose,
            dados.lote,
            dados.observacoes
        ))

        return {
            "mensagem": "Vacinação cadastrada.",
            "id_vacinacao": novo_id
        }

    @router.put("/vacinacoes/{id_vacinacao}")
    def atualizar_vacinacao(
        id_vacinacao: int,
        dados: VacinacaoCreate,
        request: Request
    ):
        exigir_perfil(
            request,
            ["administrador", "veterinario"]
        )

        pets = consultar("""
            SELECT id_pet
            FROM PET
            WHERE id_pet = %s AND ativo = 1
        """, (dados.id_pet,))

        if not pets:
            raise HTTPException(
                404,
                "Animal não encontrado ou inativo."
            )

        executar("""
            UPDATE VACINACAO
            SET
                id_pet = %s,
                nome_vacina = %s,
                data_aplicacao = %s,
                proxima_dose = %s,
                lote = %s,
                observacoes = %s
            WHERE id_vacinacao = %s
        """, (
            dados.id_pet,
            dados.nome_vacina,
            dados.data_aplicacao,
            dados.proxima_dose,
            dados.lote,
            dados.observacoes,
            id_vacinacao
        ), verificar=True)

        return {
            "mensagem": "Vacinação atualizada."
        }

    @router.delete("/vacinacoes/{id_vacinacao}")
    def excluir_vacinacao(
        id_vacinacao: int,
        request: Request
    ):
        exigir_perfil(
            request,
            ["administrador"]
        )

        executar("""
            DELETE FROM VACINACAO
            WHERE id_vacinacao = %s
        """, (id_vacinacao,), verificar=True)

        return {
            "mensagem": "Vacinação excluída."
        }

    return router

