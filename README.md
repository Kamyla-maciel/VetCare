
#  Vet Care — Sistema de Gestão Veterinária

## Sobre o projeto

O Vet Care é um sistema de gestão interna desenvolvido para clínicas veterinárias, com o objetivo de facilitar a organização dos atendimentos, o gerenciamento de pacientes e o controle das atividades realizadas pelos funcionários.

O projeto foi desenvolvido para a disciplina de Banco de Dados do curso de Análise e Desenvolvimento de Sistemas da UNIFG.

##  Funcionalidades

- Login e autenticação de funcionários.
- Controle de acesso por perfil.
- Cadastro e gerenciamento de tutores.
- Cadastro e gerenciamento de animais.
- Agendamento de consultas.
- Gerenciamento de exames.
- Controle de vacinação.
- Controle de estoque.
- Carteirinha digital dos animais.
- Integração com Supabase.
- Testes automatizados.

##  Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Python 3.13 | Desenvolvimento do back-end |
| FastAPI | Desenvolvimento da API |
| Uvicorn | Servidor da aplicação |
| MySQL | Banco de dados principal |
| Supabase | Integração com banco de dados online |
| SQLite | Armazenamento local da carteirinha |
| HTML5 | Estrutura das interfaces |
| CSS3 | Estilização |
| JavaScript | Interatividade |
| Pytest | Testes automatizados do back-end |
| Cypress | Testes automatizados do front-end |
| Git e GitHub | Controle de versão |

##  Identidade visual

- Verde: #AFB38A
- Azul petróleo: #084E54
- Branco: #FFFFFF

A interface foi desenvolvida para proporcionar uma experiência organizada, intuitiva e adequada à rotina dos funcionários de uma clínica veterinária.

##  Estrutura do projeto

    VetCare/
    ├── app/
    ├── carteirinha_online/
    ├── cypress/
    ├── database/
    │   ├── schema_limpo.sql
    │   ├── schema_teste.sql
    │   ├── consultas.sql
    │   ├── reset_test.sql
    │   └── seed.sql
    ├── frontend/
    ├── tests/
    ├── .env.example
    ├── .gitignore
    ├── criar_admin.py
    ├── cypress.config.js
    ├── main.py
    ├── package.json
    ├── requirements.txt
    ├── sincronizar_carteirinha.py
    └── README.md

## ⚙️ Pré-requisitos

Antes de executar o projeto, é necessário instalar:

- Python 3.13
- MySQL Server
- MySQL Workbench
- Node.js
- npm
- Git

## 💻 Como executar o projeto

### 1. Clonar o repositório

    git clone https://github.com/Kamyla-maciel/VetCare.git
    cd VetCare

### 2. Criar o ambiente virtual

    py -3.13 -m venv .venv

### 3. Ativar o ambiente virtual no Windows

    .venv\Scripts\Activate.ps1

### 4. Instalar as dependências do Python

    python -m pip install -r requirements.txt

### 5. Configurar o banco de dados

Abra o MySQL Workbench e crie o banco:

    CREATE DATABASE IF NOT EXISTS vetcare_test_db;
    USE vetcare_test_db;

Em seguida, abra e execute o arquivo:

    database/schema_limpo.sql

Esse arquivo contém a estrutura do banco de dados, sem os registros originais da clínica.

### 6. Configurar as variáveis de ambiente

Crie uma cópia do arquivo .env.example:

    Copy-Item .env.example .env

Preencha as informações de conexão com o MySQL:

    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=seu_usuario
    DB_PASSWORD=sua_senha
    DB_NAME=vetcare_test_db

Configure também as demais variáveis presentes no arquivo .env.example, conforme os recursos utilizados.

As credenciais do Supabase devem ser configuradas para utilizar os recursos de integração online.

O arquivo .env não deve ser compartilhado publicamente.

### 7. Criar o administrador inicial

Com o banco configurado, execute:

    python criar_admin.py

Preencha as informações solicitadas no terminal.

Esse procedimento permite criar o primeiro administrador do sistema em um banco sem funcionários cadastrados.

### 8. Iniciar a aplicação

    python -m uvicorn main:app --host 127.0.0.1 --port 8000

Acesse o sistema pelo navegador:

http://127.0.0.1:8000

A documentação interativa da API está disponível em:

http://127.0.0.1:8000/docs

##  Banco de dados

O banco de dados relacional foi desenvolvido utilizando MySQL, permitindo o armazenamento e relacionamento das informações necessárias para o funcionamento do sistema.

Entre as principais informações gerenciadas estão:

- Funcionários.
- Tutores.
- Animais.
- Consultas.
- Vacinas.
- Exames.
- Estoque.

O projeto utiliza operações CRUD:

- Create — Cadastro de registros.
- Read — Consulta de registros.
- Update — Atualização de registros.
- Delete — Exclusão de registros.

##  Carteirinha digital

A carteirinha digital permite disponibilizar informações dos animais por meio de uma identificação digital.

O projeto utiliza recursos de armazenamento local com SQLite e integração com Supabase para sincronização das informações.

Os recursos online dependem da configuração das respectivas variáveis de ambiente.

##  Testes automatizados

### Pytest

O Pytest é utilizado para verificar o funcionamento do back-end, das funcionalidades da API e das integrações.

Para executar:

    python -m pytest -v

Utilize um banco de dados exclusivo para testes, sem informações reais.

### Cypress

O Cypress é utilizado para realizar testes de ponta a ponta (E2E), simulando interações dos usuários com a interface.

Instale as dependências:

    npm ci

Inicie a aplicação na porta configurada para os testes:

    python -m uvicorn main:app --port 8003

Em outro terminal, abra o Cypress:

    npx cypress open

Para executar os testes diretamente pelo terminal:

    npx cypress run

##  Segurança

O projeto utiliza recursos de segurança como:

- Autenticação de funcionários.
- Controle de acesso por perfil.
- Armazenamento de senhas com hash.
- Variáveis de ambiente para credenciais.
- Separação de arquivos privados por meio do .gitignore.

Credenciais, bancos locais e registros privados não fazem parte do repositório público.

##  Informações acadêmicas

- Instituição: UNIFG
- Curso: Análise e Desenvolvimento de Sistemas
- Disciplina: Banco de Dados
- Projeto: Vet Care
- Ano: 2026

##  Considerações finais

O desenvolvimento do Vet Care possibilitou a aplicação prática dos conhecimentos de modelagem de banco de dados, desenvolvimento de APIs, integração entre front-end e back-end, controle de versão e testes automatizados.

O sistema foi desenvolvido com finalidade acadêmica.

---

 Vet Care — Tecnologia a serviço do cuidado animal.
