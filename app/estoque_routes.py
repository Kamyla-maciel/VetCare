
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field


# ==========================================
# DADOS DO MEDICAMENTO
# ==========================================

class MedicamentoDados(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    categoria: Optional[str] = None
    fabricante: Optional[str] = None
    lote: Optional[str] = None
    quantidade: int = Field(ge=0)
    estoque_minimo: int = Field(default=5, ge=0)
    data_validade: Optional[date] = None
    preco_unitario: Optional[Decimal] = Field(default=None, ge=0)
    observacoes: Optional[str] = None


# ==========================================
# ROTAS DO ESTOQUE
# ==========================================

def criar_router_estoque(
    consultar,
    executar,
    exigir_funcionario,
    exigir_perfil
):
    router = APIRouter(
        prefix="/estoque",
        tags=["Estoque de Medicamentos"]
    )

    # ======================================
    # LISTAR MEDICAMENTOS
    # ======================================

    @router.get("")
    def listar_medicamentos(request: Request):
        exigir_funcionario(request)

        return consultar(
            """
            SELECT *
            FROM estoque_medicamentos
            ORDER BY nome, id_medicamento
            """
        )

    # ======================================
    # CADASTRAR MEDICAMENTO
    # ======================================

    @router.post("", status_code=201)
    def cadastrar_medicamento(
        dados: MedicamentoDados,
        request: Request
    ):
        exigir_perfil(
            request,
            ("administrador",)
        )

        novo_id = executar(
            """
            INSERT INTO estoque_medicamentos
            (
                nome,
                categoria,
                fabricante,
                lote,
                quantidade,
                estoque_minimo,
                data_validade,
                preco_unitario,
                observacoes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                dados.nome,
                dados.categoria,
                dados.fabricante,
                dados.lote,
                dados.quantidade,
                dados.estoque_minimo,
                dados.data_validade,
                dados.preco_unitario,
                dados.observacoes
            )
        )

        return {
            "mensagem": "Medicamento cadastrado com sucesso!",
            "id_medicamento": novo_id
        }

    # ======================================
    # ATUALIZAR MEDICAMENTO
    # ======================================

    @router.put("/{id_medicamento}")
    def atualizar_medicamento(
        id_medicamento: int,
        dados: MedicamentoDados,
        request: Request
    ):
        exigir_perfil(
            request,
            ("administrador", "veterinario")
        )

        # Verificar se o medicamento existe
        medicamento = consultar(
            """
            SELECT id_medicamento
            FROM estoque_medicamentos
            WHERE id_medicamento = %s
            """,
            (id_medicamento,)
        )

        if not medicamento:
            raise HTTPException(
                status_code=404,
                detail="Medicamento não encontrado."
            )

        # Atualizar os dados
        executar(
            """
            UPDATE estoque_medicamentos
            SET
                nome = %s,
                categoria = %s,
                fabricante = %s,
                lote = %s,
                quantidade = %s,
                estoque_minimo = %s,
                data_validade = %s,
                preco_unitario = %s,
                observacoes = %s
            WHERE id_medicamento = %s
            """,
            (
                dados.nome,
                dados.categoria,
                dados.fabricante,
                dados.lote,
                dados.quantidade,
                dados.estoque_minimo,
                dados.data_validade,
                dados.preco_unitario,
                dados.observacoes,
                id_medicamento
            )
        )

        return {
            "mensagem": "Medicamento atualizado com sucesso!"
        }

    # ======================================
    # EXCLUIR MEDICAMENTO
    # ======================================

    @router.delete("/{id_medicamento}")
    def excluir_medicamento(
        id_medicamento: int,
        request: Request
    ):
        exigir_perfil(
            request,
            ("administrador",)
        )

        # Verificar se o medicamento existe
        medicamento = consultar(
            """
            SELECT id_medicamento
            FROM estoque_medicamentos
            WHERE id_medicamento = %s
            """,
            (id_medicamento,)
        )

        if not medicamento:
            raise HTTPException(
                status_code=404,
                detail="Medicamento não encontrado."
            )

        # Excluir o medicamento
        executar(
            """
            DELETE FROM estoque_medicamentos
            WHERE id_medicamento = %s
            """,
            (id_medicamento,)
        )

        return {
            "mensagem": "Medicamento excluído com sucesso!"
        }

    return router
