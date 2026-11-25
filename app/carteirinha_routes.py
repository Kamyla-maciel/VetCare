
from io import BytesIO
from html import escape
from uuid import UUID
import os

import qrcode
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, HTMLResponse


def criar_router_carteirinha(consultar, exigir_funcionario):
    router = APIRouter(
        prefix="/carteirinha",
        tags=["Carteirinha Digital"]
    )

    @router.get("/{id_pet}/qr")
    def gerar_qr(id_pet: int, request: Request):
        exigir_funcionario(request)

        animais = consultar(
            """
            SELECT id_pet, codigo_carteirinha
            FROM PET
            WHERE id_pet = %s
              AND ativo = 1
            """,
            (id_pet,)
        )

        if not animais:
            raise HTTPException(
                status_code=404,
                detail="Animal não encontrado."
            )

        codigo = animais[0]["codigo_carteirinha"]

        if not codigo:
            raise HTTPException(
                status_code=404,
                detail="Carteirinha não disponível."
            )

        # Endereço público será configurado na hospedagem.
        endereco = os.getenv(
            "CARTEIRINHA_BASE_URL",
            str(request.base_url).rstrip("/")
        ).rstrip("/")
        
        print("DEBUG - URL DO QR CODE:", endereco, flush=True)

        url = f"{endereco}/carteirinha/pet/{codigo}"

        imagem = qrcode.make(url)

        arquivo = BytesIO()
        imagem.save(arquivo, format="PNG")
        arquivo.seek(0)

        return StreamingResponse(
            arquivo,
            media_type="image/png",
            headers={"Cache-Control": "no-store"}
        )

    @router.get("/pet/{codigo}", response_class=HTMLResponse)
    def visualizar_carteirinha(codigo: str):
        try:
            identificador = UUID(codigo)

            # Aceita somente UUID4.
            if identificador.version != 4:
                raise ValueError()

            codigo = str(identificador)

        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=404,
                detail="Carteirinha não encontrada."
            )

        animais = consultar(
            """
            SELECT id_pet, nome, especie, raca, sexo
            FROM PET
            WHERE codigo_carteirinha = %s
              AND ativo = 1
            """,
            (codigo,)
        )

        if not animais:
            raise HTTPException(
                status_code=404,
                detail="Carteirinha não encontrada."
            )

        pet = animais[0]

        nome = escape(str(pet["nome"] or "Não informado"))
        especie = escape(str(pet["especie"] or "Não informada"))
        raca = escape(str(pet["raca"] or "Não informada"))
        sexo = escape(str(pet["sexo"] or "Não informado"))
        id_pet = pet["id_pet"]

        return f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport"
                  content="width=device-width, initial-scale=1">
            <title>Carteirinha Digital | Vet Care</title>
            <style>
                * {{ box-sizing: border-box; }}

                body {{
                    margin: 0;
                    min-height: 100vh;
                    display: grid;
                    place-items: center;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background: #f1f5f0;
                    color: #084e54;
                }}

                .cartao {{
                    width: 100%;
                    max-width: 440px;
                    overflow: hidden;
                    border-radius: 22px;
                    background: white;
                    box-shadow: 0 15px 45px #084e5420;
                }}

                .topo {{
                    padding: 30px;
                    color: white;
                    background: linear-gradient(
                        120deg, #084e54, #afb38a
                    );
                }}

                .topo small {{
                    letter-spacing: 2px;
                    font-weight: bold;
                }}

                .topo h1 {{
                    margin-bottom: 0;
                }}

                .conteudo {{
                    padding: 30px;
                }}

                .identificacao {{
                    color: #66847c;
                    font-size: 12px;
                    font-weight: bold;
                }}

                .nome {{
                    font-size: 32px;
                    margin: 12px 0 25px;
                }}

                .dados {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 22px;
                }}

                .dados small {{
                    display: block;
                    margin-bottom: 7px;
                    color: #7c918a;
                }}

                .dados strong {{
                    font-size: 15px;
                }}

                .rodape {{
                    padding: 18px;
                    background: #e9f0e6;
                    text-align: center;
                    font-size: 12px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <article class="cartao">
                <header class="topo">
                    <small>IDENTIDADE DIGITAL PET</small>
                    <h1>🐾 Vet Care</h1>
                </header>

                <main class="conteudo">
                    <span class="identificacao">
                        IDENTIFICAÇÃO PET-{id_pet}
                    </span>

                    <h2 class="nome">{nome}</h2>

                    <div class="dados">
                        <div>
                            <small>Espécie</small>
                            <strong>{especie}</strong>
                        </div>

                        <div>
                            <small>Raça</small>
                            <strong>{raca}</strong>
                        </div>

                        <div>
                            <small>Sexo</small>
                            <strong>{sexo}</strong>
                        </div>

                        <div>
                            <small>Clínica</small>
                            <strong>Vet Care</strong>
                        </div>
                    </div>
                </main>

                <footer class="rodape">
                    Vet Care • Identificação digital
                </footer>
            </article>
        </body>
        </html>
        """

    return router
