
from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field


StatusConsulta = Literal[
    "agendada",
    "em_atendimento",
    "concluida",
    "cancelada"
]


class ConsultaCreate(BaseModel):
    id_pet: int = Field(gt=0)
    id_tutor: int = Field(gt=0)
    id_veterinario: int = Field(gt=0)

    data_consulta: date
    horario: time

    motivo: str = Field(min_length=1, max_length=255)

    observacoes: str | None = None


class ConsultaStatus(BaseModel):
    status_consulta: StatusConsulta


class ConsultaAtendimento(BaseModel):
    observacoes: str | None = None
    diagnostico: str | None = None
    orientacoes: str | None = None



class VeterinarioCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=100)
    cpf: str = Field(min_length=11, max_length=14)
    telefone: str | None = None
    crmv: str = Field(min_length=3, max_length=30)
    senha: str = Field(min_length=12)


class VeterinarioUpdate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=100)
    cpf: str = Field(min_length=11, max_length=14)
    telefone: str | None = None
    crmv: str = Field(min_length=3, max_length=30)

