
-- ============================================================
-- VET CARE - ESTRUTURA DO BANCO DE DADOS
-- Sistema interno de gerenciamento de clinica veterinaria
-- MySQL 8.0+
--
-- ATENCAO:
-- Execute somente em um banco novo e vazio.
-- Este arquivo nao apaga tabelas existentes.
-- ============================================================
-- VET CARE - ESTRUTURA DO BANCO DE TESTES
-- Executar somente em um banco de testes novo e vazio.

USE vetcare_test_db;
-- 1. FUNCIONARIOS
CREATE TABLE funcionario (
    id_funcionario INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    telefone VARCHAR(20) DEFAULT NULL,
    cargo VARCHAR(80) DEFAULT NULL,
    perfil ENUM(
        'administrador',
        'veterinario',
        'atendente'
    ) NOT NULL DEFAULT 'atendente',
    status_cadastro ENUM(
        'pendente',
        'aprovado',
        'rejeitado'
    ) NOT NULL DEFAULT 'pendente',
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    crmv VARCHAR(30) DEFAULT NULL,
    foto_perfil VARCHAR(255) DEFAULT NULL,

    PRIMARY KEY (id_funcionario),
    UNIQUE KEY uk_funcionario_email (email),
    UNIQUE KEY uk_funcionario_cpf (cpf)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- 2. ANIMAIS
CREATE TABLE pet (
    id_pet INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    especie VARCHAR(50) NOT NULL,
    raca VARCHAR(100) DEFAULT NULL,
    sexo ENUM(
        'macho',
        'femea',
        'indefinido'
    ) NOT NULL DEFAULT 'indefinido',
    data_nascimento DATE DEFAULT NULL,
    peso DECIMAL(6,2) DEFAULT NULL,
    pelagem VARCHAR(100) DEFAULT NULL,
    castrado TINYINT(1) DEFAULT 0,
    observacoes TEXT,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_pet),
    CONSTRAINT ck_pet_peso CHECK (peso > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- 3. TUTORES
CREATE TABLE tutor (
    id_tutor INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    telefone VARCHAR(20) NOT NULL,
    endereco VARCHAR(255) DEFAULT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_tutor),
    UNIQUE KEY uk_tutor_cpf (cpf)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- 4. RELACIONAMENTO ENTRE TUTORES E ANIMAIS
CREATE TABLE tutor_pet (
    id_tutor INT NOT NULL,
    id_pet INT NOT NULL,
    tutor_principal TINYINT(1) NOT NULL DEFAULT 0,

    PRIMARY KEY (id_tutor, id_pet),

    KEY fk_tutor_pet_pet (id_pet),

    CONSTRAINT fk_tutor_pet_tutor
        FOREIGN KEY (id_tutor)
        REFERENCES tutor(id_tutor),

    CONSTRAINT fk_tutor_pet_pet
        FOREIGN KEY (id_pet)
        REFERENCES pet(id_pet)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- 5. CONSULTAS
CREATE TABLE consulta (
    id_consulta INT NOT NULL AUTO_INCREMENT,
    id_pet INT NOT NULL,
    id_tutor INT NOT NULL,
    id_veterinario INT NOT NULL,
    data_consulta DATE NOT NULL,
    horario TIME NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    status_consulta ENUM(
        'agendada',
        'em_atendimento',
        'concluida',
        'cancelada'
    ) NOT NULL DEFAULT 'agendada',
    observacoes TEXT,
    diagnostico TEXT,
    orientacoes TEXT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_consulta),

    KEY fk_consulta_pet (id_pet),
    KEY fk_consulta_tutor (id_tutor),
    KEY fk_consulta_veterinario (id_veterinario),

    CONSTRAINT fk_consulta_pet
        FOREIGN KEY (id_pet)
        REFERENCES pet(id_pet),

    CONSTRAINT fk_consulta_tutor
        FOREIGN KEY (id_tutor)
        REFERENCES tutor(id_tutor),

    CONSTRAINT fk_consulta_veterinario
        FOREIGN KEY (id_veterinario)
        REFERENCES funcionario(id_funcionario)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIM DA ESTRUTURA DO BANCO VET CARE
-- ============================================================
