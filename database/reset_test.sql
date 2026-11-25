
-- ============================================
-- VET CARE - RESET DO BANCO DE TESTES
-- ============================================
-- ATENÇÃO:
-- Este script apaga e recria dados fictícios
-- SOMENTE no banco vetcare_test_db.
-- NÃO executar no banco principal.
-- ============================================

USE vetcare_test_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS vetcare_test_db.reset_dados_teste$$

CREATE PROCEDURE vetcare_test_db.reset_dados_teste()
BEGIN
DECLARE modo_seguro_anterior INT DEFAULT 1;

DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    ROLLBACK;
    SET SQL_SAFE_UPDATES = modo_seguro_anterior;
    RESIGNAL;
END;

SET modo_seguro_anterior = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;
Start TRANSACTION;

    -- Excluir registros relacionados primeiro
    -- Limpar somente dados operacionais de teste.
    -- Preservar funcionarios usados nos testes de login.
    DELETE FROM vetcare_test_db.consulta;
    DELETE FROM vetcare_test_db.tutor_pet;
    DELETE FROM vetcare_test_db.pet;
    DELETE FROM vetcare_test_db.tutor;

    -- ========================================
    -- CADASTRO DE ANIMAIS FICTÍCIOS
    -- ========================================

    INSERT INTO vetcare_test_db.pet
    (nome, especie, raca, sexo, peso, ativo)
    VALUES
    ('Rex', 'Cachorro', 'Labrador', 'macho', 20.50, 1),
    ('Luna', 'Gato', 'Siamês', 'femea', 4.20, 1),
    ('Mel', 'Cachorro', 'Poodle', 'femea', 6.80, 1);

    -- ========================================
    -- CADASTRO DE TUTORES FICTÍCIOS
    -- ========================================

    INSERT INTO vetcare_test_db.tutor
    (nome, cpf, email, telefone, endereco, ativo)
    VALUES
    ('João Teste', '10000000001',
     'joao.teste@example.com',
     '81900000001', 'Rua Exemplo, 10', 1),

    ('Maria Teste', '10000000002',
     'maria.teste@example.com',
     '81900000002', 'Rua Exemplo, 20', 1);

    -- ========================================
    -- VÍNCULOS ENTRE TUTORES E ANIMAIS
    -- ========================================

    INSERT INTO vetcare_test_db.tutor_pet
    (id_tutor, id_pet, tutor_principal)
    SELECT t.id_tutor, p.id_pet, 1
    FROM vetcare_test_db.tutor t
    CROSS JOIN vetcare_test_db.pet p
    WHERE t.cpf = '10000000001'
      AND p.nome = 'Rex';

    INSERT INTO vetcare_test_db.tutor_pet
    (id_tutor, id_pet, tutor_principal)
    SELECT t.id_tutor, p.id_pet, 1
    FROM vetcare_test_db.tutor t
    CROSS JOIN vetcare_test_db.pet p
    WHERE t.cpf = '10000000002'
      AND p.nome = 'Luna';
    COMMIT;
SET SQL_SAFE_UPDATES = modo_seguro_anterior;
END$$

DELIMITER ;

-- Para executar o reset manualmente, quando necessario:
-- CALL vetcare_test_db.reset_dados_teste();

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================

SELECT 'Animais' AS categoria, COUNT(*) AS total
FROM vetcare_test_db.pet

UNION ALL

SELECT 'Tutores', COUNT(*)
FROM vetcare_test_db.tutor

UNION ALL

SELECT 'Vínculos', COUNT(*)
FROM vetcare_test_db.tutor_pet;
