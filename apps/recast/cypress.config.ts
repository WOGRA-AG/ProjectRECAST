import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://e2e.recast.wogra.com',
    defaultCommandTimeout: 30000,
    experimentalStudio: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
