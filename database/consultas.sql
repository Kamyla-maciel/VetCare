
-- =====================================================
-- VET CARE - CONSULTAS SQL
-- Exemplos de JOIN e GROUP BY
-- =====================================================

-- CONSULTA 1: Listar animais e seus tutores
-- Demonstra relacionamento entre tres tabelas (JOIN)

SELECT
    p.nome AS animal,
    p.especie,
    t.nome AS tutor
FROM pet AS p
INNER JOIN tutor_pet AS tp
    ON p.id_pet = tp.id_pet
INNER JOIN tutor AS t
    ON tp.id_tutor = t.id_tutor;


-- CONSULTA 2: Quantidade de animais por tutor
-- Demonstra LEFT JOIN, COUNT e GROUP BY

SELECT
    t.nome AS tutor,
    COUNT(tp.id_pet) AS total_animais
FROM tutor AS t
LEFT JOIN tutor_pet AS tp
    ON t.id_tutor = tp.id_tutor
GROUP BY
    t.id_tutor,
    t.nome
ORDER BY total_animais DESC;


-- CONSULTA 3: Consultas agendadas com animal,
-- tutor e veterinario
-- Demonstra relacionamento entre quatro tabelas

SELECT
    c.id_consulta,
    p.nome AS animal,
    t.nome AS tutor,
    f.nome AS veterinario,
    c.data_consulta,
    c.horario,
    c.status_consulta
FROM consulta AS c
INNER JOIN pet AS p
    ON c.id_pet = p.id_pet
INNER JOIN tutor AS t
    ON c.id_tutor = t.id_tutor
INNER JOIN funcionario AS f
    ON c.id_veterinario = f.id_funcionario
ORDER BY c.data_consulta, c.horario;
