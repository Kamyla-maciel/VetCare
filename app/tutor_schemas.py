
from pydantic import BaseModel, Field
from typing import Optional


class TutorCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    cpf: str = Field(min_length=11, max_length=14)
    email: Optional[str] = None
    telefone: str = Field(min_length=8, max_length=20)
    endereco: Optional[str] = None
