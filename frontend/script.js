
/* ==========================================
   VET CARE - SISTEMA DE GESTÃO VETERINÁRIA
========================================== */

/* ==========================================
   1. VARIÁVEIS GLOBAIS
========================================== */

const $ = id => document.getElementById(id);

let pets = [];
let tutores = [];
let vinculos = [];

let editPet = null;
let editTutor = null;

/* ==========================================
   2. ESPÉCIES E RAÇAS
========================================== */

const racasPorEspecie = {
    "Cachorro": [
        "Shih-tzu", "Poodle", "Pinscher",
        "Labrador", "Golden Retriever",
        "Pastor Alemão", "Bulldog Francês",
        "Yorkshire", "Spitz Alemão",
        "Rottweiler", "Border Collie",
        "Dachshund", "Pit Bull", "Beagle",
        "Boxer", "Chihuahua", "Cocker Spaniel",
        "Doberman", "Dálmata", "Husky Siberiano",
        "Maltês", "Pug", "Schnauzer",
        "Vira-lata (SRD)", "Outra"
    ],

    "Gato": [
        "Siamês", "Persa", "Maine Coon",
        "Ragdoll", "Bengal", "Sphynx",
        "Angorá", "British Shorthair",
        "Azul Russo", "Himalaio",
        "Munchkin", "Scottish Fold",
        "Sem raça definida (SRD)", "Outra"
    ],

    "Coelho": [
        "Mini Lop", "Holland Lop", "Lionhead",
        "Nova Zelândia", "Rex", "Angorá",
        "Mini Rex", "Sem raça definida", "Outra"
    ],

    "Ave": [
        "Calopsita", "Periquito", "Canário",
        "Papagaio", "Agapornis",
        "Outra"
    ],

    "Hamster": [
        "Sírio", "Anão Russo",
        "Roborovski", "Chinês", "Outro"
    ],

    "Porquinho-da-índia": [
        "Inglês", "Abissínio", "Peruano",
        "Sheltie", "Skinny", "Outro"
    ],

    "Réptil": [
        "Jabuti", "Tartaruga", "Iguana",
        "Gecko", "Dragão-barbudo", "Outro"
    ],

    "Outro": ["Outra"]
};

const campoEspecie = $("especie");
const campoRaca = $("raca");

function atualizarRacas(racaSelecionada = "") {
    if (!campoEspecie || !campoRaca) return;

    const especie = campoEspecie.value;
    const racas = racasPorEspecie[especie] || [];

    campoRaca.replaceChildren(
        new Option("Selecione a raça", "")
    );

    racas.forEach(raca => {
        campoRaca.add(new Option(raca, raca));
    });

    campoRaca.value = racaSelecionada;
}

if (campoEspecie && campoRaca) {
    campoEspecie.addEventListener("change", () => {
        atualizarRacas();
    });

    atualizarRacas();
}

/* ==========================================
   3. MENSAGENS DO SISTEMA
========================================== */

function aviso(mensagem) {
    const elemento = $("aviso");

    if (elemento) {
        elemento.textContent = mensagem;
    }
}

/* ==========================================
   4. COMUNICAÇÃO COM FASTAPI
========================================== */

async function requisicao(url, options = {}) {
    const resposta = await fetch(url, options);

    const dados = await resposta.json()
        .catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            typeof dados.detail === "string"
                ? dados.detail
                : `Erro ${resposta.status}. Confira os campos.`
        );
    }

    return dados;
}

const json = (method, body) => ({
    method: method,

    headers: {
        "Content-Type": "application/json"
    },

    body: JSON.stringify(body)
});

/* ==========================================
   5. FUNÇÕES AUXILIARES DAS TABELAS
========================================== */

function celula(linha, valor) {
    const td = linha.insertCell();

    td.textContent = valor ?? "—";

    return td;
}

function botao(td, texto, acao, classe = "") {
    const b = document.createElement("button");

    b.type = "button";
    b.textContent = texto;
    b.className = classe;

    b.addEventListener("click", acao);

    td.appendChild(b);
}

/* ==========================================
   6. CARREGAR DADOS DO BANCO
========================================== */

async function atualizar() {
    try {
        const [p, t, v] = await Promise.all([
            requisicao("/pets"),
            requisicao("/tutores"),
            requisicao("/vinculos")
        ]);

        pets = p;
        tutores = t.tutores;
        vinculos = v;

        $("total-pets").textContent = pets.length;
        $("total-tutores").textContent = tutores.length;
        $("total-vinculos").textContent = vinculos.length;

        desenharPets();
        desenharTutores();
        desenharVinculos();

    } catch (erro) {
        aviso("Erro ao carregar: " + erro.message);
    }
}

/* ==========================================
   7. LISTAR ANIMAIS
========================================== */


function desenharPets() {
    const tabela = $("lista-pets");

    tabela.replaceChildren();

    for (const pet of pets) {
        const linha = tabela.insertRow();

        [
            pet.id_pet,
            pet.nome,
            pet.especie,
            pet.raca,
            pet.sexo,
            pet.peso
        ].forEach(valor => {
            celula(linha, valor);
        });

        const acoes = linha.insertCell();

        botao(
            acoes,
            "Editar",
            () => abrirPet(pet),
            "suave"
        );

        botao(
            acoes,
            "Desativar",
            () => desativar(
                "pets",
                pet.id_pet,
                pet.nome
            ),
            "perigo"
        );

        // NOVO BOTÃO: CARTEIRINHA DIGITAL
        botao(
            acoes,
            "Ver carteirinha",
            () => abrirCarteirinha(pet),
            "suave"
        );
    }
}


/* ==========================================
   8. LISTAR TUTORES
========================================== */

function desenharTutores() {
    const tabela = $("lista-tutores");

    tabela.replaceChildren();

    for (const tutor of tutores) {
        const linha = tabela.insertRow();

        [
            tutor.id_tutor,
            tutor.nome,
            tutor.cpf,
            tutor.email,
            tutor.telefone,
            tutor.endereco
        ].forEach(valor => {
            celula(linha, valor);
        });

        const acoes = linha.insertCell();

        botao(
            acoes,
            "Editar",
            () => abrirTutor(tutor),
            "suave"
        );

        botao(
            acoes,
            "Desativar",
            () => desativar(
                "tutores",
                tutor.id_tutor,
                tutor.nome
            ),
            "perigo"
        );
    }
}

/* ==========================================
   10. LISTAR VÍNCULOS
========================================== */

function desenharVinculos() {

    const tabela = $("lista-vinculos");

    tabela.replaceChildren();

    for (const vinculo of vinculos) {

        const linha = tabela.insertRow();

        celula(linha, vinculo.pet_nome);

        celula(linha, vinculo.tutor_nome);

        celula(
            linha,
            vinculo.tutor_principal ? "Sim" : "Não"
        );

        const acoes = linha.insertCell();

        if (!vinculo.tutor_principal) {

            botao(
                acoes,
                "Tornar principal",
                async () => {

                    try {

                        await requisicao(
                            `/vinculos/${vinculo.id_pet}/${vinculo.id_tutor}/principal`,
                            { method: "PUT" }
                        );

                        aviso("Tutor principal atualizado.");

                        await atualizar();

                    } catch (erro) {

                        aviso(erro.message);

                    }

                },
                "suave"
            );

        }

        botao(
            acoes,
            "Remover",
            async () => {

                if (!confirm("Remover este vínculo?")) {
                    return;
                }

                try {

                    await requisicao(
                        `/vinculos/${vinculo.id_pet}/${vinculo.id_tutor}`,
                        { method: "DELETE" }
                    );

                    aviso("Vínculo removido.");

                    await atualizar();

                } catch (erro) {

                    aviso(erro.message);

                }

            },
            "perigo"
        );

    }

}

/* ==========================================
   11. DESATIVAR ANIMAIS E TUTORES
========================================== */

async function desativar(tipo, id, nome) {

    if (!confirm(`Desativar ${nome}?`)) {
        return;
    }

    try {

        await requisicao(
            `/${tipo}/${id}`,
            { method: "DELETE" }
        );

        aviso("Registro desativado.");

        await atualizar();

    } catch (erro) {

        aviso(erro.message);

    }

}

/* ==========================================
   12. ABRIR CADASTRO / EDIÇÃO DE ANIMAIS
========================================== */

function abrirPet(pet = null) {

    editPet = pet?.id_pet ?? null;

    const formulario = $("form-pet");

    formulario.reset();

    $("titulo-form-pet").textContent = pet
        ? "Editar animal"
        : "Cadastrar animal";

    if (pet) {

        for (const campo of [
            "nome",
            "sexo",
            "data_nascimento",
            "peso"
        ]) {

            formulario.elements[campo].value =
                pet[campo] ?? "";

        }

        const especieSalva = pet.especie ?? "";

        if (
            especieSalva &&
            !Array.from(
                campoEspecie.options
            ).some(opcao => opcao.value === especieSalva)
        ) {

            campoEspecie.add(
                new Option(
                    especieSalva,
                    especieSalva
                )
            );

        }

        campoEspecie.value = especieSalva;

        atualizarRacas(pet.raca ?? "");

    } else {

        atualizarRacas();

    }

    $("dialog-pet").showModal();

}

/* ==========================================
   13. ABRIR CADASTRO / EDIÇÃO DE TUTORES
========================================== */

function abrirTutor(tutor = null) {

    editTutor = tutor?.id_tutor ?? null;

    const formulario = $("form-tutor");

    formulario.reset();

    $("titulo-form-tutor").textContent = tutor
        ? "Editar tutor"
        : "Cadastrar tutor";

    if (tutor) {

        for (const campo of [
            "nome",
            "cpf",
            "email",
            "telefone",
            "endereco"
        ]) {

            formulario.elements[campo].value =
                tutor[campo] ?? "";

        }

    }

    $("dialog-tutor").showModal();

}

/* ==========================================
   14. BOTÕES DE NOVO CADASTRO
========================================== */

$("novo-pet").addEventListener("click", () => {

    abrirPet();

});

$("novo-tutor").addEventListener("click", () => {

    abrirTutor();

});


/* ==========================================
   15. SALVAR ANIMAL
========================================== */

$("form-pet").addEventListener("submit", async evento => {

    evento.preventDefault();

    const formulario = evento.currentTarget;

    const pet = {

        nome: formulario.elements.nome.value.trim(),

        especie: formulario.elements.especie.value.trim(),

        raca:
            formulario.elements.raca.value.trim() || null,

        sexo: formulario.elements.sexo.value,

        data_nascimento:
            formulario.elements.data_nascimento.value || null,

        peso:
            formulario.elements.peso.value === ""
                ? null
                : Number(formulario.elements.peso.value)

    };

    const botaoSalvar = formulario.querySelector(
        '[type="submit"]'
    );

    botaoSalvar.disabled = true;

    try {

        
const idPetEditando = editPet;

const resultado = await requisicao(
    idPetEditando ? `/pets/${idPetEditando}` : "/pets",
    json(idPetEditando ? "PUT" : "POST", pet)
);

const idPet = idPetEditando ?? resultado.id_pet;

const arquivoFoto = document.getElementById("foto-pet")?.files[0];

if (arquivoFoto) {
    const dadosFoto = new FormData();
    dadosFoto.append("foto", arquivoFoto);

    await requisicao(`/pets/${idPet}/foto`, {
        method: "POST",
        body: dadosFoto
    });
}


        $("dialog-pet").close();

        aviso("Animal salvo com sucesso!");

        await atualizar();

    } catch (erro) {

        aviso(erro.message);

    } finally {

        botaoSalvar.disabled = false;

    }

});


/* ==========================================
   16. SALVAR TUTOR
========================================== */

$("form-tutor").addEventListener("submit", async evento => {

    evento.preventDefault();

    const formulario = evento.currentTarget;

    const tutor = {

        nome: formulario.elements.nome.value.trim(),

        cpf: formulario.elements.cpf.value.trim(),

        email:
            formulario.elements.email.value.trim() || null,

        telefone:
            formulario.elements.telefone.value.trim(),

        endereco:
            formulario.elements.endereco.value.trim() || null

    };

    const botaoSalvar = formulario.querySelector(
        '[type="submit"]'
    );

    botaoSalvar.disabled = true;

    try {

        await requisicao(
            editTutor
                ? `/tutores/${editTutor}`
                : "/tutores",

            json(
                editTutor ? "PUT" : "POST",
                tutor
            )
        );

        $("dialog-tutor").close();

        aviso("Tutor salvo com sucesso!");

        await atualizar();

    } catch (erro) {

        aviso(erro.message);

    } finally {

        botaoSalvar.disabled = false;

    }

});


/* ==========================================
   17. ABRIR FORMULÁRIO DE VÍNCULOS
========================================== */

$("novo-vinculo").addEventListener("click", () => {

    const selecaoPet = $("selecao-pet");
    const selecaoTutor = $("selecao-tutor");

    selecaoPet.replaceChildren();
    selecaoTutor.replaceChildren();

    for (const pet of pets) {

        selecaoPet.add(
            new Option(
                `${pet.nome} (ID ${pet.id_pet})`,
                pet.id_pet
            )
        );

    }

    for (const tutor of tutores) {

        selecaoTutor.add(
            new Option(
                `${tutor.nome} (ID ${tutor.id_tutor})`,
                tutor.id_tutor
            )
        );

    }

    if (!pets.length || !tutores.length) {

        aviso("Cadastre ao menos um animal e um tutor.");

        return;

    }

    $("form-vinculo").reset();

    $("dialog-vinculo").showModal();

});


/* ==========================================
   18. SALVAR VÍNCULO
========================================== */

$("form-vinculo").addEventListener("submit", async evento => {

    evento.preventDefault();

    const formulario = evento.currentTarget;

    const botaoSalvar = formulario.querySelector(
        '[type="submit"]'
    );

    botaoSalvar.disabled = true;

    try {

        await requisicao(
            "/vinculos",
            json("POST", {

                id_pet: Number(
                    formulario.elements.id_pet.value
                ),

                id_tutor: Number(
                    formulario.elements.id_tutor.value
                ),

                tutor_principal:
                    formulario.elements.tutor_principal.checked

            })
        );

        $("dialog-vinculo").close();

        aviso("Tutor vinculado ao animal!");

        await atualizar();

    } catch (erro) {

        aviso(erro.message);

    } finally {

        botaoSalvar.disabled = false;

    }

});


/* ==========================================
   19. FECHAR FORMULÁRIOS
========================================== */

document.querySelectorAll("[data-fechar]").forEach(botao => {

    botao.addEventListener("click", () => {

        botao.closest("dialog").close();

    });

});


/* ==========================================
   20. NAVEGAÇÃO DO MENU LATERAL
========================================== */

document.querySelectorAll("[data-pagina]").forEach(botao => {

    botao.addEventListener("click", () => {

        document.querySelectorAll("[data-pagina]").forEach(item => {

            item.classList.toggle(
                "ativo",
                item === botao
            );

        });

        document.querySelectorAll(".pagina").forEach(pagina => {

            pagina.hidden =
                pagina.id !== `pagina-${botao.dataset.pagina}`;

        });

        $("titulo-pagina").textContent =
            botao.textContent.trim();

        aviso("");

    });

});


/* ==========================================
   21. ATALHOS DA PÁGINA INICIAL
========================================== */

document.querySelectorAll("[data-ir]").forEach(botao => {

    botao.addEventListener("click", () => {

        document.querySelector(
            `[data-pagina="${botao.dataset.ir}"]`
        )?.click();

    });

});

/* ==========================================
   22. ANIMAÇÃO DE ABERTURA
========================================== */

window.addEventListener("load", () => {

    const abertura = $("abertura");

    if (!abertura) {
        return;
    }

    const movimentoReduzido = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const tempo = movimentoReduzido ? 50 : 1450;

    window.setTimeout(() => {

        abertura.classList.add("subindo");

        window.setTimeout(() => {

            abertura.remove();

        }, 850);

    }, tempo);

});


/* ==========================================
   23. LOGIN E SESSÃO DO FUNCIONÁRIO
========================================== */

let funcionarioAtual = null;


function mostrarLogin() {
    document.body.classList.add("sem-login");

    const telaLogin = $("tela-login");

    if (telaLogin) {
        telaLogin.hidden = false;
    }

    funcionarioAtual = null;

    configurarMenuFuncionarios();
    configurarMenuAdministrativo(null);
    configurarPermissoesInterface(null);
}


async function iniciarSessao() {
    try {
        const funcionario = await requisicao(
            "/auth/me",
            { credentials: "same-origin" }
        );

        funcionarioAtual = funcionario;

        const nomeFuncionario = $("nome-funcionario");

        if (nomeFuncionario) {
            nomeFuncionario.textContent = funcionario.nome;
        }

        // Personalizar dashboard
        personalizarDashboard(funcionario);

        // Configurar menus e permissões
        configurarMenuFuncionarios();
        configurarMenuAdministrativo(funcionario);
        configurarPermissoesInterface(funcionario);

        // Liberar acesso ao sistema
        document.body.classList.remove("sem-login");

        const telaLogin = $("tela-login");

        if (telaLogin) {
            telaLogin.hidden = true;
        }

        // Carregar dados do banco
        await atualizar();

        // Dashboard exclusivo do veterinário
        if (funcionario.perfil === "veterinario") {
            await carregarDashboardVeterinario(
                funcionario
            );
        }

    } catch (erro) {
        console.error(
            "Erro ao iniciar sessão:",
            erro
        );

        mostrarLogin();
    }
}


/* ==========================================
   24. ENTRAR NO SISTEMA
========================================== */

$("form-login").addEventListener("submit", async evento => {

    evento.preventDefault();

    const form = evento.currentTarget;

    const botao = form.querySelector(
        'button[type="submit"]'
    );

    $("erro-login").textContent = "";

    botao.disabled = true;

    try {

        await requisicao("/auth/login", {

            method: "POST",

            credentials: "same-origin",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                email: form.elements.email.value.trim(),

                senha: form.elements.senha.value

            })

        });

        form.elements.senha.value = "";

        await iniciarSessao();

    } catch (erro) {

        $("erro-login").textContent = erro.message;

    } finally {

        botao.disabled = false;

    }

});


/* ==========================================
   25. SAIR DO SISTEMA
========================================== */

$("botao-sair").addEventListener("click", async () => {

    try {

        await requisicao("/auth/logout", {

            method: "POST",

            credentials: "same-origin"

        });

    } catch (erro) {

        aviso(
            "Não foi possível encerrar a sessão: " +
            erro.message
        );

        return;

    }

    pets = [];
    tutores = [];
    vinculos = [];

    mostrarLogin();

});


/* ==========================================
   26. INICIAR SESSÃO
========================================== */

iniciarSessao();


/* ==========================================
   27. CADASTRO DE FUNCIONÁRIOS
========================================== */

const dialogCadastroFuncionario =
    document.getElementById("dialog-cadastro-funcionario");

const botaoAbrirCadastro =
    document.getElementById("abrir-cadastro-funcionario");

const botaoCancelarCadastro =
    document.getElementById("cancelar-cadastro-funcionario");


/* ==========================================
   28. ABRIR E FECHAR CADASTRO
========================================== */

botaoAbrirCadastro?.addEventListener("click", () => {

    dialogCadastroFuncionario?.showModal();

});

botaoCancelarCadastro?.addEventListener("click", () => {

    dialogCadastroFuncionario?.close();

});


/* ==========================================
   29. ENVIAR CADASTRO DE FUNCIONÁRIO
========================================== */

document.getElementById("form-cadastro-funcionario")
?.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    const formulario = evento.currentTarget;

    const dados = new FormData(formulario);

    const erro = document.getElementById(
        "erro-cadastro-funcionario"
    );

    const senha = dados.get("senha");

    const confirmarSenha = dados.get("confirmar_senha");

    erro.textContent = "";

    if (senha !== confirmarSenha) {

        erro.textContent = "As senhas não coincidem.";

        return;

    }

    const funcionario = {
        nome: dados.get("nome")?.trim(),
        cpf: dados.get("cpf")?.trim(),
        email: dados.get("email")?.trim(),
        telefone: dados.get("telefone")?.trim() || null,
        senha: senha,
        perfil: dados.get("perfil") || "atendente",
        crmv: dados.get("perfil") === "veterinario"
            ? dados.get("crmv")?.trim()
            : null
    };

    const botaoSalvar = formulario.querySelector(
        'button[type="submit"]'
    );

    botaoSalvar.disabled = true;

    try {

        const resposta = await fetch(
            "/auth/solicitar-cadastro",
            {

                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(funcionario)

            }
        );

        const resultado = await resposta.json()
            .catch(() => ({}));

        if (!resposta.ok) {

            erro.textContent =
                typeof resultado.detail === "string"
                    ? resultado.detail
                    : "Não foi possível enviar o cadastro.";

            return;

        }

        alert(
            "Solicitação enviada com sucesso!\n" +
            "Aguarde a aprovação do administrador."
        );

        formulario.reset();

        dialogCadastroFuncionario.close();

    } catch (erroConexao) {

        erro.textContent =
            "Erro de conexão com o servidor.";

        console.error(erroConexao);

    } finally {

        botaoSalvar.disabled = false;

    }

});

/* ==========================================
   30. MÓDULO DE CONSULTAS VETERINÁRIAS
========================================== */

let consultas = [];

let veterinarios = [];

let editConsulta = null;

const campoConsulta = id => document.getElementById(id);


/* ==========================================
   31. MENSAGENS DE CONSULTAS
========================================== */

function mensagemConsulta(mensagem) {

    const elemento = campoConsulta("erro-consulta");

    if (elemento) {

        elemento.textContent = mensagem;

    }

}


/* ==========================================
   32. PREENCHER CAMPOS DE SELEÇÃO
========================================== */

function preencherSelectConsulta(
    id,
    registros,
    campoId,
    campoNome
) {

    const select = campoConsulta(id);

    if (!select) {
        return;
    }

    select.replaceChildren(
        new Option("Selecione uma opção", "")
    );

    registros.forEach(registro => {

        select.add(
            new Option(
                registro[campoNome],
                registro[campoId]
            )
        );

    });

}


/* ==========================================
   33. CARREGAR CONSULTAS DO BANCO
========================================== */

async function carregarConsultas() {

    try {

        consultas = await requisicao("/consultas");

        desenharConsultas();

    } catch (erro) {

        aviso(
            "Erro ao carregar consultas: " +
            erro.message
        );

    }

}


/* ==========================================
   34. EXIBIR CONSULTAS NA TABELA
========================================== */

function desenharConsultas() {
    const tabela = campoConsulta("lista-consultas");

    if (!tabela) return;

    tabela.replaceChildren();

    const perfil = funcionarioAtual?.perfil;
    const veterinario = perfil === "veterinario";

    const idFuncionario = Number(
        funcionarioAtual?.id_funcionario
    );

    if (consultas.length === 0) {
        const linha = tabela.insertRow();
        const td = linha.insertCell();

        td.colSpan = 7;
        td.textContent = "Nenhuma consulta cadastrada.";
        return;
    }

    const nomesStatus = {
        agendada: "Agendada",
        em_atendimento: "Em atendimento",
        concluida: "Concluída",
        cancelada: "Cancelada"
    };

    consultas.forEach(consulta => {
        const linha = tabela.insertRow();

        linha.dataset.consultaId =
            consulta.id_consulta;

        const data = String(
            consulta.data_consulta
        ).slice(0, 10);

        const partes = data.split("-");

        const dataFormatada = partes.length === 3
            ? `${partes[2]}/${partes[1]}/${partes[0]}`
            : data;

        [
            consulta.pet_nome,
            consulta.tutor_nome,
            consulta.veterinario_nome,
            dataFormatada,
            consulta.horario,
            nomesStatus[consulta.status_consulta] ||
                consulta.status_consulta
        ].forEach(valor => celula(linha, valor));

        const acoes = linha.insertCell();

        const consultaDoVeterinario =
            veterinario &&
            Number(consulta.id_veterinario) ===
                idFuncionario;

        if (consulta.status_consulta === "agendada") {
            // Edição de agendamento
            botao(
                acoes,
                "Editar",
                () => abrirConsulta(consulta),
                "suave"
            );

            // Somente o veterinário responsável
            // pode iniciar o atendimento
            if (consultaDoVeterinario) {
                botao(
                    acoes,
                    "Iniciar",
                    () => alterarStatusConsulta(
                        consulta.id_consulta,
                        "em_atendimento"
                    ),
                    "suave"
                );
            }

            // Cancelamento de agendamento
            botao(
                acoes,
                "Cancelar",
                () => cancelarConsulta(consulta),
                "perigo"
            );
        }

        if (
            consulta.status_consulta ===
                "em_atendimento" &&
            consultaDoVeterinario
        ) {
            botao(
                acoes,
                "Atendimento",
                () => registrarAtendimentoConsulta(
                    consulta
                ),
                "suave"
            );
        }
    });
}


/* ==========================================
   35. CARREGAR DADOS PARA AGENDAMENTO
========================================== */

async function carregarDadosConsulta() {

    const [listaPets, listaTutores, listaVinculos, listaVeterinarios] =
        await Promise.all([
            requisicao("/pets"),
            requisicao("/tutores"),
            requisicao("/vinculos"),
            requisicao("/veterinarios")
        ]);

    pets = listaPets;
    tutores = listaTutores.tutores;
    vinculos = listaVinculos;
    veterinarios = listaVeterinarios.filter(
        veterinario => veterinario.crmv
    );

    preencherSelectConsulta(
        "consulta-pet",
        pets,
        "id_pet",
        "nome"
    );

    preencherSelectConsulta(
        "consulta-veterinario",
        veterinarios,
        "id_funcionario",
        "nome"
    );

}


/* ==========================================
   36. ATUALIZAR TUTORES DO ANIMAL
========================================== */

function atualizarTutoresConsulta() {

    const idPet = Number(
        campoConsulta("consulta-pet").value
    );

    const tutoresDoAnimal = vinculos
        .filter(vinculo => Number(vinculo.id_pet) === idPet)
        .map(vinculo => {

            return tutores.find(
                tutor =>
                    Number(tutor.id_tutor) ===
                    Number(vinculo.id_tutor)
            );

        })
        .filter(Boolean);

    preencherSelectConsulta(
        "consulta-tutor",
        tutoresDoAnimal,
        "id_tutor",
        "nome"
    );

}


/* ==========================================
   37. ABRIR FORMULÁRIO DE CONSULTA
========================================== */

async function abrirConsulta(consulta = null) {

    const dialog = campoConsulta("dialog-consulta");
    const formulario = campoConsulta("form-consulta");

    if (!dialog || !formulario) {
        aviso("Formulário de consultas não encontrado.");
        return;
    }

    try {

        await carregarDadosConsulta();

        editConsulta = consulta?.id_consulta ?? null;

        formulario.reset();

        mensagemConsulta("");

        campoConsulta("titulo-form-consulta").textContent =
            consulta
                ? "Editar consulta"
                : "Agendar consulta";

        if (consulta) {

            campoConsulta("consulta-pet").value =
                String(consulta.id_pet);

            atualizarTutoresConsulta();

            campoConsulta("consulta-tutor").value =
                String(consulta.id_tutor);

            campoConsulta("consulta-veterinario").value =
                String(consulta.id_veterinario);

            formulario.elements.data_consulta.value =
                String(consulta.data_consulta).slice(0, 10);

            formulario.elements.horario.value =
                String(consulta.horario).slice(0, 5);

            formulario.elements.motivo.value =
                consulta.motivo ?? "";

            formulario.elements.observacoes.value =
                consulta.observacoes ?? "";

        }

        dialog.showModal();

    } catch (erro) {

        aviso(
            "Erro ao abrir consulta: " +
            erro.message
        );

    }

}


/* ==========================================
   38. BOTÃO DE NOVA CONSULTA
========================================== */

campoConsulta("nova-consulta")
    ?.addEventListener("click", () => {

        abrirConsulta();

    });


/* ==========================================
   39. ALTERAR ANIMAL DA CONSULTA
========================================== */

campoConsulta("consulta-pet")
    ?.addEventListener("change", () => {

        atualizarTutoresConsulta();

    });


/* ==========================================
   40. CANCELAR FORMULÁRIO
========================================== */

campoConsulta("cancelar-form-consulta")
    ?.addEventListener("click", () => {

        campoConsulta("dialog-consulta").close();

    });


/* ==========================================
   41. SALVAR AGENDAMENTO OU EDIÇÃO
========================================== */

campoConsulta("form-consulta")
    ?.addEventListener("submit", async evento => {

        evento.preventDefault();

        const formulario = evento.currentTarget;

        const botaoSalvar = formulario.querySelector(
            '[type="submit"]'
        );

        mensagemConsulta("");

        const dados = {

            id_pet: Number(
                formulario.elements.id_pet.value
            ),

            id_tutor: Number(
                formulario.elements.id_tutor.value
            ),

            id_veterinario: Number(
                formulario.elements.id_veterinario.value
            ),

            data_consulta:
                formulario.elements.data_consulta.value,

            horario:
                formulario.elements.horario.value,

            motivo:
                formulario.elements.motivo.value.trim(),

            observacoes:
                formulario.elements.observacoes.value.trim() ||
                null

        };

        botaoSalvar.disabled = true;

        try {

            const url = editConsulta
                ? `/consultas/${editConsulta}`
                : "/consultas";

            const metodo = editConsulta
                ? "PUT"
                : "POST";

            await requisicao(
                url,
                json(metodo, dados)
            );

            campoConsulta("dialog-consulta").close();

            aviso(
                editConsulta
                    ? "Consulta atualizada com sucesso!"
                    : "Consulta agendada com sucesso!"
            );

            editConsulta = null;

            await carregarConsultas();

        } catch (erro) {

            mensagemConsulta(erro.message);

        } finally {

            botaoSalvar.disabled = false;

        }

    });


/* ==========================================
   42. ALTERAR STATUS DA CONSULTA
========================================== */

async function alterarStatusConsulta(idConsulta, novoStatus) {

    const mensagens = {

        em_atendimento:
            "Deseja iniciar o atendimento desta consulta?",

        concluida:
            "Deseja concluir esta consulta?",

        cancelada:
            "Deseja cancelar esta consulta?"

    };

    if (!confirm(mensagens[novoStatus] ||
        "Deseja alterar o status desta consulta?")) {

        return;

    }

    try {

        await requisicao(
            `/consultas/${idConsulta}/status`,
            json("PUT", {
                status_consulta: novoStatus
            })
        );

        aviso("Status da consulta atualizado!");

        await carregarConsultas();

    } catch (erro) {

        aviso(
            "Erro ao atualizar consulta: " +
            erro.message
        );

    }

}


/* ==========================================
   43. REGISTRAR ATENDIMENTO VETERINÁRIO
========================================== */

async function registrarAtendimentoConsulta(consulta) {

    if (consulta.status_consulta !== "em_atendimento") {

        aviso(
            "A consulta precisa estar em atendimento."
        );

        return;

    }

    const observacoes = prompt(
        "Observações do atendimento:",
        consulta.observacoes ?? ""
    );

    if (observacoes === null) {
        return;
    }

    const diagnostico = prompt(
        "Diagnóstico veterinário:",
        consulta.diagnostico ?? ""
    );

    if (diagnostico === null) {
        return;
    }

    const orientacoes = prompt(
        "Orientações e recomendações:",
        consulta.orientacoes ?? ""
    );

    if (orientacoes === null) {
        return;
    }

    try {

        await requisicao(
            `/consultas/${consulta.id_consulta}/atendimento`,
            json("PUT", {

                observacoes: observacoes.trim(),

                diagnostico: diagnostico.trim(),

                orientacoes: orientacoes.trim()

            })
        );

        aviso("Atendimento registrado com sucesso!");

        const concluir = confirm(
            "Atendimento salvo! Deseja concluir a consulta?"
        );

        if (concluir) {

            await requisicao(
                `/consultas/${consulta.id_consulta}/status`,
                json("PUT", {
                    status_consulta: "concluida"
                })
            );

            aviso("Consulta concluída com sucesso!");

        }

        await carregarConsultas();

    } catch (erro) {

        aviso(
            "Erro ao registrar atendimento: " +
            erro.message
        );

    }

}


/* ==========================================
   44. CANCELAR CONSULTA
========================================== */

async function cancelarConsulta(consulta) {

    const confirmar = confirm(
        `Deseja cancelar a consulta de ${consulta.pet_nome}?`
    );

    if (!confirmar) {
        return;
    }

    try {

        await requisicao(
            `/consultas/${consulta.id_consulta}`,
            {
                method: "DELETE"
            }
        );

        aviso("Consulta cancelada com sucesso!");

        await carregarConsultas();

    } catch (erro) {

        aviso(
            "Erro ao cancelar consulta: " +
            erro.message
        );

    }

}


/* ==========================================
   45. CARREGAR CONSULTAS AO ABRIR A PÁGINA
========================================== */

document.querySelector(
    '[data-pagina="consultas"]'
)?.addEventListener("click", () => {

    carregarConsultas();

});

/* ==========================================
   46. VET CARE - PRONTUÁRIOS VETERINÁRIOS
========================================== */

let prontuarioAtual = null;

/* ==========================================
   47. ELEMENTOS DO PRONTUÁRIO
========================================== */

const campoProntuario = id =>
    document.getElementById(id);

function mensagemProntuario(mensagem) {

    const elemento = campoProntuario(
        "erro-prontuario"
    );

    if (elemento) {
        elemento.textContent = mensagem;
    }

}

/* ==========================================
   48. FORMATAR DATA
========================================== */

function formatarDataProntuario(data) {

    if (!data) {
        return "—";
    }

    const valor = String(data).slice(0, 10);

    const partes = valor.split("-");

    if (partes.length !== 3) {
        return valor;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}

/* ==========================================
   49. CARREGAR ANIMAIS NO SELECT
========================================== */

async function carregarAnimaisProntuario() {

    const select = campoProntuario(
        "prontuario-pet"
    );

    if (!select) {
        return;
    }

    mensagemProntuario("");

    try {

        const animais = await requisicao("/pets");

        const animalSelecionado = select.value;

        select.replaceChildren(
            new Option("Selecione um animal", "")
        );

        animais.forEach(animal => {

            select.add(
                new Option(
                    `${animal.nome} - ${animal.especie} (ID ${animal.id_pet})`,
                    animal.id_pet
                )
            );

        });

        if (
            animalSelecionado &&
            animais.some(
                animal =>
                    String(animal.id_pet) ===
                    animalSelecionado
            )
        ) {

            select.value = animalSelecionado;

        }

        if (animais.length === 0) {

            mensagemProntuario(
                "Nenhum animal cadastrado."
            );

        }

    } catch (erro) {

        mensagemProntuario(
            "Erro ao carregar animais: " +
            erro.message
        );

    }

}

/* ==========================================
   50. CONSULTAR PRONTUÁRIO NO FASTAPI
========================================== */

async function buscarProntuario() {

    const select = campoProntuario(
        "prontuario-pet"
    );

    const dados = campoProntuario(
        "dados-prontuario"
    );

    const botaoBuscar = campoProntuario(
        "buscar-prontuario"
    );

    if (!select || !dados || !botaoBuscar) {
        return;
    }

    const idPet = select.value;

    mensagemProntuario("");

    dados.hidden = true;

    prontuarioAtual = null;

    if (!idPet) {

        mensagemProntuario(
            "Selecione um animal para consultar."
        );

        return;

    }

    botaoBuscar.disabled = true;

    botaoBuscar.textContent = "Consultando...";

    try {

        const prontuario = await requisicao(
            `/pets/${encodeURIComponent(idPet)}/prontuario`
        );

        prontuarioAtual = prontuario;

        mostrarDadosProntuario(
            prontuario.animal
        );

        desenharHistoricoProntuario(
            prontuario.historico || []
        );

        dados.hidden = false;

    } catch (erro) {

        mensagemProntuario(
            "Não foi possível consultar o prontuário: " +
            erro.message
        );

    } finally {

        botaoBuscar.disabled = false;

        botaoBuscar.textContent =
            "Consultar prontuário";

    }

}

/* ==========================================
   51. MOSTRAR DADOS DO ANIMAL
========================================== */

function mostrarDadosProntuario(animal) {

    if (!animal) {
        return;
    }

    const nome = campoProntuario(
        "prontuario-nome"
    );

    const especie = campoProntuario(
        "prontuario-especie"
    );

    const raca = campoProntuario(
        "prontuario-raca"
    );

    if (nome) {
        nome.textContent = animal.nome || "—";
    }

    if (especie) {
        especie.textContent =
            animal.especie || "—";
    }

    if (raca) {
        raca.textContent = animal.raca || "—";
    }

}

/* ==========================================
   52. MOSTRAR HISTÓRICO DE CONSULTAS
========================================== */

function desenharHistoricoProntuario(historico) {

    const tabela = campoProntuario(
        "lista-prontuario"
    );

    if (!tabela) {
        return;
    }

    tabela.replaceChildren();

    if (!historico.length) {

        const linha = tabela.insertRow();

        const td = linha.insertCell();

        td.colSpan = 6;

        td.textContent =
            "Este animal ainda não possui consultas registradas.";

        return;

    }

    const statusTraduzido = {

        agendada: "Agendada",

        em_atendimento: "Em atendimento",

        concluida: "Concluída",

        cancelada: "Cancelada"

    };

    historico.forEach(consulta => {

        const linha = tabela.insertRow();

        const data = formatarDataProntuario(
            consulta.data_consulta
        );

        const horario = consulta.horario
            ? String(consulta.horario).slice(0, 5)
            : "";

        [
            horario ? `${data} às ${horario}` : data,
            consulta.veterinario_nome,
            consulta.motivo,
            consulta.diagnostico || "Não registrado",
            statusTraduzido[consulta.status_consulta] ||
                consulta.status_consulta
        ].forEach(valor => {

            celula(linha, valor);

        });

        const acoes = linha.insertCell();

        botao(
            acoes,
            "Ver detalhes",
            () => mostrarDetalhesProntuario(
                consulta
            ),
            "suave"
        );

    });

}

/* ==========================================
   53. MOSTRAR DETALHES DO ATENDIMENTO
========================================== */

function mostrarDetalhesProntuario(consulta) {

    const dialogExistente = document.getElementById(
        "dialog-detalhes-prontuario"
    );

    if (dialogExistente) {
        dialogExistente.remove();
    }

    const dialog = document.createElement("dialog");

    dialog.id = "dialog-detalhes-prontuario";

    dialog.className = "dialog-prontuario";

    const container = document.createElement("div");

    container.style.padding = "24px";
    container.style.maxWidth = "600px";

    const titulo = document.createElement("h2");

    titulo.textContent = "Detalhes do atendimento";

    container.appendChild(titulo);

    const campos = [

        [
            "Data",
            formatarDataProntuario(
                consulta.data_consulta
            )
        ],

        [
            "Horário",
            consulta.horario
        ],

        [
            "Veterinário",
            consulta.veterinario_nome
        ],

        [
            "CRMV",
            consulta.crmv
        ],

        [
            "Motivo",
            consulta.motivo
        ],

        [
            "Observações",
            consulta.observacoes
        ],

        [
            "Diagnóstico",
            consulta.diagnostico
        ],

        [
            "Orientações",
            consulta.orientacoes
        ]

    ];

    campos.forEach(([rotulo, valor]) => {

        const bloco = document.createElement("div");

        bloco.style.marginBottom = "14px";

        const label = document.createElement("strong");

        label.textContent = rotulo + ":";

        const texto = document.createElement("p");

        texto.textContent =
            valor || "Não informado";

        texto.style.whiteSpace = "pre-wrap";

        texto.style.marginTop = "4px";

        bloco.appendChild(label);

        bloco.appendChild(texto);

        container.appendChild(bloco);

    });

    const botaoFechar = document.createElement(
        "button"
    );

    botaoFechar.type = "button";

    botaoFechar.textContent = "Fechar";

    botaoFechar.addEventListener("click", () => {

        dialog.close();

    });

    container.appendChild(botaoFechar);

    dialog.appendChild(container);

    document.body.appendChild(dialog);

    dialog.addEventListener("close", () => {

        dialog.remove();

    }, { once: true });

    dialog.showModal();

}

/* ==========================================
   54. BOTÃO CONSULTAR PRONTUÁRIO
========================================== */

campoProntuario("buscar-prontuario")
    ?.addEventListener("click", () => {

        buscarProntuario();

    });

/* ==========================================
   55. SELEÇÃO DE ANIMAL
========================================== */

campoProntuario("prontuario-pet")
    ?.addEventListener("change", () => {

        const dados = campoProntuario(
            "dados-prontuario"
        );

        if (dados) {
            dados.hidden = true;
        }

        mensagemProntuario("");

    });

/* ==========================================
   56. ABRIR PÁGINA DE PRONTUÁRIOS
========================================== */

document.querySelector(
    '[data-pagina="prontuarios"]'
)?.addEventListener("click", async () => {

    await carregarAnimaisProntuario();

});

/* ==========================================
   VET CARE - DASHBOARD POR PERFIL
========================================== */

function formatarPrimeiroNome(nomeCompleto) {
    const primeiroNome = String(nomeCompleto || "")
        .trim()
        .split(/\s+/)[0];

    if (!primeiroNome) {
        return "Funcionário";
    }

    return (
        primeiroNome.charAt(0).toUpperCase() +
        primeiroNome.slice(1)
    );
}

function personalizarDashboard(funcionario) {
    if (!funcionario) return;

    const saudacao = $("saudacao-funcionario");
    const cargo = $("cargo-funcionario");

    const nome = formatarPrimeiroNome(
        funcionario.nome
    );

    const perfil = funcionario.perfil;

    // Remover dashboard clínico anterior
    const painelAnterior = $(
        "dashboard-veterinario"
    );

    if (painelAnterior) {
        painelAnterior.remove();
    }

    if (perfil === "veterinario") {

        if (saudacao) {
            saudacao.textContent =
                `Seja bem-vindo, Dr. ${nome}!`;
        }

        if (cargo) {
            cargo.textContent =
                "Veterinário. Acompanhe seus pacientes, " +
                "consultas e prontuários em um só lugar.";
        }

        criarDashboardVeterinario();

    } else if (perfil === "administrador") {

        if (saudacao) {
            saudacao.textContent =
                `Olá, ${nome}!`;
        }

        if (cargo) {
            cargo.textContent =
                "Administrador. Gerencie os pacientes, " +
                "funcionários e atendimentos da clínica.";
        }

    } else if (perfil === "atendente") {

        if (saudacao) {
            saudacao.textContent =
                `Olá, ${nome}!`;
        }

        if (cargo) {
            cargo.textContent =
                "Atendente. Organize os cadastros, " +
                "agendamentos e responsáveis.";
        }

    } else {

        if (saudacao) {
            saudacao.textContent =
                `Olá, ${nome}!`;
        }

        if (cargo) {
            cargo.textContent =
                funcionario.cargo || "Funcionário";
        }
    }
}

/* ==========================================
   CRIAR DASHBOARD DO VETERINÁRIO
========================================== */

function criarDashboardVeterinario() {

    const paginaInicio = $("pagina-dashboard");

    if (!paginaInicio) {
        console.warn(
            "Página inicial não encontrada."
        );
        return;
    }

    const painel = document.createElement("section");

    painel.id = "dashboard-veterinario";

    painel.style.cssText = `
        margin-top: 28px;
        padding: 26px;
        background: #ffffff;
        border: 1px solid #e3eae5;
        border-radius: 18px;
        box-shadow: 0 8px 24px rgba(8,78,84,.05);
    `;

    const titulo = document.createElement("h2");

    titulo.textContent = "Meu painel clínico";

    titulo.style.cssText = `
        color: #084E54;
        font-size: 23px;
        margin: 0 0 8px;
    `;

    const descricao = document.createElement("p");

    descricao.textContent =
        "Acompanhe os atendimentos atribuídos a você.";

    descricao.style.cssText = `
        color: #708780;
        font-size: 14px;
        margin-bottom: 24px;
    `;

    painel.appendChild(titulo);
    painel.appendChild(descricao);

    const indicadores = document.createElement("div");

    indicadores.style.cssText = `
        display: grid;
        grid-template-columns:
            repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
    `;

    const cards = [
        {
            id: "vet-consultas-hoje",
            titulo: "Consultas de hoje",
            icone: "📅"
        },
        {
            id: "vet-em-atendimento",
            titulo: "Em atendimento",
            icone: "🩺"
        },
        {
            id: "vet-concluidas",
            titulo: "Consultas concluídas",
            icone: "✓"
        }
    ];

    cards.forEach(card => {

        const elemento = document.createElement("div");

        elemento.style.cssText = `
            background: #f6f9f6;
            border: 1px solid #e2ebe5;
            border-radius: 14px;
            padding: 20px;
        `;

        const icone = document.createElement("div");

        icone.textContent = card.icone;
        icone.style.fontSize = "24px";

        const nome = document.createElement("p");

        nome.textContent = card.titulo;

        nome.style.cssText = `
            color: #63817B;
            font-size: 13px;
            margin: 12px 0 8px;
        `;

        const numero = document.createElement("strong");

        numero.id = card.id;
        numero.textContent = "—";

        numero.style.cssText = `
            color: #084E54;
            font-size: 30px;
        `;

        elemento.appendChild(icone);
        elemento.appendChild(nome);
        elemento.appendChild(numero);

        indicadores.appendChild(elemento);
    });

    painel.appendChild(indicadores);

    const areaAgenda = document.createElement("div");

    areaAgenda.style.marginTop = "28px";

    const tituloAgenda = document.createElement("h3");

    tituloAgenda.textContent =
        "Minha agenda de atendimentos";

    tituloAgenda.style.cssText = `
        color: #084E54;
        margin-bottom: 14px;
    `;

    const listaAgenda = document.createElement("div");

    listaAgenda.id = "vet-lista-agenda";

    listaAgenda.textContent =
        "Carregando seus atendimentos...";

    listaAgenda.style.cssText = `
        color: #63817B;
        font-size: 14px;
    `;

    areaAgenda.appendChild(tituloAgenda);
    areaAgenda.appendChild(listaAgenda);

    painel.appendChild(areaAgenda);

    paginaInicio.appendChild(painel);
}

/* ==========================================
   CARREGAR DADOS CLÍNICOS
========================================== */

async function carregarDashboardVeterinario(
    funcionario
) {
    if (funcionario.perfil !== "veterinario") {
        return;
    }

    const agenda = $("vet-lista-agenda");

    try {
        const todasConsultas = await requisicao(
            "/consultas"
        );

        if (!Array.isArray(todasConsultas)) {
            throw new Error(
                "Formato de consultas inesperado."
            );
        }

        const idVeterinario = Number(
            funcionario.id_funcionario
        );

        const minhasConsultas = todasConsultas.filter(
            consulta =>
                Number(consulta.id_veterinario) ===
                idVeterinario
        );

        const hoje = new Date();

        const ano = hoje.getFullYear();

        const mes = String(
            hoje.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            hoje.getDate()
        ).padStart(2, "0");

        const dataHoje = `${ano}-${mes}-${dia}`;

        const consultasHoje = minhasConsultas.filter(
            consulta =>
                String(consulta.data_consulta).slice(0, 10) ===
                dataHoje
        );

        const emAtendimento = minhasConsultas.filter(
            consulta =>
                consulta.status_consulta === "em_atendimento"
        );

        const concluidas = minhasConsultas.filter(
            consulta =>
                consulta.status_consulta === "concluida"
        );

        const totalHoje = $("vet-consultas-hoje");
        const totalAtendimento = $("vet-em-atendimento");
        const totalConcluidas = $("vet-concluidas");

        if (totalHoje) {
            totalHoje.textContent = consultasHoje.length;
        }

        if (totalAtendimento) {
            totalAtendimento.textContent = emAtendimento.length;
        }

        if (totalConcluidas) {
            totalConcluidas.textContent = concluidas.length;
        }

        if (!agenda) {
            return;
        }

        agenda.replaceChildren();

        const proximasConsultas = minhasConsultas
            .filter(consulta =>
                String(consulta.data_consulta).slice(0, 10) >=
                dataHoje &&
                consulta.status_consulta !== "cancelada" &&
                consulta.status_consulta !== "concluida"
            )
            .sort((a, b) =>
                `${a.data_consulta} ${a.horario}`.localeCompare(
                    `${b.data_consulta} ${b.horario}`
                )
            )
            .slice(0, 5);

        if (!proximasConsultas.length) {
            agenda.textContent =
                "Nenhuma consulta futura encontrada.";
            return;
        }

        proximasConsultas.forEach(consulta => {
            const item = document.createElement("div");

            item.style.cssText = `
                padding: 12px 0;
                border-bottom: 1px solid #e3eae5;
            `;

            const data = formatarDataProntuario(
                consulta.data_consulta
            );

            item.textContent =
                `${data} às ${String(consulta.horario).slice(0, 5)} — ` +
                `${consulta.pet_nome} (${consulta.motivo})`;

            agenda.appendChild(item);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar dashboard veterinário:",
            erro
        );

        if (agenda) {
            agenda.textContent =
                "Não foi possível carregar a agenda.";
        }
    }
}

/* ==========================================
   CADASTRO - SELEÇÃO DE PERFIL E CRMV
========================================== */

const seletorPerfilCadastro = $("cadastro-perfil");
const campoCrmvCadastro = $("campo-cadastro-crmv");
const entradaCrmvCadastro = $("cadastro-crmv");

function atualizarCampoCrmvCadastro() {
    const ehVeterinario =
        seletorPerfilCadastro?.value === "veterinario";

    if (campoCrmvCadastro) {
        campoCrmvCadastro.hidden = !ehVeterinario;
    }

    if (entradaCrmvCadastro) {
        entradaCrmvCadastro.disabled = !ehVeterinario;
        entradaCrmvCadastro.required = ehVeterinario;

        if (!ehVeterinario) {
            entradaCrmvCadastro.value = "";
        }
    }
}

seletorPerfilCadastro?.addEventListener(
    "change",
    atualizarCampoCrmvCadastro
);

atualizarCampoCrmvCadastro();

$("form-cadastro-funcionario")?.addEventListener(
    "reset",
    () => {
        queueMicrotask(atualizarCampoCrmvCadastro);
    }
);

/* ==========================================
   SOLICITAÇÕES - ADMINISTRADOR
========================================== */

function configurarMenuAdministrativo(funcionario) {
    const ehAdmin =
        funcionario?.perfil === "administrador";

    const menu = $("menu-solicitacoes");

    if (menu) {
        menu.hidden = !ehAdmin;
    }

    if (
        !ehAdmin &&
        !$("pagina-solicitacoes")?.hidden
    ) {
        document.querySelector(
            '[data-pagina="dashboard"]'
        )?.click();
    }
}


/* ==========================================
   LISTAR SOLICITAÇÕES PENDENTES
========================================== */

async function carregarSolicitacoesCadastro() {
    const tabela = $("lista-solicitacoes");
    const erro = $("erro-solicitacoes");

    if (
        !tabela ||
        funcionarioAtual?.perfil !== "administrador"
    ) {
        return;
    }

    if (erro) {
        erro.textContent = "";
    }

    tabela.replaceChildren();

    const linhaEspera = tabela.insertRow();
    const celulaEspera = linhaEspera.insertCell();

    celulaEspera.colSpan = 8;
    celulaEspera.textContent =
        "Carregando solicitações...";

    try {
        const solicitacoes = await requisicao(
            "/auth/solicitacoes",
            { credentials: "same-origin" }
        );

        tabela.replaceChildren();

        if (
            !Array.isArray(solicitacoes) ||
            solicitacoes.length === 0
        ) {
            const linha = tabela.insertRow();
            const td = linha.insertCell();

            td.colSpan = 8;
            td.textContent =
                "Nenhuma solicitação pendente.";

            return;
        }

        for (const solicitacao of solicitacoes) {
            const linha = tabela.insertRow();

            const data = solicitacao.criado_em
                ? new Date(
                    solicitacao.criado_em
                ).toLocaleDateString("pt-BR")
                : "—";

            [
                solicitacao.nome,
                solicitacao.perfil === "veterinario"
                    ? "Veterinário"
                    : "Atendente",
                solicitacao.email,
                solicitacao.cpf,
                solicitacao.telefone,
                solicitacao.crmv,
                data
            ].forEach(valor => celula(linha, valor));

            const acoes = linha.insertCell();

            botao(
                acoes,
                "Aprovar",
                () => decidirSolicitacao(
                    solicitacao,
                    true
                ),
                "suave"
            );

            botao(
                acoes,
                "Rejeitar",
                () => decidirSolicitacao(
                    solicitacao,
                    false
                ),
                "perigo"
            );
        }

    } catch (erroRequisicao) {
        tabela.replaceChildren();

        if (erro) {
            erro.textContent =
                "Erro ao carregar solicitações: " +
                erroRequisicao.message;
        }
    }
}


/* ==========================================
   APROVAR OU REJEITAR CADASTRO
========================================== */

async function decidirSolicitacao(
    solicitacao,
    aprovar
) {
    if (
        funcionarioAtual?.perfil !== "administrador"
    ) {
        return;
    }

    const verbo = aprovar ? "aprovar" : "rejeitar";

    const confirmar = confirm(
        `Deseja ${verbo} o cadastro de ${solicitacao.nome}?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const url =
            `/auth/solicitacoes/${encodeURIComponent(
                solicitacao.id_funcionario
            )}` +
            (aprovar ? "/aprovar" : "");

        await requisicao(url, {
            method: aprovar ? "PUT" : "DELETE",
            credentials: "same-origin"
        });

        aviso(
            aprovar
                ? "Cadastro aprovado com sucesso!"
                : "Solicitação rejeitada."
        );

        await carregarSolicitacoesCadastro();

    } catch (erroRequisicao) {
        const erro = $("erro-solicitacoes");

        if (erro) {
            erro.textContent = erroRequisicao.message;
        }
    }
}


/* ==========================================
   EVENTOS DO PAINEL ADMINISTRATIVO
========================================== */

document.querySelector(
    '[data-pagina="solicitacoes"]'
)?.addEventListener(
    "click",
    carregarSolicitacoesCadastro
);

$("atualizar-solicitacoes")?.addEventListener(
    "click",
    carregarSolicitacoesCadastro
);


/* ==========================================
   GERENCIAMENTO DE FUNCIONÁRIOS
========================================== */

let listaFuncionariosAdmin = [];

function configurarMenuFuncionarios() {
    const menu = $("menu-funcionarios");

    if (!menu) return;

    menu.hidden =
        funcionarioAtual?.perfil !== "administrador";
}

async function carregarFuncionariosAdmin() {
    if (funcionarioAtual?.perfil !== "administrador") {
        return;
    }

    const erro = $("erro-funcionarios");
    erro.textContent = "";

    try {
        listaFuncionariosAdmin = await requisicao(
            "/auth/funcionarios",
            { credentials: "same-origin" }
        );

        desenharFuncionariosAdmin();

    } catch (e) {
        erro.textContent = e.message;
    }
}

function desenharFuncionariosAdmin() {
    const tabela = $("lista-funcionarios");
    if (!tabela) return;

    tabela.replaceChildren();

    const pesquisa = (
        $("pesquisa-funcionarios")?.value || ""
    ).toLowerCase().trim();

    const filtrados = listaFuncionariosAdmin.filter(f => {
        return (
            f.nome.toLowerCase().includes(pesquisa) ||
            f.email.toLowerCase().includes(pesquisa)
        );
    });

    if (!filtrados.length) {
        const linha = tabela.insertRow();
        const td = linha.insertCell();
        td.colSpan = 6;
        td.textContent = "Nenhum funcionário encontrado.";
        return;
    }

    for (const f of filtrados) {
        const linha = tabela.insertRow();

        celula(linha, f.nome);
        celula(linha, f.email);
        celula(linha, f.perfil);
        celula(linha, f.crmv || "—");

        const situacao = !f.ativo
            ? "Inativo"
            : f.status_cadastro === "aprovado"
                ? "Ativo"
                : f.status_cadastro;

        celula(linha, situacao);

        const acoes = linha.insertCell();

        botao(
            acoes,
            "Editar",
            () => editarFuncionarioAdmin(f),
            "suave"
        );

        if (
            f.perfil !== "administrador" &&
            f.status_cadastro === "aprovado"
        ) {
            botao(
                acoes,
                f.ativo ? "Desativar" : "Ativar",
                () => alternarFuncionarioAdmin(f),
                f.ativo ? "perigo" : "suave"
            );
        }
    }
}

async function editarFuncionarioAdmin(f) {
    const nome = prompt("Nome:", f.nome);
    if (nome === null) return;

    const email = prompt("E-mail:", f.email);
    if (email === null) return;

    const telefone = prompt(
        "Telefone:",
        f.telefone || ""
    );
    if (telefone === null) return;

    let crmv = f.crmv || "";

    if (f.perfil === "veterinario") {
        crmv = prompt("CRMV:", crmv);
        if (crmv === null) return;
    }

    try {
        await requisicao(
            `/auth/funcionarios/${f.id_funcionario}`,
            json("PUT", {
                nome: nome.trim(),
                email: email.trim(),
                telefone: telefone.trim() || null,
                crmv: crmv.trim() || null
            })
        );

        aviso("Funcionário atualizado!");
        await carregarFuncionariosAdmin();

    } catch (e) {
        $("erro-funcionarios").textContent = e.message;
    }
}

async function alternarFuncionarioAdmin(f) {
    const acao = f.ativo ? "desativar" : "ativar";

    if (!confirm(
        `Deseja ${acao} a conta de ${f.nome}?`
    )) {
        return;
    }

    try {
        await requisicao(
            `/auth/funcionarios/${f.id_funcionario}/ativo`,
            { method: "PUT", credentials: "same-origin" }
        );

        aviso("Situação atualizada!");
        await carregarFuncionariosAdmin();

    } catch (e) {
        $("erro-funcionarios").textContent = e.message;
    }
}

$("pesquisa-funcionarios")?.addEventListener(
    "input",
    desenharFuncionariosAdmin
);

$("atualizar-funcionarios")?.addEventListener(
    "click",
    carregarFuncionariosAdmin
);

$("menu-funcionarios")?.addEventListener(
    "click",
    carregarFuncionariosAdmin
);


/* ==========================================
   PERMISSÕES DA INTERFACE - VET CARE
========================================== */

function configurarPermissoesInterface(funcionario) {
    const perfil = funcionario?.perfil;

    const administrador = perfil === "administrador";
    const veterinario = perfil === "veterinario";
    const atendente = perfil === "atendente";

    // Menus exclusivos do administrador
    const menusAdministrativos = [
        "menu-funcionarios",
        "menu-solicitacoes"
    ];

    menusAdministrativos.forEach(id => {
        const menu = document.getElementById(id);

        if (menu) {
            menu.hidden = !administrador;
        }
    });

    // Prontuários: administrador e veterinário
    const menuProntuarios = document.querySelector(
        '[data-pagina="prontuarios"]'
    );

    if (menuProntuarios) {
        menuProntuarios.hidden = !(
            administrador || veterinario
        );
    }

    // Consultas: todos os perfis
    const menuConsultas = document.querySelector(
        '[data-pagina="consultas"]'
    );

    if (menuConsultas) {
        menuConsultas.hidden = !(
            administrador || veterinario || atendente
        );
    }

    // Vacinações: todos podem consultar
    const menuVacinacoes = document.querySelector(
        '[data-pagina="vacinacoes"]'
    );

    if (menuVacinacoes) {
        menuVacinacoes.hidden = !(
            administrador || veterinario || atendente
        );
    }

    // Cadastrar vacinação: administrador e veterinário
    const botaoNovaVacinacao = $("nova-vacinacao");

    if (botaoNovaVacinacao) {
        botaoNovaVacinacao.hidden = !(
            administrador || veterinario
        );
    }

    // Cadastro de animais, tutores e vínculos
    const menusCadastro = [
        "animais",
        "tutores",
        "vinculos"
    ];

    menusCadastro.forEach(pagina => {
        const menu = document.querySelector(
            `[data-pagina="${pagina}"]`
        );

        if (menu) {
            menu.hidden = !(
                administrador || veterinario || atendente
            );
        }
    });

    // Se o usuário estiver em uma página sem permissão,
    // retorna para o dashboard
    const paginaAtual = document.querySelector(
        ".pagina:not([hidden])"
    );

    if (paginaAtual) {
        const nomePagina = paginaAtual.id.replace(
            "pagina-",
            ""
        );

        const menuAtual = document.querySelector(
            `[data-pagina="${nomePagina}"]`
        );

        if (menuAtual?.hidden) {
            document.querySelector(
                '[data-pagina="dashboard"]'
            )?.click();
        }
    }
}

/* ==========================================
   57. VACINAÇÕES — CONTROLE DE EDIÇÃO
========================================== */

let idVacinacaoEmEdicao = null;


/* ==========================================
   58. VACINAÇÕES — FUNÇÕES AUXILIARES
========================================== */

function formatarDataVacinacao(data) {
    if (!data) {
        return "—";
    }

    const valor = String(data).slice(0, 10);
    const partes = valor.split("-");

    if (partes.length !== 3) {
        return valor;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function dataParaCampoVacinacao(data) {
    if (!data) {
        return "";
    }

    return String(data).slice(0, 10);
}


function podeCadastrarVacinacao() {
    const perfil = funcionarioAtual?.perfil;

    return (
        perfil === "administrador" ||
        perfil === "veterinario"
    );
}


function podeExcluirVacinacao() {
    return funcionarioAtual?.perfil === "administrador";
}


/* ==========================================
   59. VACINAÇÕES — CARREGAR ANIMAIS
========================================== */

async function carregarAnimaisVacinacao() {
    const select = document.getElementById(
        "vacinacao-pet"
    );

    if (!select) {
        throw new Error(
            "Campo de seleção de animal não encontrado."
        );
    }

    const animais = await requisicao("/pets");

    if (!Array.isArray(animais)) {
        throw new Error(
            "Não foi possível carregar a lista de animais."
        );
    }

    select.replaceChildren(
        new Option("Selecione o animal", "")
    );

    animais.forEach(animal => {
        select.add(
            new Option(
                animal.nome,
                String(animal.id_pet)
            )
        );
    });

    return animais;
}


/* ==========================================
   60. VACINAÇÕES — LISTAGEM
========================================== */

async function carregarVacinacoes() {
    const tabela = document.getElementById(
        "lista-vacinacoes"
    );

    if (!tabela) {
        return;
    }

    tabela.replaceChildren();

    const linhaCarregando = tabela.insertRow();
    const celulaCarregando = linhaCarregando.insertCell();

    celulaCarregando.colSpan = 7;
    celulaCarregando.textContent =
        "Carregando vacinações...";

    try {
        const [vacinacoes, animais] = await Promise.all([
            requisicao("/vacinacoes"),
            requisicao("/pets")
        ]);

        if (
            !Array.isArray(vacinacoes) ||
            !Array.isArray(animais)
        ) {
            throw new Error(
                "O servidor retornou dados inválidos."
            );
        }

        const nomesAnimais = new Map(
            animais.map(animal => [
                Number(animal.id_pet),
                animal.nome
            ])
        );

        tabela.replaceChildren();

        if (vacinacoes.length === 0) {
            const linha = tabela.insertRow();
            const celula = linha.insertCell();

            celula.colSpan = 7;
            celula.textContent =
                "Nenhuma vacinação cadastrada.";

            return;
        }

        vacinacoes.forEach(vacina => {
            const linha = tabela.insertRow();

            const nomeAnimal = nomesAnimais.get(
                Number(vacina.id_pet)
            ) || `ID ${vacina.id_pet}`;

            [
                vacina.id_vacinacao,
                nomeAnimal,
                vacina.nome_vacina,
                formatarDataVacinacao(
                    vacina.data_aplicacao
                ),
                formatarDataVacinacao(
                    vacina.proxima_dose
                ),
                vacina.lote || "—"
            ].forEach(valor => {
                const td = linha.insertCell();
                td.textContent = valor ?? "—";
            });

            const celulaAcoes = linha.insertCell();

            // Administrador e veterinário podem editar.
            if (podeCadastrarVacinacao()) {
                const editar = document.createElement(
                    "button"
                );

                editar.type = "button";
                editar.textContent = "Editar";
                editar.className = "secundario";

                editar.addEventListener("click", () => {
                    abrirEdicaoVacinacao(vacina);
                });

                celulaAcoes.appendChild(editar);
            }

            // Somente administrador pode excluir.
            if (podeExcluirVacinacao()) {
                const excluir = document.createElement(
                    "button"
                );

                excluir.type = "button";
                excluir.textContent = "Excluir";
                excluir.className = "secundario";

                excluir.addEventListener(
                    "click",
                    () => {
                        excluirVacinacao(
                            vacina.id_vacinacao
                        );
                    }
                );

                celulaAcoes.appendChild(excluir);
            }

            if (!celulaAcoes.children.length) {
                celulaAcoes.textContent = "—";
            }
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar vacinações:",
            erro
        );

        tabela.replaceChildren();

        const linha = tabela.insertRow();
        const celula = linha.insertCell();

        celula.colSpan = 7;
        celula.textContent =
            erro.message ||
            "Não foi possível carregar as vacinações.";
    }
}


/* ==========================================
   61. CARREGAR VACINAÇÕES AO ABRIR A PÁGINA
========================================== */

document.querySelector(
    '[data-pagina="vacinacoes"]'
)?.addEventListener(
    "click",
    carregarVacinacoes
);


/* ==========================================
   62. VACINAÇÕES — NOVO CADASTRO
========================================== */

document.getElementById("nova-vacinacao")
    ?.addEventListener("click", async () => {
        if (!podeCadastrarVacinacao()) {
            aviso(
                "Você não tem permissão para cadastrar vacinações."
            );
            return;
        }

        const dialog = document.getElementById(
            "dialog-vacinacao"
        );

        const form = document.getElementById(
            "form-vacinacao"
        );

        const titulo = document.getElementById(
            "titulo-form-vacinacao"
        );

        const erro = document.getElementById(
            "erro-vacinacao"
        );

        if (!dialog || !form) {
            aviso(
                "Formulário de vacinação não encontrado."
            );
            return;
        }

        try {
            // Limpa os dados somente ao abrir
            // um novo cadastro.
            form.reset();

            idVacinacaoEmEdicao = null;

            if (titulo) {
                titulo.textContent =
                    "Cadastrar vacinação";
            }

            if (erro) {
                erro.textContent = "";
            }

            const animais =
                await carregarAnimaisVacinacao();

            if (animais.length === 0) {
                aviso(
                    "Cadastre um animal antes de registrar uma vacinação."
                );
                return;
            }

            dialog.showModal();

        } catch (falha) {
            aviso(
                "Erro ao carregar os animais: " +
                falha.message
            );

            console.error(falha);
        }
    });


/* ==========================================
   63. VACINAÇÕES — FECHAR FORMULÁRIO
========================================== */

document.getElementById(
    "cancelar-form-vacinacao"
)?.addEventListener("click", () => {
    document.getElementById(
        "dialog-vacinacao"
    )?.close();
});


/* ==========================================
   64. VACINAÇÕES — SALVAR CADASTRO OU EDIÇÃO
========================================== */

document.getElementById("form-vacinacao")
    ?.addEventListener("submit", async evento => {
        evento.preventDefault();

        if (!podeCadastrarVacinacao()) {
            aviso(
                "Você não tem permissão para salvar vacinações."
            );
            return;
        }

        const form = evento.currentTarget;

        const erro = document.getElementById(
            "erro-vacinacao"
        );

        const botaoSalvar = form.querySelector(
            '[type="submit"]'
        );

        if (erro) {
            erro.textContent = "";
        }

        const dados = new FormData(form);

        const vacinacao = {
            id_pet: Number(
                dados.get("id_pet")
            ),

            nome_vacina: String(
                dados.get("nome_vacina") || ""
            ).trim(),

            data_aplicacao:
                dados.get("data_aplicacao") || null,

            proxima_dose:
                dados.get("proxima_dose") || null,

            lote: String(
                dados.get("lote") || ""
            ).trim() || null,

            observacoes: String(
                dados.get("observacoes") || ""
            ).trim() || null
        };

        // Validação dos campos obrigatórios.
        if (
            !vacinacao.id_pet ||
            !vacinacao.nome_vacina ||
            !vacinacao.data_aplicacao
        ) {
            if (erro) {
                erro.textContent =
                    "Preencha o animal, a vacina e a data de aplicação.";
            }
            return;
        }

        if (
            vacinacao.proxima_dose &&
            vacinacao.proxima_dose <
                vacinacao.data_aplicacao
        ) {
            if (erro) {
                erro.textContent =
                    "A próxima dose não pode ser anterior à aplicação.";
            }
            return;
        }

        const editando =
            idVacinacaoEmEdicao !== null;

        const idEdicao = idVacinacaoEmEdicao;

        if (botaoSalvar) {
            botaoSalvar.disabled = true;
        }

        try {
            await requisicao(
                editando
                    ? `/vacinacoes/${idEdicao}`
                    : "/vacinacoes",

                json(
                    editando ? "PUT" : "POST",
                    vacinacao
                )
            );

            // Só limpa o controle de edição
            // depois de salvar com sucesso.
            idVacinacaoEmEdicao = null;

            document.getElementById(
                "dialog-vacinacao"
            )?.close();

            form.reset();

            await carregarVacinacoes();

            aviso(
                editando
                    ? "Vacinação atualizada com sucesso!"
                    : "Vacinação cadastrada com sucesso!"
            );

        } catch (falha) {
            if (erro) {
                erro.textContent =
                    falha.message ||
                    "Erro ao salvar vacinação.";
            }

            console.error(
                "Erro ao salvar vacinação:",
                falha
            );

        } finally {
            if (botaoSalvar) {
                botaoSalvar.disabled = false;
            }
        }
    });


/* ==========================================
   65. VACINAÇÕES — EDITAR
========================================== */

async function abrirEdicaoVacinacao(vacina) {
    if (!podeCadastrarVacinacao()) {
        aviso(
            "Você não tem permissão para editar vacinações."
        );
        return;
    }

    const dialog = document.getElementById(
        "dialog-vacinacao"
    );

    const form = document.getElementById(
        "form-vacinacao"
    );

    const erro = document.getElementById(
        "erro-vacinacao"
    );

    const titulo = document.getElementById(
        "titulo-form-vacinacao"
    );

    if (!dialog || !form) {
        aviso(
            "Formulário de vacinação não encontrado."
        );
        return;
    }

    try {
        await carregarAnimaisVacinacao();

        form.reset();

        idVacinacaoEmEdicao =
            vacina.id_vacinacao;

        // Preencher o animal.
        form.elements["id_pet"].value =
            String(vacina.id_pet);

        // Preencher a vacina.
        const campoNomeVacina =
            form.elements["nome_vacina"];

        if (
            campoNomeVacina &&
            campoNomeVacina.tagName === "SELECT"
        ) {
            const existeOpcao = Array.from(
                campoNomeVacina.options
            ).some(
                opcao =>
                    opcao.value === vacina.nome_vacina
            );

            // Preserva nomes de vacinas já
            // cadastradas, mesmo que não estejam
            // nas opções atuais do formulário.
            if (!existeOpcao && vacina.nome_vacina) {
                campoNomeVacina.add(
                    new Option(
                        vacina.nome_vacina,
                        vacina.nome_vacina
                    )
                );
            }
        }

        if (campoNomeVacina) {
            campoNomeVacina.value =
                vacina.nome_vacina || "";
        }

        // Campos de data HTML exigem YYYY-MM-DD.
        form.elements["data_aplicacao"].value =
            dataParaCampoVacinacao(
                vacina.data_aplicacao
            );

        form.elements["proxima_dose"].value =
            dataParaCampoVacinacao(
                vacina.proxima_dose
            );

        form.elements["lote"].value =
            vacina.lote || "";

        form.elements["observacoes"].value =
            vacina.observacoes || "";

        if (titulo) {
            titulo.textContent =
                "Editar vacinação";
        }

        if (erro) {
            erro.textContent = "";
        }

        dialog.showModal();

    } catch (falha) {
        aviso(
            "Não foi possível abrir a edição: " +
            falha.message
        );

        console.error(falha);
    }
}


/* ==========================================
   66. VACINAÇÕES — EXCLUIR
========================================== */

async function excluirVacinacao(idVacinacao) {
    if (!podeExcluirVacinacao()) {
        aviso(
            "Somente administradores podem excluir vacinações."
        );
        return;
    }

    if (!idVacinacao) {
        aviso(
            "Identificador da vacinação inválido."
        );
        return;
    }

    const confirmar = confirm(
        "Deseja realmente excluir esta vacinação?\n\n" +
        "Esta ação não poderá ser desfeita."
    );

    if (!confirmar) {
        return;
    }

    try {
        await requisicao(
            `/vacinacoes/${encodeURIComponent(
                idVacinacao
            )}`,
            {
                method: "DELETE",
                credentials: "same-origin"
            }
        );

        aviso(
            "Vacinação excluída com sucesso!"
        );

        await carregarVacinacoes();

    } catch (erro) {
        aviso(
            "Erro ao excluir vacinação: " +
            erro.message
        );

        console.error(
            "Erro ao excluir vacinação:",
            erro
        );
    }
}


/* ==========================================
   67. VACINAÇÕES — LIMPAR ESTADO AO FECHAR
========================================== */

document.getElementById(
    "dialog-vacinacao"
)?.addEventListener("close", () => {
    idVacinacaoEmEdicao = null;

    const erro = document.getElementById(
        "erro-vacinacao"
    );

    if (erro) {
        erro.textContent = "";
    }
});

/* ==========================================
   FIM DO SCRIPT.JS — VET CARE
========================================== */

/* ==========================================
   EXAMES — CRUD (Vet Care)
========================================== */

let exameEmEdicao = null;

function podeEditarExames() {
    return ["administrador", "veterinario"].includes(
        funcionarioAtual?.perfil
    );
}

function podeExcluirExames() {
    return funcionarioAtual?.perfil === "administrador";
}

function dataExame(valor) {
    if (!valor) return "—";

    const parte = String(valor).slice(0, 10);
    const [ano, mes, dia] = parte.split("-");

    return ano && mes && dia
        ? `${dia}/${mes}/${ano}`
        : parte;
}

/* ==========================================
   LISTAR EXAMES
========================================== */

async function carregarExames() {
    const tabela = $("lista-exames");
    if (!tabela) return;

    tabela.replaceChildren();

    try {
        const exames = await requisicao("/exames");

        if (!Array.isArray(exames)) {
            throw new Error("Resposta inválida da API.");
        }

        if (!exames.length) {
            const linha = tabela.insertRow();
            const td = linha.insertCell();

            td.colSpan = 8;
            td.textContent = "Nenhum exame cadastrado.";
            return;
        }

        for (const exame of exames) {
            const linha = tabela.insertRow();

            [
                exame.id_exame,
                exame.pet_nome,
                exame.tipo_exame,
                dataExame(exame.data_solicitacao),
                dataExame(exame.data_realizacao),
                exame.status_exame,
                exame.resultado || "—"
            ].forEach(valor => celula(linha, valor));

            const acoes = linha.insertCell();

            if (podeEditarExames()) {
                botao(
                    acoes,
                    "Editar",
                    () => abrirExame(exame),
                    "suave"
                );
            }

            if (podeExcluirExames()) {
                botao(
                    acoes,
                    "Excluir",
                    () => excluirExame(exame),
                    "perigo"
                );
            }

            if (!acoes.childNodes.length) {
                acoes.textContent = "—";
            }
        }

    } catch (erro) {
        const linha = tabela.insertRow();
        const td = linha.insertCell();

        td.colSpan = 8;
        td.textContent =
            `Não foi possível carregar os exames: ${erro.message}`;

        aviso(erro.message);
    }
}

/* ==========================================
   ABRIR CADASTRO / EDIÇÃO
========================================== */

async function abrirExame(exame = null) {
    if (!podeEditarExames()) {
        aviso(
            "Você não tem permissão para cadastrar ou editar exames."
        );
        return;
    }

    const formulario = $("form-exame");
    const seletor = $("exame-pet");
    const erro = $("erro-exame");

    if (!formulario || !seletor) return;

    erro.textContent = "";

    try {
        const animais = await requisicao("/pets");

        if (!Array.isArray(animais)) {
            throw new Error("Lista de animais inválida.");
        }

        seletor.replaceChildren(
            new Option("Selecione o animal", "")
        );

        for (const animal of animais) {
            seletor.add(
                new Option(
                    `${animal.nome} (ID ${animal.id_pet})`,
                    String(animal.id_pet)
                )
            );
        }

        if (!animais.length) {
            aviso(
                "Cadastre um animal antes de registrar exames."
            );
            return;
        }

        formulario.reset();

        exameEmEdicao = exame?.id_exame ?? null;

        $("titulo-form-exame").textContent = exame
            ? "Editar exame"
            : "Cadastrar exame";

        if (exame) {
            for (const campo of [
                "id_pet",
                "tipo_exame",
                "status_exame",
                "resultado",
                "observacoes"
            ]) {
                formulario.elements[campo].value =
                    exame[campo] ?? "";
            }

            formulario.elements.data_solicitacao.value =
                String(
                    exame.data_solicitacao || ""
                ).slice(0, 10);

            formulario.elements.data_realizacao.value =
                String(
                    exame.data_realizacao || ""
                ).slice(0, 10);

        } else {
            const hoje = new Date();

            const ano = hoje.getFullYear();
            const mes = String(
                hoje.getMonth() + 1
            ).padStart(2, "0");

            const dia = String(
                hoje.getDate()
            ).padStart(2, "0");

            formulario.elements.data_solicitacao.value =
                `${ano}-${mes}-${dia}`;
        }

        $("dialog-exame").showModal();

    } catch (erroAbrir) {
        aviso(
            `Erro ao abrir exame: ${erroAbrir.message}`
        );
    }
}

/* ==========================================
   EXCLUIR EXAME
========================================== */

async function excluirExame(exame) {
    if (!podeExcluirExames()) return;

    if (!confirm(
        `Excluir definitivamente o exame ${exame.tipo_exame} ` +
        `do animal ${exame.pet_nome}?`
    )) {
        return;
    }

    try {
        await requisicao(
            `/exames/${exame.id_exame}`,
            { method: "DELETE" }
        );

        aviso("Exame excluído com sucesso.");

        await carregarExames();

    } catch (erro) {
        aviso(
            `Erro ao excluir exame: ${erro.message}`
        );
    }
}

/* ==========================================
   EVENTOS DOS BOTÕES
========================================== */

document.querySelector(
    '[data-pagina="exames"]'
)?.addEventListener(
    "click",
    carregarExames
);

$("novo-exame")?.addEventListener(
    "click",
    () => abrirExame()
);

$("cancelar-form-exame")?.addEventListener(
    "click",
    () => $("dialog-exame").close()
);

/* ==========================================
   SALVAR EXAME
========================================== */

$("form-exame")?.addEventListener(
    "submit",
    async evento => {
        evento.preventDefault();

        if (!podeEditarExames()) return;

        const formulario = evento.currentTarget;

        const salvar = formulario.querySelector(
            '[type="submit"]'
        );

        const erroCampo = $("erro-exame");
        erroCampo.textContent = "";

        const dados = {
            id_pet: Number(
                formulario.elements.id_pet.value
            ),

            tipo_exame:
                formulario.elements.tipo_exame.value.trim(),

            data_solicitacao:
                formulario.elements.data_solicitacao.value,

            data_realizacao:
                formulario.elements.data_realizacao.value || null,

            status_exame:
                formulario.elements.status_exame.value,

            resultado:
                formulario.elements.resultado.value.trim() || null,

            observacoes:
                formulario.elements.observacoes.value.trim() || null
        };

        if (
            dados.data_realizacao &&
            dados.data_realizacao < dados.data_solicitacao
        ) {
            erroCampo.textContent =
                "A realização não pode ser anterior à solicitação.";
            return;
        }

        if (
            dados.status_exame === "realizado" &&
            !dados.data_realizacao
        ) {
            erroCampo.textContent =
                "Informe a data de realização do exame.";
            return;
        }

        salvar.disabled = true;

        try {
            await requisicao(
                exameEmEdicao
                    ? `/exames/${exameEmEdicao}`
                    : "/exames",

                json(
                    exameEmEdicao ? "PUT" : "POST",
                    dados
                )
            );

            $("dialog-exame").close();

            aviso(
                exameEmEdicao
                    ? "Exame atualizado com sucesso!"
                    : "Exame cadastrado com sucesso!"
            );

            exameEmEdicao = null;

            await carregarExames();

        } catch (erro) {
            erroCampo.textContent = erro.message;

        } finally {
            salvar.disabled = false;
        }
    }
);

/* ==========================================
   PERMISSÕES DO MÓDULO
========================================== */

const configurarPermissoesInterfaceOriginalExames =
    configurarPermissoesInterface;

configurarPermissoesInterface = function(funcionario) {
    configurarPermissoesInterfaceOriginalExames(funcionario);

    const perfil = funcionario?.perfil;

    const menu = document.querySelector(
        '[data-pagina="exames"]'
    );

    if (menu) {
        menu.hidden = ![
            "administrador",
            "veterinario",
            "atendente"
        ].includes(perfil);
    }

    if ($("novo-exame")) {
        $("novo-exame").hidden = ![
            "administrador",
            "veterinario"
        ].includes(perfil);
    }
};


/* ==========================================
   ESTOQUE DE MEDICAMENTOS — PAINEL E ACESSO
========================================== */
let estoqueItens = [];
let estoqueEditando = null;
const estoqueAdmin = () => funcionarioAtual?.perfil === "administrador";

function estoqueSituacao(item) {
    const quantidade = Number(item.quantidade ?? 0);
    const minimo = Number(item.estoque_minimo ?? 0);
    const validade = item.data_validade ? String(item.data_validade).slice(0,10) : "";
    const hoje = new Date();
    const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}-${String(hoje.getDate()).padStart(2,"0")}`;
    const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()+30);
    const dataLimite = `${limite.getFullYear()}-${String(limite.getMonth()+1).padStart(2,"0")}-${String(limite.getDate()).padStart(2,"0")}`;
    if (validade && validade < dataHoje) return {tipo:"vencido", texto:"Vencido"};
    if (quantidade <= minimo) return {tipo:"baixo", texto:"Estoque baixo"};
    if (validade && validade <= dataLimite) return {tipo:"proximo", texto:"Validade próxima"};
    return {tipo:"normal", texto:"Em dia"};
}

function estoqueData(valor) {
    if (!valor) return "—";
    const [a,m,d] = String(valor).slice(0,10).split("-");
    return `${d}/${m}/${a}`;
}

function estoqueDesenhar() {
    const tabela = $("estoque-lista");
    if (!tabela) return;
    tabela.replaceChildren();
    const admin = estoqueAdmin();
    const busca = ($("estoque-busca")?.value || "").toLocaleLowerCase("pt-BR").trim();
    const filtro = $("estoque-filtro")?.value || "todos";
    const itens = estoqueItens.filter(item => {
        const texto = [item.nome,item.categoria,item.lote,item.fabricante].join(" ").toLocaleLowerCase("pt-BR");
        return texto.includes(busca) && (filtro === "todos" || estoqueSituacao(item).tipo === filtro);
    });
    document.querySelectorAll(".estoque-col-acoes").forEach(c => c.hidden = !admin);
    if (!itens.length) {
        const tr = tabela.insertRow();
        const td = tr.insertCell();
        td.colSpan = admin ? 6 : 5;
        td.textContent = "Nenhum medicamento encontrado.";
    }
    for (const item of itens) {
        const tr = tabela.insertRow();excluir
        const nome = celula(tr, item.nome);
        nome.classList.add("estoque-nome");
        const subtitulo = document.createElement("small");
        subtitulo.className = "estoque-sub";
        subtitulo.textContent = item.categoria || "Sem categoria";
        nome.appendChild(subtitulo);
        celula(tr, item.lote || "—");
        celula(tr, `${item.quantidade} un.`);
        celula(tr, estoqueData(item.data_validade));
        const statusTd = tr.insertCell();
        const status = estoqueSituacao(item);
        const tag = document.createElement("span");
        tag.className = `estoque-status ${status.tipo}`;
        tag.textContent = status.texto;
        statusTd.appendChild(tag);
        if (admin) {
            const acoes = tr.insertCell();
            acoes.className = "estoque-acoes";
            botao(acoes,"Editar",() => estoqueAbrir(item),"suave");
            botao(acoes,"Excluir",() => estoqueExcluir(item),"perigo");
        }
    }
    $("estoque-contagem").textContent = `${itens.length} medicamento(s) exibido(s)`;
}

async function estoqueCarregar() {
    const tabela = $("estoque-lista");
    if (!tabela || !funcionarioAtual) return;
    try {
        const dados = await requisicao("/estoque", {credentials:"same-origin"});
        if (!Array.isArray(dados)) throw new Error("Resposta inválida do estoque.");
        estoqueItens = dados;
        $("estoque-total").textContent = dados.length;
        $("estoque-baixo").textContent = dados.filter(i => Number(i.quantidade) <= Number(i.estoque_minimo)).length;
        const hoje = new Date();
        const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}-${String(hoje.getDate()).padStart(2,"0")}`;
        const fim = new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate()+30);
        const fimStr = `${fim.getFullYear()}-${String(fim.getMonth()+1).padStart(2,"0")}-${String(fim.getDate()).padStart(2,"0")}`;
        $("estoque-proximos").textContent = dados.filter(i => {const d=String(i.data_validade||"").slice(0,10);return d>=inicio && d<=fimStr;}).length;
        $("estoque-vencidos").textContent = dados.filter(i => {const d=String(i.data_validade||"").slice(0,10);return d && d<inicio;}).length;
        estoqueDesenhar();
    } catch(erro) {
        aviso("Não foi possível carregar o estoque: " + erro.message);
    }
}

function estoqueAbrir(item = null) {
    if (!estoqueAdmin()) return;
    estoqueEditando = item?.id_medicamento ?? null;
    const form = $("estoque-form");
    form.reset();
    $("estoque-erro").textContent = "";
    $("estoque-form-titulo").textContent = item ? "Editar medicamento" : "Adicionar medicamento";
    for (const campo of ["nome","categoria","fabricante","lote","quantidade","estoque_minimo","data_validade","preco_unitario","observacoes"]) {
        if (item && item[campo] != null) form.elements[campo].value = campo === "data_validade" ? String(item[campo]).slice(0,10) : item[campo];
    }
    $("estoque-dialog").showModal();
}

async function estoqueExcluir(item) {
    if (!estoqueAdmin()) return;
    if (!confirm(`Excluir o medicamento "${item.nome}"? Esta ação é permanente.`)) return;
    try {
        await requisicao(`/estoque/${item.id_medicamento}`, {method:"DELETE",credentials:"same-origin"});
        aviso("Medicamento excluído com sucesso.");
        await estoqueCarregar();
    } catch(erro) {aviso("Erro ao excluir: " + erro.message);}
}

$("estoque-form")?.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!estoqueAdmin()) return;
    const form = evento.currentTarget;
    const campo = nome => form.elements[nome].value.trim();
    const dados = {
        nome:campo("nome"), categoria:campo("categoria")||null,
        fabricante:campo("fabricante")||null, lote:campo("lote")||null,
        quantidade:Number(campo("quantidade")), estoque_minimo:Number(campo("estoque_minimo")),
        data_validade:campo("data_validade")||null,
        preco_unitario:campo("preco_unitario") ? Number(campo("preco_unitario")) : null,
        observacoes:campo("observacoes")||null
    };
    const salvar = $("estoque-salvar");
    salvar.disabled = true;
    try {
        await requisicao(estoqueEditando ? `/estoque/${estoqueEditando}` : "/estoque", {
            ...json(estoqueEditando ? "PUT" : "POST", dados),credentials:"same-origin"
        });
        $("estoque-dialog").close();
        aviso("Medicamento salvo com sucesso.");
        await estoqueCarregar();
    } catch(erro) {$("estoque-erro").textContent = erro.message;}
    finally {salvar.disabled = false;}
});

$("estoque-novo")?.addEventListener("click", () => estoqueAbrir());
$("estoque-cancelar")?.addEventListener("click", () => $("estoque-dialog").close());
$("estoque-busca")?.addEventListener("input", estoqueDesenhar);
$("estoque-filtro")?.addEventListener("change", estoqueDesenhar);
document.querySelector('[data-pagina="estoque"]')?.addEventListener("click", estoqueCarregar);

const configurarPermissoesAntesEstoque = configurarPermissoesInterface;
configurarPermissoesInterface = function(funcionario) {
    configurarPermissoesAntesEstoque(funcionario);
    const autorizado = ["administrador","veterinario","atendente"].includes(funcionario?.perfil);
    const menu = document.querySelector('[data-pagina="estoque"]');
    if (menu) menu.hidden = !autorizado;
    if ($("estoque-novo")) $("estoque-novo").hidden = funcionario?.perfil !== "administrador";
    if ($("estoque-dialog")?.open && funcionario?.perfil !== "administrador") $("estoque-dialog").close();
    if (!autorizado && !$("pagina-estoque")?.hidden) document.querySelector('[data-pagina="dashboard"]')?.click();
};


function abrirCarteirinha(pet) {

    // Carrega a foto atualizada do animal pelo FastAPI
    const fotoCarteirinha = $("carteirinha-foto");

    fotoCarteirinha.hidden = true;
    fotoCarteirinha.removeAttribute("src");

    fotoCarteirinha.onload = () => {
        fotoCarteirinha.hidden = false;
    };

    fotoCarteirinha.onerror = () => {
        fotoCarteirinha.hidden = true;
    };

    requisicao(`/pets/${pet.id_pet}`)
        .then(animal => {
            if (animal.foto_url) {
                fotoCarteirinha.src = animal.foto_url;
            }
        })
        .catch(erro => {
            console.error("Erro ao carregar foto do animal:", erro);
        });

    $("carteirinha-nome").textContent =
        pet.nome || "Não informado";

    $("carteirinha-especie").textContent =
        pet.especie || "Não informada";

    $("carteirinha-raca").textContent =
        pet.raca || "Não informada";

    $("carteirinha-sexo").textContent =
        pet.sexo || "Não informado";

     const imagemQR = $("carteirinha-imagem-qr");
const textoQR = $("carteirinha-texto-qr");

imagemQR.hidden = true;
textoQR.textContent = "Carregando QR Code...";

imagemQR.onload = () => {
    imagemQR.hidden = false;
    textoQR.textContent = "Escaneie para consultar a identificação";
};

imagemQR.onerror = () => {
    imagemQR.hidden = true;
    textoQR.textContent = "Não foi possível carregar o QR Code.";
};

imagemQR.src =
    `/carteirinha/${pet.id_pet}/qr`;
        
    $("carteirinha-id").textContent =
        "PET-" + pet.id_pet;

    $("dialog-carteirinha").showModal();
}


function configurarBotoesCarteirinha() {
    const dialog = document.getElementById("dialog-carteirinha");
    const botaoFechar = document.getElementById("fechar-carteirinha");
    const botaoImprimir = document.getElementById("imprimir-carteirinha");

    console.log("Dialog:", dialog);
    console.log("Botao fechar:", botaoFechar);
    console.log("Botao imprimir:", botaoImprimir);

    if (dialog && botaoFechar && botaoImprimir) {
        botaoFechar.addEventListener("click", () => {
            dialog.close();
        });

        botaoImprimir.addEventListener("click", () => {
            window.print();
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", configurarBotoesCarteirinha);
} else {
    configurarBotoesCarteirinha();
}



const inputFotoPet = document.getElementById("foto-pet");
const previewFotoPet = document.getElementById("preview-foto-pet");

if (inputFotoPet && previewFotoPet) {
    inputFotoPet.addEventListener("change", () => {
        const arquivo = inputFotoPet.files[0];

        if (!arquivo) {
            previewFotoPet.style.display = "none";
            previewFotoPet.removeAttribute("src");
            return;
        }

        const urlTemporaria = URL.createObjectURL(arquivo);

        previewFotoPet.onload = () => {
            URL.revokeObjectURL(urlTemporaria);
        };

        previewFotoPet.src = urlTemporaria;
        previewFotoPet.style.display = "block";
    });
}
