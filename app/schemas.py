
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class PetCreate(BaseModel):
    nome: str = Field(min_length=1)
    especie: str = Field(min_length=1)
    raca: Optional[str] = None
    sexo: str = "indefinido"
    data_nascimento: Optional[date] = None
    peso: Optional[float] = Field(default=None, gt=0)
