
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class VacinacaoCreate(BaseModel):
    id_pet: int = Field(gt=0)
    nome_vacina: str = Field(min_length=2, max_length=100)
    data_aplicacao: date
    proxima_dose: Optional[date] = None
    lote: Optional[str] = Field(default=None, max_length=50)
    observacoes: Optional[str] = None

    @field_validator("nome_vacina")
    @classmethod
    def validar_nome_vacina(cls, valor):
        valor = valor.strip()

        if len(valor) < 2:
            raise ValueError("Informe o nome da vacina.")

        return valor

    @model_validator(mode="after")
    def validar_datas(self):
        if (
            self.proxima_dose is not None
            and self.proxima_dose < self.data_aplicacao
        ):
            raise ValueError(
                "A próxima dose não pode ser anterior à aplicação."
            )

        return self
