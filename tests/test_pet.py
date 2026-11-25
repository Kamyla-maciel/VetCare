
from app.schemas import PetCreate


def test_criar_pet_com_dados_validos():
    pet = PetCreate(
        nome="Rex",
        especie="Cachorro",
        raca="Labrador",
        sexo="macho",
        peso=20.5
    )

    assert pet.nome == "Rex"
    assert pet.especie == "Cachorro"
    assert pet.peso == 20.5
import pytest
from pydantic import ValidationError


def test_pet_nao_aceita_peso_negativo():
    with pytest.raises(ValidationError):
        PetCreate(
            nome="Rex",
            especie="Cachorro",
            peso=-5.0
        )
def test_pet_nao_aceita_peso_zero():
    with pytest.raises(ValidationError):
        PetCreate(
            nome="Mel",
            especie="Cachorro",
            peso=0
        )
def test_pet_nao_aceita_nome_vazio():
    with pytest.raises(ValidationError):
        PetCreate(
            nome="",
            especie="Cachorro",
            peso=5.0
        )
def test_pet_aceita_peso_positivo_pequeno():
    pet = PetCreate(
        nome="Luna",
        especie="Gato",
        peso=0.01
    )

    assert pet.peso == 0.01        