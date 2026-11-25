
/* ==========================================
   VET CARE - TESTES DE PERMISSÕES
   Cypress E2E
   Banco: vetcare_test_db
========================================== */

describe("Vet Care - Controle de Acesso", () => {

    // Utiliza o baseUrl configurado em cypress.config.js
    // Atualmente: http://127.0.0.1:8003

    const contas = {
        administrador: {
            email: "rafaelhora@gmail.com",
            variavelSenha: "ADMIN_SENHA"
        },

        veterinario: {
            email: "veterinario.cypress@example.com",
            variavelSenha: "VET_SENHA"
        },

        atendente: {
            email: "atendente.cypress@example.com",
            variavelSenha: "ATENDENTE_SENHA"
        }
    };

    /* ==========================================
       VERIFICAR BANCO DE TESTES
    ========================================== */

    function verificarBancoTeste() {

        return cy.request({
            method: "GET",
            url: "/verificar-banco"
        }).then((resposta) => {

            expect(resposta.status).to.eq(200);

            expect(
                resposta.body.banco_conectado,
                "O Cypress deve utilizar somente o banco de testes"
            ).to.eq("vetcare_test_db");

        });
    }

    /* ==========================================
       REALIZAR LOGIN
    ========================================== */

    function fazerLogin(perfil) {

        const conta = contas[perfil];

        if (!conta) {
            throw new Error(`Perfil inválido: ${perfil}`);
        }

        return cy.env(
            [conta.variavelSenha],
            { log: false }
        ).then((variaveis) => {

            const senha = variaveis[conta.variavelSenha];

            expect(
                senha,
                `Senha de ${perfil} configurada no Cypress`
            ).to.be.a("string").and.not.be.empty;

            return cy.request({
                method: "POST",
                url: "/auth/login",
                log: false,

                body: {
                    email: conta.email,
                    senha: senha
                }
            }).then((resposta) => {

                expect(resposta.status).to.eq(200);

                return resposta;
            });

        });
    }

    /* ==========================================
       PREPARAÇÃO DOS TESTES
    ========================================== */

    before(() => {

        // Impede os testes caso o banco esteja errado
        verificarBancoTeste();

    });

    beforeEach(() => {

        // Cada teste começa sem sessão anterior
        cy.clearCookies();

        cy.visit("/");

    });

    /* ==========================================
       TESTE 01 - SEM LOGIN
    ========================================== */

    it("01 - Bloqueia acesso sem login", () => {

        cy.request({
            method: "GET",
            url: "/auth/funcionarios",
            failOnStatusCode: false

        }).then((resposta) => {

            expect(resposta.status).to.eq(401);

        });

    });

    /* ==========================================
       TESTE 02 - ADMINISTRADOR
    ========================================== */

    it("02 - Administrador acessa funcionários", () => {

        fazerLogin("administrador");

        cy.request({
            method: "GET",
            url: "/auth/funcionarios"
        }).then((resposta) => {

            expect(resposta.status).to.eq(200);

        });

    });

    /* ==========================================
       TESTE 03 - VETERINÁRIO
    ========================================== */

    it("03 - Veterinário não gerencia funcionários", () => {

        fazerLogin("veterinario");

        cy.request({
            method: "GET",
            url: "/auth/funcionarios",
            failOnStatusCode: false

        }).then((resposta) => {

            expect(resposta.status).to.eq(403);

        });

    });

    /* ==========================================
       TESTE 04 - ATENDENTE
    ========================================== */

    it("04 - Atendente não gerencia funcionários", () => {

        fazerLogin("atendente");

        cy.request({
            method: "GET",
            url: "/auth/funcionarios",
            failOnStatusCode: false

        }).then((resposta) => {

            expect(resposta.status).to.eq(403);

        });

    });

    /* ==========================================
       TESTE 05 - PRONTUÁRIOS
    ========================================== */

    it("05 - Atendente não acessa prontuários", () => {

        fazerLogin("atendente");

        cy.request({
            method: "GET",
            url: "/pets/1/prontuario",
            failOnStatusCode: false

        }).then((resposta) => {

            expect(resposta.status).to.eq(403);

        });

    });

    /* ==========================================
       TESTE 06 - DIAGNÓSTICO ATENDENTE
    ========================================== */

    it("06 - Atendente não registra diagnósticos", () => {

        fazerLogin("atendente");

        cy.request({
            method: "PUT",
            url: "/consultas/1/atendimento",
            failOnStatusCode: false,

            body: {
                observacoes: "Teste automatizado",
                diagnostico: "Teste automatizado",
                orientacoes: "Teste automatizado"
            }

        }).then((resposta) => {

            expect(resposta.status).to.eq(403);

        });

    });

    /* ==========================================
       TESTE 07 - DIAGNÓSTICO ADMINISTRADOR
    ========================================== */

    it("07 - Administrador não registra diagnósticos", () => {

        fazerLogin("administrador");

        cy.request({
            method: "PUT",
            url: "/consultas/1/atendimento",
            failOnStatusCode: false,

            body: {
                observacoes: "Teste automatizado",
                diagnostico: "Teste automatizado",
                orientacoes: "Teste automatizado"
            }

        }).then((resposta) => {

            expect(resposta.status).to.eq(403);

        });

    });

    /* ==========================================
       TESTE 08 - AGENDA VETERINÁRIA
    ========================================== */

    it("08 - Veterinário consulta sua agenda", () => {

        fazerLogin("veterinario");

        cy.request({
            method: "GET",
            url: "/consultas"
        }).then((resposta) => {

            expect(resposta.status).to.eq(200);

            expect(resposta.body).to.be.an("array");

            // Identificar o veterinário logado
            cy.request({
                method: "GET",
                url: "/auth/me"
            }).then((usuario) => {

                expect(usuario.status).to.eq(200);

                const idVeterinario = Number(
                    usuario.body.id_funcionario
                );

                expect(idVeterinario).to.be.a("number");
                expect(Number.isNaN(idVeterinario)).to.eq(false);

                // Todas as consultas devem pertencer
                // ao veterinário autenticado
                resposta.body.forEach((consulta) => {

                    expect(
                        Number(consulta.id_veterinario)
                    ).to.eq(idVeterinario);

                });

            });

        });

    });

    /* ==========================================
       TESTE 09 - INICIAR ATENDIMENTO
    ========================================== */

    it("09 - Administrador não inicia atendimento", () => {

        fazerLogin("administrador");

        cy.request({
            method: "PUT",
            url: "/consultas/1/status",
            failOnStatusCode: false,

            body: {
                status_consulta: "em_atendimento"
            }

        }).then((resposta) => {

            expect(resposta.status).to.eq(403);

        });

    });

});
