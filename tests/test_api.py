from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def autenticar_funcionario():
    """Simula um funcionário autorizado somente nos testes deste arquivo."""
    funcionario = {"id_funcionario": 1, "nome": "Teste", "perfil": "administrador"}
    with (
        patch("main.exigir_funcionario", return_value=funcionario),
        patch("main.exigir_perfil", return_value=funcionario),
    ):
        yield


def test_api_rejeita_peso_negativo():
    resposta = client.post("/pets", json={"nome": "Rex", "especie": "Cachorro", "peso": -5})
    assert resposta.status_code == 422


def test_api_cadastrar_pet_sucesso():
    with patch("main.cadastrar_pet_com_sincronizacao", return_value=10) as mock_cadastrar:
        resposta = client.post("/pets", json={
            "nome": "Mel", "especie": "Cachorro", "raca": "Poodle",
            "sexo": "femea", "peso": 6.8,
        })
    assert resposta.status_code == 201
    assert resposta.json()["id_pet"] == 10
    mock_cadastrar.assert_called_once()
    sql, params = mock_cadastrar.call_args.args
    assert "INSERT INTO PET" in sql
    assert params[0] == "Mel"
    assert params[5] == 6.8


def test_api_pet_nao_encontrado():
    with patch("main.consultar", return_value=[]) as mock_consultar:
        resposta = client.get("/pets/99999")
    assert resposta.status_code == 404
    assert resposta.json()["detail"] == "Animal não encontrado."
    mock_consultar.assert_called_once()


def test_api_buscar_pet_existente():
    pet_ficticio = {
        "id_pet": 1, "nome": "Rex", "especie": "Cachorro",
        "raca": "Labrador", "sexo": "macho",
        "data_nascimento": None, "peso": 20.5, "foto_url": None,
    }
    with patch("main.consultar", return_value=[pet_ficticio]) as mock_consultar:
        resposta = client.get("/pets/1")
    assert resposta.status_code == 200
    assert resposta.json()["id_pet"] == 1
    assert resposta.json()["nome"] == "Rex"
    assert resposta.json()["peso"] == 20.5
    mock_consultar.assert_called_once()


def test_api_excluir_pet_inexistente():
    with patch(
        "main.desativar_pet_com_sincronizacao",
        side_effect=HTTPException(404, "Animal não encontrado ou desativado."),
    ) as mock_desativar:
        resposta = client.delete("/pets/99999")
    assert resposta.status_code == 404
    assert resposta.json()["detail"] == "Animal não encontrado ou desativado."
    mock_desativar.assert_called_once_with(99999)


def test_api_excluir_pet_sucesso():
    with patch("main.desativar_pet_com_sincronizacao") as mock_desativar:
        resposta = client.delete("/pets/1")
    assert resposta.status_code == 200
    assert resposta.json()["mensagem"] == "Animal desativado com sucesso!"
    mock_desativar.assert_called_once_with(1)


def test_api_editar_pet_sucesso():
    with patch("main.editar_pet_com_sincronizacao") as mock_editar:
        resposta = client.put("/pets/1", json={
            "nome": "Rex Atualizado", "especie": "Cachorro",
            "raca": "Labrador", "sexo": "macho", "peso": 22.5,
        })
    assert resposta.status_code == 200
    assert resposta.json()["mensagem"] == "Animal atualizado com sucesso!"
    mock_editar.assert_called_once()
    sql, params, id_pet = mock_editar.call_args.args
    assert "UPDATE PET" in sql
    assert params[0] == "Rex Atualizado"
    assert params[5] == 22.5
    assert params[6] == 1
    assert id_pet == 1


def test_api_editar_pet_inexistente():
    with patch(
        "main.editar_pet_com_sincronizacao",
        side_effect=HTTPException(404, "Animal não encontrado ou desativado."),
    ) as mock_editar:
        resposta = client.put("/pets/99999", json={
            "nome": "Rex", "especie": "Cachorro", "peso": 10.0,
        })
    assert resposta.status_code == 404
    assert resposta.json()["detail"] == "Animal não encontrado ou desativado."
    mock_editar.assert_called_once()
