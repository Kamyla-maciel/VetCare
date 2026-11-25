
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


def criar_hash_senha(senha: str) -> str:
    return password_hash.hash(senha)


def verificar_senha(senha: str, hash_salvo: str) -> bool:
    try:
        return password_hash.verify(senha, hash_salvo)
    except (ValueError, TypeError):
        return False
