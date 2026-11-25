
import os
import psycopg
from dotenv import load_dotenv

# Carrega as configurações privadas durante
# o desenvolvimento no computador.
load_dotenv(".env.supabase", override=False)


def conectar_supabase():
    return psycopg.connect(
        host=os.getenv("SUPABASE_DB_HOST"),
        port=int(os.getenv("SUPABASE_DB_PORT", "5432")),
        dbname=os.getenv("SUPABASE_DB_NAME"),
        user=os.getenv("SUPABASE_DB_USER"),
        password=os.getenv("SUPABASE_DB_PASSWORD"),
        sslmode="require",
        connect_timeout=10
    )

def salvar_carteirinha_online(codigo, nome, especie, raca, sexo):
    with conectar_supabase() as conexao:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO public.carteirinhas
                    (codigo, nome, especie, raca, sexo, ativo)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (codigo)
                DO UPDATE SET
                    nome = EXCLUDED.nome,
                    especie = EXCLUDED.especie,
                    raca = EXCLUDED.raca,
                    sexo = EXCLUDED.sexo,
                    foto_url = COALESCE(
                        EXCLUDED.foto_url,
                        public.carteirinhas.foto_url
                    ),
                    ativo = TRUE
                """,
                (codigo, nome, especie, raca, sexo)
            )

def desativar_carteirinha_online(codigo):
    with conectar_supabase() as conexao:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.carteirinhas
                SET ativo = FALSE
                WHERE codigo = %s
                """,
                (codigo,)
            )

def buscar_carteirinha_online(codigo):
    with conectar_supabase() as conexao:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT codigo, nome, especie, raca, sexo
                FROM public.carteirinhas
                WHERE codigo = %s
                  AND ativo = TRUE
                """,
                (codigo,)
            )

            resultado = cursor.fetchone()

            if resultado is None:
                return None

            return {
                "codigo": str(resultado[0]),
                "nome": resultado[1],
                "especie": resultado[2],
                "raca": resultado[3],
                "sexo": resultado[4]
            }
