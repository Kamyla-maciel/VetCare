
import os
import time

import requests
from dotenv import load_dotenv

from app.database import conectar

load_dotenv()

URL_SINCRONIZACAO = os.getenv(
    "CARTEIRINHA_SYNC_URL",
    "http://127.0.0.1:8001/api/sincronizar"
)

BANCO_PERMITIDO = "vetcare_test_db"
INTERVALO_SEGUNDOS = 30


def enviar_carteirinha(item):
    chave = os.getenv("CARTEIRINHA_API_KEY")

    if not chave:
        raise RuntimeError("Chave da API não configurada.")

    dados = {
        "codigo": item["codigo_carteirinha"],
        "nome": item["nome"],
        "especie": item["especie"],
        "raca": item["raca"],
        "sexo": item["sexo"],
        "foto_url": item["foto_url"],
        "ativo": (
            item["operacao"] != "desativar"
            and bool(item["ativo"])
        ),
    }

    print("Código:", dados["codigo"])
    print("Tipo do código:", type(dados["codigo"]).__name__)
    print("Nome:", dados["nome"])
    print("Espécie:", dados["especie"])
    print("Foto configurada:", bool(dados["foto_url"]))

    resposta = requests.post(
        URL_SINCRONIZACAO,
        json=dados,
        headers={
            "X-API-Key": chave,
            "Content-Type": "application/json"
        },
        timeout=60
    )

    if not resposta.ok:
        print("Status HTTP:", resposta.status_code)
        print(
            "Tipo da resposta:",
            resposta.headers.get("content-type")
        )
        print(
            "Servidor:",
            resposta.headers.get("server")
        )
        print(
            "Detalhes do erro:",
            repr(resposta.text[:500])
        )
        resposta.raise_for_status()

    return resposta.json()


def buscar_pendencias():
    db = conectar()
    cursor = None

    try:
        if db.database != BANCO_PERMITIDO:
            raise RuntimeError(
                "Sincronização interrompida: banco incorreto."
            )

        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                s.id_sincronizacao,
                s.id_pet,
                s.operacao,
                p.codigo_carteirinha,
                p.nome,
                p.especie,
                p.raca,
                p.sexo,
                p.foto_url,
                p.ativo
            FROM sincronizacao_carteirinha s
            INNER JOIN PET p
                ON p.id_pet = s.id_pet
            WHERE s.status = 'pendente'
              AND p.publicar_carteirinha = 1
            ORDER BY s.id_sincronizacao ASC
        """)

        return cursor.fetchall()

    finally:
        if cursor:
            cursor.close()

        db.close()


def marcar_como_concluido(id_sincronizacao):
    db = conectar()
    cursor = None

    try:
        if db.database != BANCO_PERMITIDO:
            raise RuntimeError(
                "Sincronização interrompida: banco incorreto."
            )

        cursor = db.cursor()

        cursor.execute(
            """
            UPDATE sincronizacao_carteirinha
            SET status = 'concluido'
            WHERE id_sincronizacao = %s
              AND status = 'pendente'
            """,
            (id_sincronizacao,)
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        if cursor:
            cursor.close()

        db.close()


def processar_pendencias():
    pendencias = buscar_pendencias()

    print(
        f"Pendências encontradas: {len(pendencias)}"
    )

    for item in pendencias:
        try:
            # Envia sempre o estado atual do animal.
            # Isso evita reativar uma carteirinha
            # que já foi desativada.
            enviar_carteirinha(item)

            marcar_como_concluido(
                item["id_sincronizacao"]
            )

            print(
                f"Pendência {item['id_sincronizacao']} "
                f"concluída com sucesso!"
            )

        except Exception as erro:
            print(
                f"Erro na pendência "
                f"{item['id_sincronizacao']}: {erro}"
            )

            # Interrompe para preservar a ordem.
            break


if __name__ == "__main__":
    print("Sincronização automática iniciada!")

    while True:
        try:
            processar_pendencias()

        except Exception as erro:
            print(
                f"Erro na sincronização: {erro}"
            )

        time.sleep(INTERVALO_SEGUNDOS)
