
-- VET CARE - DADOS FICTÍCIOS
-- Executar somente no banco de testes

USE vetcare_test_db;

-- Animais de exemplo
INSERT INTO pet
(nome, especie, raca, sexo, peso, ativo)
VALUES
('Rex', 'Cachorro', 'Labrador', 'macho', 20.50, 1),
('Luna', 'Gato', 'Siamês', 'femea', 4.20, 1),
('Mel', 'Cachorro', 'Poodle', 'femea', 6.80, 1);

-- Tutores fictícios
INSERT INTO tutor
(nome, cpf, email, telefone, endereco, ativo)
VALUES
('João Teste', '10000000001', 'joao.teste@example.com',
 '81900000001', 'Rua Exemplo, 10', 1),
('Maria Teste', '10000000002', 'maria.teste@example.com',
 '81900000002', 'Rua Exemplo, 20', 1);

-- Vínculos entre tutores e animais
INSERT INTO tutor_pet
(id_tutor, id_pet, tutor_principal)
SELECT t.id_tutor, p.id_pet, 1
FROM tutor t
CROSS JOIN pet p
WHERE t.cpf = '10000000001'
AND p.nome = 'Rex';

INSERT INTO tutor_pet
(id_tutor, id_pet, tutor_principal)
SELECT t.id_tutor, p.id_pet, 1
FROM tutor t
CROSS JOIN pet p
WHERE t.cpf = '10000000002'
AND p.nome = 'Luna';
