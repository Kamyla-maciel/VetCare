
from pathlib import Path

import mysql.connector
from dotenv import dotenv_values


# Conexão exclusiva com o banco de testes
def conectar_banco_teste():
    raiz = Path(__file__).resolve().parents[1]
    config = dotenv_values(raiz / ".env.test")

    if config.get("DB_NAME") != "vetcare_test_db":
        raise RuntimeError(
            "ERRO: o banco configurado não é vetcare_test_db!"
        )

    conexao = mysql.connector.connect(
        host=config.get("DB_HOST", "localhost"),
        port=int(config.get("DB_PORT", 3307)),
        user=config.get("DB_USER"),
        password=config.get("DB_PASSWORD"),
        database="vetcare_test_db",
        autocommit=False
    )

    cursor = conexao.cursor()
    try:
        cursor.execute("SELECT DATABASE()")
        banco = cursor.fetchone()[0]
    finally:
        cursor.close()

    if banco != "vetcare_test_db":
        conexao.close()
        raise RuntimeError("Conexão com banco incorreto!")

    return conexao


# TESTE 1 - Conexão e leitura real do MySQL
def test_integracao_mysql():
    conexao = conectar_banco_teste()

    try:
        cursor = conexao.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM vetcare_test_db.pet"
            )
            quantidade = cursor.fetchone()[0]

            assert quantidade >= 0

            print("\nIntegração MySQL OK!")
            print("Banco: vetcare_test_db")
            print(f"Animais encontrados: {quantidade}")

        finally:
            cursor.close()
    finally:
        conexao.close()


# TESTE 2 - Cadastro real com ROLLBACK
def test_cadastro_real_pet_com_rollback():
    conexao = conectar_banco_teste()

    try:
        cursor = conexao.cursor()
        try:
            cursor.execute("""
                INSERT INTO vetcare_test_db.pet
                    (nome, especie, sexo, peso)
                VALUES (%s, %s, %s, %s)
            """, (
                "Pet Teste Integracao",
                "Cachorro",
                "macho",
                12.50
            ))

            id_pet = cursor.lastrowid

            cursor.execute("""
                SELECT nome, especie, peso
                FROM vetcare_test_db.pet
                WHERE id_pet = %s
            """, (id_pet,))

            resultado = cursor.fetchone()

            assert resultado is not None
            assert resultado[0] == "Pet Teste Integracao"
            assert resultado[1] == "Cachorro"
            assert float(resultado[2]) == 12.50

            print("\nCadastro real realizado com sucesso!")
            print(f"ID temporário: {id_pet}")
            print("Dados conferidos no MySQL!")

        finally:
            conexao.rollback()
            cursor.close()
            print("ROLLBACK executado: cadastro desfeito.")

    finally:
        conexao.close()


# TESTE 3 - Restrição CHECK (peso negativo)
def test_mysql_rejeita_peso_negativo():
    conexao = conectar_banco_teste()

    try:
        cursor = conexao.cursor()
        try:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = 'vetcare_test_db'
                  AND TABLE_NAME = 'pet'
                  AND CONSTRAINT_NAME = 'ck_pet_peso'
                  AND CONSTRAINT_TYPE = 'CHECK'
                  AND ENFORCED = 'YES'
            """)

            assert cursor.fetchone()[0] == 1, (
                "A restrição CHECK não está ativa."
            )

            try:
                cursor.execute("""
                    INSERT INTO vetcare_test_db.pet
                        (nome, especie, sexo, peso)
                    VALUES (%s, %s, %s, %s)
                """, (
                    "Pet Peso Invalido",
                    "Cachorro",
                    "macho",
                    -5
                ))

            except mysql.connector.DatabaseError as erro:
                assert erro.errno == 3819
                print("\nMySQL rejeitou o peso negativo!")
                print("Restrição CHECK funcionando corretamente.")

            else:
                raise AssertionError(
                    "ERRO: MySQL aceitou um peso negativo!"
                )

        finally:
            conexao.rollback()
            cursor.close()
            print("Transação encerrada com ROLLBACK.")

    finally:
        conexao.close()


# TESTE 4 - Restrição UNIQUE (CPF duplicado)
def test_mysql_rejeita_cpf_duplicado():
    conexao = conectar_banco_teste()

    try:
        cursor = conexao.cursor()
        try:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = 'vetcare_test_db'
                  AND TABLE_NAME = 'tutor'
                  AND COLUMN_NAME = 'cpf'
                  AND NON_UNIQUE = 0
            """)

            assert cursor.fetchone()[0] >= 1

            cpf_teste = "98765432100"

            cursor.execute("""
                SELECT COUNT(*)
                FROM vetcare_test_db.tutor
                WHERE cpf = %s
            """, (cpf_teste,))

            assert cursor.fetchone()[0] == 0, (
                "O CPF fictício já existe no banco de testes."
            )

            cursor.execute("""
                INSERT INTO vetcare_test_db.tutor
                    (nome, cpf, telefone)
                VALUES (%s, %s, %s)
            """, (
                "Tutor Teste 1",
                cpf_teste,
                "81999990000"
            ))

            try:
                cursor.execute("""
                    INSERT INTO vetcare_test_db.tutor
                        (nome, cpf, telefone)
                    VALUES (%s, %s, %s)
                """, (
                    "Tutor Teste 2",
                    cpf_teste,
                    "81999991111"
                ))

            except mysql.connector.IntegrityError as erro:
                assert erro.errno == 1062
                print("\nMySQL rejeitou o CPF duplicado!")
                print("Restrição UNIQUE funcionando corretamente.")

            else:
                raise AssertionError(
                    "ERRO: MySQL permitiu CPF duplicado!"
                )

        finally:
            conexao.rollback()
            cursor.close()
            print("ROLLBACK executado: alterações desfeitas.")

    finally:
        conexao.close()


# TESTE 5 - Restrição FOREIGN KEY
def test_mysql_rejeita_pet_inexistente_em_consulta():
    conexao = conectar_banco_teste()

    try:
        cursor = conexao.cursor()
        try:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = 'vetcare_test_db'
                  AND TABLE_NAME = 'consulta'
                  AND COLUMN_NAME = 'id_pet'
                  AND REFERENCED_TABLE_NAME = 'pet'
            """)

            assert cursor.fetchone()[0] == 1

            id_pet_inexistente = 2147483647

            cursor.execute("""
                SELECT COUNT(*)
                FROM vetcare_test_db.pet
                WHERE id_pet = %s
            """, (id_pet_inexistente,))

            assert cursor.fetchone()[0] == 0

            try:
                cursor.execute("""
                    INSERT INTO vetcare_test_db.consulta
                        (
                            id_pet,
                            id_tutor,
                            id_veterinario,
                            data_consulta,
                            horario,
                            motivo
                        )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    id_pet_inexistente,
                    1,
                    1,
                    "2026-12-15",
                    "10:00:00",
                    "Consulta fictícia para teste"
                ))

            except mysql.connector.DatabaseError as erro:
                assert erro.errno == 1452, (
                    f"Erro inesperado do MySQL: {erro}"
                )
                print("\nMySQL rejeitou o animal inexistente!")
                print("Restrição FOREIGN KEY funcionando corretamente.")

            else:
                raise AssertionError(
                    "ERRO: MySQL permitiu consulta com animal inexistente!"
                )

        finally:
            conexao.rollback()
            cursor.close()
            print("ROLLBACK executado.")

    finally:
        conexao.close()
