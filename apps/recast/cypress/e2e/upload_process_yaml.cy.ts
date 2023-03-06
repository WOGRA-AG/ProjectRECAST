describe('Processes', () => {
  const waitForUpdate: number = 5000;
  const waitForDelete: number = 500;
  beforeEach('login', () => {
    cy.viewport(1280, 720);
    cy.visit('/');
    cy.get('.mdc-button').click();
    cy.get(':nth-child(1) > .pure-material-textfield-outlined > span').click();
    cy.get('#username').clear();
    cy.get('#username').type(Cypress.env('TEST_USER'));
    cy.get(':nth-child(2) > .pure-material-textfield-outlined > span').click();
    cy.get('#password').clear();
    cy.get('#password').type(Cypress.env('TEST_PASSWORD'));
    cy.get('#kc-login > span').click();
    cy.wait(waitForUpdate);
  });

  // afterEach('logout', () => {
  //   cy.visit('https://login.os4ml.wogra.com/logout');
  //   cy.get('#kc-logout').click();
  //   cy.get('#kc-page-title').contains('You are logged out');
  // });

  it('add process from yaml and delete it', () => {
    cy.visit('/overview');
    cy.get('.mat-focus-indicator')
      .its('length')
      .then(len => {
        if (len === 1) {
          cy.get('.mat-focus-indicator').click();
        }
        cy.get('tbody > tr')
          .its('length')
          .then(length => {
            cy.get('app-button-filled > .mdc-button').click();
            cy.get('#file-input')
              .invoke('show')
              .selectFile('cypress/fixtures/example_process.yaml');
            cy.get('app-button-filled > .mdc-button').click();
            cy.wait(waitForUpdate);
            cy.get('tbody > tr').its('length').should('be.gt', length);
            cy.get(
              ':last-child > .cdk-column-isDelete > .cell > app-icon-button.ng-star-inserted > .mdc-icon-button > .mat-mdc-button-touch-target'
            ).click();
            cy.get(
              'app-submit-button > app-button-filled > .mdc-button'
            ).click();
            cy.wait(waitForDelete);
            cy.get('tbody > tr').its('length').should('eq', length);
          });
      });
  });
});
