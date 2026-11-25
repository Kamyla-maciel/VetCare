
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, model_validator


class ExameCreate(BaseModel):
    id_pet: int = Field(gt=0)
    tipo_exame: str = Field(min_length=1, max_length=100)
    data_solicitacao: date
    data_realizacao: date | None = None
    status_exame: Literal[
        "solicitado",
        "agendado",
        "realizado",
        "cancelado"
    ] = "solicitado"
    resultado: str | None = None
    observacoes: str | None = None

    @model_validator(mode="after")
    def validar_datas(self):
        if (
            self.data_realizacao is not None
            and self.data_realizacao < self.data_solicitacao
        ):
            raise ValueError(
                "A realização não pode ser anterior à solicitação."
            )

        if (
            self.status_exame == "realizado"
            and self.data_realizacao is None
        ):
            raise ValueError(
                "Informe a data de realização do exame."
            )

        return self


def criar_router_exame(
    consultar,
    executar,
    exigir_funcionario,
    exigir_perfil
):
    router = APIRouter(tags=["Exames"])

    @router.get("/exames")
    def listar_exames(request: Request):
        exigir_funcionario(request)

        return consultar("""
            SELECT
                e.id_exame,
                e.id_pet,
                p.nome AS pet_nome,
                e.tipo_exame,
                e.data_solicitacao,
                e.data_realizacao,
                e.status_exame,
                e.resultado,
                e.observacoes,
                e.criado_em
            FROM exames e
            JOIN pet p ON p.id_pet = e.id_pet
            ORDER BY e.id_exame DESC
        """)

    @router.post("/exames", status_code=201)
    def cadastrar_exame(
        dados: ExameCreate,
        request: Request
    ):
        exigir_perfil(
            request,
            ("administrador", "veterinario")
        )

        animais = consultar(
            """
            SELECT id_pet
            FROM pet
            WHERE id_pet = %s AND ativo = 1
            """,
            (dados.id_pet,)
        )

        if not animais:
            raise HTTPException(
                404,
                "Animal não encontrado ou desativado."
            )

        novo_id = executar(
            """
            INSERT INTO exames (
                id_pet,
                tipo_exame,
                data_solicitacao,
                data_realizacao,
                status_exame,
                resultado,
                observacoes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                dados.id_pet,
                dados.tipo_exame.strip(),
                dados.data_solicitacao,
                dados.data_realizacao,
                dados.status_exame,
                dados.resultado,
                dados.observacoes
            )
        )

        return {
            "mensagem": "Exame cadastrado com sucesso!",
            "id_exame": novo_id
        }

    @router.put("/exames/{id_exame}")
    def editar_exame(
        id_exame: int,
        dados: ExameCreate,
        request: Request
    ):
        exigir_perfil(
            request,
            ("administrador", "veterinario")
        )

        existentes = consultar(
            "SELECT id_exame FROM exames WHERE id_exame = %s",
            (id_exame,)
        )

        if not existentes:
            raise HTTPException(
                404,
                "Exame não encontrado."
            )

        animais = consultar(
            """
            SELECT id_pet
            FROM pet
            WHERE id_pet = %s AND ativo = 1
            """,
            (dados.id_pet,)
        )

        if not animais:
            raise HTTPException(
                404,
                "Animal não encontrado ou desativado."
            )

        executar(
            """
            UPDATE exames
            SET
                id_pet = %s,
                tipo_exame = %s,
                data_solicitacao = %s,
                data_realizacao = %s,
                status_exame = %s,
                resultado = %s,
                observacoes = %s
            WHERE id_exame = %s
            """,
            (
                dados.id_pet,
                dados.tipo_exame.strip(),
                dados.data_solicitacao,
                dados.data_realizacao,
                dados.status_exame,
                dados.resultado,
                dados.observacoes,
                id_exame
            )
        )

        return {
            "mensagem": "Exame atualizado com sucesso!"
        }

    @router.delete("/exames/{id_exame}")
    def excluir_exame(
        id_exame: int,
        request: Request
    ):
        exigir_perfil(
            request,
            ("administrador",)
        )

        executar(
            "DELETE FROM exames WHERE id_exame = %s",
            (id_exame,),
            verificar=True
        )

        return {
            "mensagem": "Exame excluído com sucesso!"
        }

    return router
