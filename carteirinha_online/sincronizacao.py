
import sqlite3

from .database import conectar_banco


def salvar_carteirinha(codigo, nome, especie, raca, sexo):
    with conectar_banco() as conexao:
        conexao.execute(
            """
            INSERT INTO carteirinhas
                (codigo, nome, especie, raca, sexo, ativo)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(codigo) DO UPDATE SET
                nome = excluded.nome,
                especie = excluded.especie,
                raca = excluded.raca,
                sexo = excluded.sexo,
                ativo = 1
            """,
            (codigo, nome, especie, raca, sexo)
        )


def desativar_carteirinha(codigo):
    with conectar_banco() as conexao:
        conexao.execute(
            """
            UPDATE carteirinhas
            SET ativo = 0
            WHERE codigo = ?
            """,
            (codigo,)
        )
