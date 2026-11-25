
import os
import sqlite3


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv(
    "CARTEIRINHA_DB_PATH",
    os.path.join(BASE_DIR, "carteirinhas.db")
)


def conectar_banco():
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    return conexao


def criar_tabelas():
    with conectar_banco() as conexao:
        conexao.execute("""
            CREATE TABLE IF NOT EXISTS carteirinhas (
                codigo TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                especie TEXT NOT NULL,
                raca TEXT,
                sexo TEXT,
                ativo INTEGER NOT NULL DEFAULT 1
            )
        """)

def buscar_carteirinha(codigo):
    with conectar_banco() as conexao:
        resultado = conexao.execute(
            """
            SELECT codigo, nome, especie, raca, sexo
            FROM carteirinhas
            WHERE codigo = ?
              AND ativo = 1
            """,
            (codigo,)
        ).fetchone()

        return dict(resultado) if resultado else None
