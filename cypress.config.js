const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:8003",

    setupNodeEvents(on, config) {
      // Configurações adicionais do Cypress
    },
  },
});