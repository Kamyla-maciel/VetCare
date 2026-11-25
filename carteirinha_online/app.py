
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from .database import criar_tabelas
import html
import uuid
from fastapi import HTTPException
from .database import buscar_carteirinha
import os
import secrets
from .database_online import (
    buscar_carteirinha_online,
    salvar_carteirinha_online,
    desativar_carteirinha_online
)
from fastapi import Header
from pydantic import BaseModel
from .sincronizacao import salvar_carteirinha, desativar_carteirinha
@asynccontextmanager
async def lifespan(app: FastAPI):
    criar_tabelas()
    yield

app = FastAPI(
    title="Vet Care - Carteirinha Digital",
    lifespan=lifespan
)


@app.get("/")
def inicio():
    return {
        "mensagem": "Carteirinha Digital Vet Care online!"
    }



@app.get("/carteirinha/pet/{codigo}", response_class=HTMLResponse)
def visualizar_carteirinha(codigo: str):
    try:
        identificador = uuid.UUID(codigo)
        if identificador.version != 4 or str(identificador) != codigo:
            raise ValueError()
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Carteirinha não encontrada."
        )

    pet = buscar_carteirinha_online(codigo)

    if not pet:
        raise HTTPException(
            status_code=404,
            detail="Carteirinha não encontrada."
        )

    nome = html.escape(pet["nome"] or "")
    especie = html.escape(pet["especie"] or "")
    raca = html.escape(pet["raca"] or "Não informada")
    sexo = html.escape(pet["sexo"] or "Não informado")

    return f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vet Care - Carteirinha Digital</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: #f4f6f3;
                padding: 30px 15px;
            }}
            .carteirinha {{
                max-width: 420px;
                margin: 40px auto;
                padding: 30px;
                border-radius: 18px;
                background: white;
                box-shadow: 0 5px 20px #00000015;
            }}
            h1 {{
                color: #084E54;
                text-align: center;
            }}
            h2 {{
                color: #084E54;
            }}
            p {{
                line-height: 1.8;
            }}
        </style>
    </head>
    <body>
        <div class="carteirinha">
            <h1>Vet Care 🐾</h1>
            <h2>{nome}</h2>
            <p><strong>Espécie:</strong> {especie}</p>
            <p><strong>Raça:</strong> {raca}</p>
            <p><strong>Sexo:</strong> {sexo}</p>
        </div>
    </body>
    </html>
    """

class DadosCarteirinha(BaseModel):
    codigo: uuid.UUID
    nome: str
    especie: str
    raca: str | None = None
    sexo: str | None = None
    ativo: bool = True



@app.post("/api/sincronizar")
def sincronizar_carteirinha(
    dados: DadosCarteirinha,
    x_api_key: str | None = Header(default=None)
):
    chave_esperada = os.getenv("CARTEIRINHA_API_KEY")

    if (
        not chave_esperada
        or not x_api_key
        or not secrets.compare_digest(x_api_key, chave_esperada)
    ):
        raise HTTPException(
            status_code=401,
            detail="Não autorizado."
        )

    if dados.codigo.version != 4:
        raise HTTPException(
            status_code=422,
            detail="Código da carteirinha inválido."
        )

    if dados.ativo:
        salvar_carteirinha_online(
            str(dados.codigo),
            dados.nome,
            dados.especie,
            dados.raca,
            dados.sexo
        )
    else:
        desativar_carteirinha_online(
            str(dados.codigo)
        )

    return {
        "mensagem": "Carteirinha sincronizada com sucesso!"
    }
