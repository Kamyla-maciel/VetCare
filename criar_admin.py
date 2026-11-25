
from getpass import getpass

from app.database import conectar
from app.auth import criar_hash_senha


def criar_administrador():
    print("\n=== PRIMEIRO ADMINISTRADOR VET CARE ===")

    nome = input("Nome completo: ").strip()
    email = input("E-mail: ").strip().lower()
    cpf = input("CPF: ").strip()
    telefone = input("Telefone: ").strip()

    senha = getpass("Crie uma senha (mínimo 12 caracteres): ")
    confirmar = getpass("Confirme a senha: ")

    if not nome or not email or not cpf:
        print("Preencha todos os campos obrigatórios.")
        return

    if len(senha) < 12:
        print("A senha precisa ter pelo menos 12 caracteres.")
        return

    if senha != confirmar:
        print("As senhas não coincidem.")
        return

    db = conectar()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT COUNT(*) FROM FUNCIONARIO"
        )

        quantidade = cursor.fetchone()[0]

        if quantidade > 0:
            print(
                "Já existem funcionários cadastrados. "
                "Criação inicial bloqueada."
            )
            return

        senha_protegida = criar_hash_senha(senha)

        cursor.execute(
            """
            INSERT INTO FUNCIONARIO (
                nome,
                email,
                senha,
                cpf,
                telefone,
                cargo,
                perfil,
                status_cadastro,
                ativo
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'aprovado', 1)
            """,
            (
                nome,
                email,
                senha_protegida,
                cpf,
                telefone,
                "Administrador",
                "administrador"
            )
        )

        db.commit()

        print("\nAdministrador cadastrado com sucesso!")

    except Exception:
        db.rollback()
        print("Não foi possível criar o administrador. Confira os dados.")
        raise

    finally:
        cursor.close()
        db.close()


if __name__ == "__main__":
    criar_administrador()
