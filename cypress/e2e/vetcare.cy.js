
describe('Vet Care - Testes E2E', () => {

  const URL = 'http://127.0.0.1:8003';

  // Compartilha a consulta entre os testes 11, 12 e 13
  let consultaCriada = null;

  // Confirma que estamos usando somente o banco de testes
  function verificarBancoTeste() {
    cy.request(`${URL}/verificar-banco`).then((resposta) => {
      expect(resposta.status).to.eq(200);
      expect(resposta.body.banco_conectado)
        .to.eq('vetcare_test_db');
    });
  }

  // Realiza o login com o administrador de testes
  function fazerLogin() {
    cy.visit(`${URL}/`);

    cy.get('#form-login [name="email"]')
      .type('rafaelhora@gmail.com');

    cy.env(['senhaTeste'], { log: false })
      .then(({ senhaTeste }) => {
        cy.get('#form-login [name="senha"]')
          .type(senhaTeste, { log: false });
      });

    cy.intercept('POST', '**/auth/login').as('login');

    cy.get('#form-login button[type="submit"]')
      .click();

    cy.wait('@login')
      .its('response.statusCode')
      .should('eq', 200);

    cy.get('#tela-login', { timeout: 10000 })
      .should('not.be.visible');

    cy.request(`${URL}/auth/me`)
      .its('status')
      .should('eq', 200);
  }

  // Formata YYYY-MM-DD para DD/MM/YYYY
  function formatarData(data) {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Gera uma data futura para cada tentativa
  function gerarDataConsulta(tentativa) {
    const data = new Date();

    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + 35 + tentativa);

    return [
      data.getFullYear(),
      String(data.getMonth() + 1).padStart(2, '0'),
      String(data.getDate()).padStart(2, '0')
    ].join('-');
  }

  // TESTE 1 - CONEXÃO COM O BANCO
  it('Deve confirmar a conexão com o banco de testes', () => {
    verificarBancoTeste();
  });

  // TESTE 2 - EXIBIÇÃO DO LOGIN
  it('Deve exibir a tela de login do Vet Care', () => {
    verificarBancoTeste();

    cy.visit(`${URL}/`);

    cy.get('#tela-login')
      .should('be.visible');

    cy.get('#form-login')
      .should('exist');
  });

  // TESTE 3 - LOGIN INVÁLIDO
  it('Deve impedir login com credenciais incorretas', () => {
    verificarBancoTeste();

    cy.visit(`${URL}/`);

    cy.get('#form-login [name="email"]')
      .type('usuario.inexistente@exemplo.invalid');

    cy.get('#form-login [name="senha"]')
      .type('SenhaIncorreta123', { log: false });

    cy.get('#form-login button[type="submit"]')
      .click();

    cy.get('#erro-login')
      .should('be.visible')
      .and('not.be.empty');

    cy.get('#tela-login')
      .should('be.visible');
  });

  // TESTE 4 - LOGIN VÁLIDO
  it('Deve permitir login com credenciais válidas', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('#novo-pet')
      .should('exist');
  });

  // TESTE 5 - CADASTRO DE ANIMAL
  it('Deve cadastrar um animal no banco de testes', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('button[data-pagina="animais"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-animais')
      .should('be.visible');

    cy.get('#novo-pet')
      .should('be.visible')
      .click();

    cy.get('#dialog-pet')
      .should('be.visible');

    cy.get('#form-pet [name="nome"]')
      .type('Pet Cypress Teste');

    cy.get('#form-pet [name="especie"]')
      .select('Cachorro');

    cy.get('#form-pet [name="sexo"]')
      .select('macho');

    cy.get('#form-pet [name="data_nascimento"]')
      .type('2023-05-10');

    cy.get('#form-pet [name="peso"]')
      .type('8.50');

    cy.get('#form-pet button[type="submit"]')
      .click();

    cy.get('#lista-pets')
      .contains('Pet Cypress Teste')
      .should('be.visible');
  });

  // TESTE 6 - EDIÇÃO DE ANIMAL
  it('Deve editar o peso de um animal cadastrado', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('button[data-pagina="animais"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-animais')
      .should('be.visible');

    cy.get('#lista-pets tr')
      .contains('td', 'Pet Cypress Teste')
      .parent('tr')
      .first()
      .within(() => {
        cy.contains('button', 'Editar').click();
      });

    cy.get('#dialog-pet')
      .should('be.visible');

    cy.get('#titulo-form-pet')
      .should('have.text', 'Editar animal');

    cy.get('#form-pet [name="peso"]')
      .clear()
      .type('9.20');

    cy.get('#form-pet button[type="submit"]')
      .click();

    cy.get('#lista-pets tr')
      .contains('td', 'Pet Cypress Teste')
      .parent('tr')
      .first()
      .should('contain.text', '9.2');
  });

  // TESTE 7 - DESATIVAÇÃO DE ANIMAL
  it('Deve desativar um animal cadastrado', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('button[data-pagina="animais"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-animais')
      .should('be.visible');

    const nomePet = `Pet Desativacao ${Date.now()}`;

    cy.get('#novo-pet')
      .should('be.visible')
      .click();

    cy.get('#dialog-pet')
      .should('be.visible');

    cy.get('#form-pet [name="nome"]')
      .type(nomePet);

    cy.get('#form-pet [name="especie"]')
      .select('Cachorro');

    cy.get('#form-pet [name="sexo"]')
      .select('macho');

    cy.get('#form-pet [name="peso"]')
      .type('7.50');

    cy.get('#form-pet button[type="submit"]')
      .click();

    cy.get('#lista-pets')
      .contains('td', nomePet)
      .should('be.visible');

    cy.on('window:confirm', () => true);

    cy.get('#lista-pets tr')
      .contains('td', nomePet)
      .parent('tr')
      .within(() => {
        cy.contains('button', 'Desativar').click();
      });

    cy.get('#lista-pets')
      .contains('td', nomePet)
      .should('not.exist');
  });

  // TESTE 8 - CADASTRO DE TUTOR
  it('Deve cadastrar um tutor no banco de testes', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('button[data-pagina="tutores"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-tutores')
      .should('be.visible');

    cy.get('#novo-tutor')
      .should('be.visible')
      .click();

    cy.get('#dialog-tutor')
      .should('be.visible');

    const identificador = Date.now().toString();
    const nomeTutor = `Tutor Cypress ${identificador}`;
    const cpfTutor = identificador.slice(-11);

    cy.get('#form-tutor [name="nome"]')
      .type(nomeTutor);

    cy.get('#form-tutor [name="cpf"]')
      .type(cpfTutor);

    cy.get('#form-tutor [name="email"]')
      .type(`tutor${identificador}@example.com`);

    cy.get('#form-tutor [name="telefone"]')
      .type('81999999999');

    cy.get('#form-tutor [name="endereco"]')
      .type('Rua Teste, 123');

    cy.get('#form-tutor button[type="submit"]')
      .click();

    cy.get('#lista-tutores')
      .contains('td', nomeTutor)
      .should('be.visible');
  });

  // TESTE 9 - EDIÇÃO DE TUTOR
  it('Deve editar o endereço de um tutor', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('button[data-pagina="tutores"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-tutores')
      .should('be.visible');

    cy.get('#lista-tutores tr')
      .contains('td', /^Tutor Cypress \d+$/)
      .parent('tr')
      .first()
      .within(() => {
        cy.contains('button', 'Editar').click();
      });

    cy.get('#dialog-tutor')
      .should('be.visible');

    cy.get('#titulo-form-tutor')
      .should('have.text', 'Editar tutor');

    const novoEndereco = 'Rua Cypress, 456';

    cy.get('#form-tutor [name="endereco"]')
      .clear()
      .type(novoEndereco);

    cy.get('#form-tutor button[type="submit"]')
      .click();

    cy.get('#lista-tutores tr')
      .contains('td', /^Tutor Cypress \d+$/)
      .parent('tr')
      .first()
      .should('contain.text', novoEndereco);
  });

  // TESTE 10 - DESATIVAÇÃO DE TUTOR
  it('Deve desativar um tutor cadastrado', () => {
    verificarBancoTeste();
    fazerLogin();

    cy.get('button[data-pagina="tutores"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-tutores')
      .should('be.visible');

    const identificador = Date.now().toString();
    const nomeTutor = `Tutor Desativacao ${identificador}`;
    const cpfTutor = identificador.slice(-11);

    cy.get('#novo-tutor')
      .should('be.visible')
      .click();

    cy.get('#dialog-tutor')
      .should('be.visible');

    cy.get('#form-tutor [name="nome"]')
      .type(nomeTutor);

    cy.get('#form-tutor [name="cpf"]')
      .type(cpfTutor);

    cy.get('#form-tutor [name="email"]')
      .type(`desativacao${identificador}@example.com`);

    cy.get('#form-tutor [name="telefone"]')
      .type('81999999999');

    cy.get('#form-tutor [name="endereco"]')
      .type('Rua Teste, 123');

    cy.get('#form-tutor button[type="submit"]')
      .click();

    cy.get('#lista-tutores')
      .contains('td', nomeTutor)
      .should('be.visible');

    cy.on('window:confirm', () => true);

    cy.get('#lista-tutores tr')
      .contains('td', nomeTutor)
      .parent('tr')
      .within(() => {
        cy.contains('button', 'Desativar').click();
      });

    cy.get('#lista-tutores')
      .contains('td', nomeTutor)
      .should('not.exist');
  });

  // TESTE 11 - AGENDAMENTO DE CONSULTA
  it('Deve agendar uma consulta veterinária', () => {
    verificarBancoTeste();
    fazerLogin();

    // Limpar os dados compartilhados de execuções anteriores
    consultaCriada = null;

    cy.get('button[data-pagina="consultas"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-consultas')
      .should('be.visible');

    const horarioConsulta = '11:30';
    const maxTentativas = 15;

    function tentarAgendar(tentativa) {

      if (tentativa >= maxTentativas) {
        throw new Error(
          'Não foi possível encontrar uma data disponível ' +
          `após ${maxTentativas} tentativas.`
        );
      }

      const dataConsulta = gerarDataConsulta(tentativa);

      cy.log(
        `Tentativa ${tentativa + 1}: ` +
        `${dataConsulta} às ${horarioConsulta}`
      );

      // Abrir o formulário
      cy.get('#nova-consulta')
        .should('be.visible')
        .click();

      cy.get('#dialog-consulta')
        .should('be.visible');

      // Selecionar o animal Rex
      cy.get('#consulta-pet')
        .should('contain.text', 'Rex')
        .select('11');

      // Selecionar João Teste
      cy.get('#consulta-tutor option[value="9"]')
        .should('exist');

      cy.get('#consulta-tutor')
        .select('9');

      // Selecionar veterinário
      cy.get('#consulta-veterinario')
        .select('Veterinario Cypress Teste');

      // Preencher os dados
      cy.get('#form-consulta [name="data_consulta"]')
        .clear()
        .type(dataConsulta);

      cy.get('#form-consulta [name="horario"]')
        .clear()
        .type(horarioConsulta);

      cy.get('#form-consulta [name="motivo"]')
        .clear()
        .type('Consulta automatizada Cypress');

      cy.get('#form-consulta [name="observacoes"]')
        .clear()
        .type('Agendamento realizado no banco de testes.');

      // Monitorar o cadastro
      cy.intercept('POST', '**/consultas')
        .as('salvarConsulta');

      // Enviar o formulário
      cy.get('#form-consulta button[type="submit"]')
        .click();

      cy.wait('@salvarConsulta').then(({ response }) => {

        expect(response, 'Resposta da API').to.exist;

        cy.log(`Status HTTP: ${response.statusCode}`);

        cy.log(
          'Resposta do servidor: ' +
          JSON.stringify(response.body)
        );

        // Cadastro realizado
        if ([200, 201].includes(response.statusCode)) {

          consultaCriada = {
            id: response.body.id_consulta ?? response.body.id,
            data: dataConsulta,
            horario: horarioConsulta,
            dataFormatada: formatarData(dataConsulta)
          };

          cy.log('ID da consulta criada: ' + consultaCriada.id);
          cy.log('Resposta da API: ' + JSON.stringify(response.body));
          cy.log('Consulta cadastrada com sucesso');

          cy.get('#dialog-consulta')
            .should('not.be.visible');

          cy.get('#lista-consultas tr')
            .filter(':contains("Rex")')
            .filter(':contains("João Teste")')
            .filter(
              `:contains("${consultaCriada.dataFormatada}")`
            )
            .filter(
              `:contains("${horarioConsulta}")`
            )
            .should('have.length.at.least', 1);

          return;
        }

        // Conflito de horário: tentar outra data
        if (
          response.statusCode === 409 &&
          String(response.body?.detail || '')
            .includes('já possui uma consulta')
        ) {

          cy.log(
            'Veterinário ocupado. Tentando outra data.'
          );

          // Fechar o diálogo usando o método nativo
          cy.get('#dialog-consulta').then(($dialog) => {

            const dialog = $dialog[0];

            if (dialog.open) {
              dialog.close();
            }

          });

          // Confirmar que o diálogo fechou
          cy.get('#dialog-consulta')
            .should('not.be.visible');

          // Tentar novamente
          tentarAgendar(tentativa + 1);

          return;
        }

        // Outros erros não devem ser ignorados
        throw new Error(
          'Erro ao cadastrar consulta: ' +
          response.statusCode + ' - ' +
          JSON.stringify(response.body)
        );

      });
    }

    tentarAgendar(0);
  });

  // TESTE 12 - EDIÇÃO DE CONSULTA
  it('Deve editar o motivo de uma consulta agendada', () => {
    verificarBancoTeste();
    fazerLogin();

    // O teste 11 precisa criar a consulta primeiro
    expect(
      consultaCriada,
      'Consulta criada pelo teste 11'
    ).to.exist;

    const dataFormatada = consultaCriada.dataFormatada;
    const horarioConsulta = consultaCriada.horario;

    // Abrir a página de consultas
    cy.get('button[data-pagina="consultas"]')
      .should('be.visible')
      .click();

    cy.get('#pagina-consultas')
      .should('be.visible');

    // Localizar a consulta criada pelo teste 11
   cy.get(
  `#lista-consultas tr[data-consulta-id="${consultaCriada.id}"]`
)
  .should('contain.text', 'Agendada')
  .within(() => {
    cy.contains('button', 'Editar').click();
  });

    // Confirmar abertura do formulário
    cy.get('#dialog-consulta')
      .should('be.visible');

    // Alterar o motivo
    const novoMotivo =
      'Consulta de rotina - editada pelo Cypress';

    cy.get('#form-consulta [name="motivo"]')
      .clear()
      .type(novoMotivo);

    // Monitorar atualização
    cy.intercept('PUT', '**/consultas/*')
      .as('editarConsulta');

    // Salvar alteração
    cy.get('#form-consulta button[type="submit"]')
      .click();

    // Verificar qual consulta foi realmente editada
    cy.wait('@editarConsulta').then(({ request, response }) => {
      expect(response, 'Resposta da API').to.exist;

      expect(
        response.statusCode,
        'Resposta da edição: ' + JSON.stringify(response.body)
      ).to.be.oneOf([200, 204]);

      // Identificar o ID utilizado pela requisição de edição
      const idEditado = Number(
         request.url.split('?')[0].split('/').filter(Boolean).pop()
    );

      expect(
        idEditado,
        'ID da consulta editada'
      ).to.be.greaterThan(0);

      cy.log('ID realmente editado: ' + idEditado);

      // Consultar os dados novamente na API
      cy.request(`${URL}/consultas`).then(({ status, body }) => {
        expect(status).to.eq(200);

        const lista = Array.isArray(body)
          ? body
          : (body.consultas ?? body.items ?? body.data ?? []);

        expect(
          lista,
          'Lista de consultas da API'
        ).to.be.an('array');

        const registro = lista.find(item =>
          Number(item.id_consulta ?? item.id) === idEditado
        );

        expect(
          registro,
          `Consulta ${idEditado} na API`
        ).to.exist;

        expect(registro.motivo)
          .to.eq(novoMotivo);
      });
    });

    // Confirmar que o formulário fechou após salvar
    cy.get('#dialog-consulta')
      .should('not.be.visible');
  });

  // TESTE 13 - CANCELAMENTO DE CONSULTA
  it('Deve cancelar uma consulta veterinária', () => {
    verificarBancoTeste();
    fazerLogin();

    // Utilizar a consulta criada pelo teste 11
    expect(
      consultaCriada,
      'Consulta criada pelo teste 11'
    ).to.exist;

    const dataFormatada = consultaCriada.dataFormatada;
    const horarioConsulta = consultaCriada.horario;

    // Monitorar o carregamento das consultas
    cy.intercept('GET', '**/consultas').as('listarConsultas');

    // Abrir a página de consultas
    cy.get('button[data-pagina="consultas"]')
      .should('be.visible')
      .click();

    cy.wait('@listarConsultas');

    cy.get('#pagina-consultas')
      .should('be.visible');

    // Localizar a consulta do teste
   const localizarConsulta = () =>
  cy.get(
    `#lista-consultas tr[data-consulta-id="${consultaCriada.id}"]`
  );

    // Confirmar que a consulta está agendada
    localizarConsulta()
      .should('contain.text', 'Agendada');

    // Aceitar a confirmação de cancelamento
    cy.on('window:confirm', () => true);

    // Monitorar a requisição de cancelamento
    cy.intercept('DELETE', '**/consultas/*')
      .as('cancelarConsulta');

    // Clicar no botão Cancelar
    localizarConsulta()
      .within(() => {
        cy.contains('button', 'Cancelar')
          .should('be.visible')
          .click();
      });

    // Confirmar que o servidor aceitou o cancelamento
    cy.wait('@cancelarConsulta')
      .its('response.statusCode')
      .should('be.oneOf', [200, 204]);

    // Verificar se o status mudou para Cancelada
    localizarConsulta()
      .should('contain.text', 'Cancelada');

    // Confirmar mensagem de sucesso
    cy.get('#aviso')
      .should('contain.text', 'Consulta cancelada com sucesso!');
  });

});
