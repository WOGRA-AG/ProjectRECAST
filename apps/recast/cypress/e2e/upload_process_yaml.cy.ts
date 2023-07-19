import { login, logout } from '../utils/e2e.login';
import { shortTimeout, mediumTimeout, longTimeout } from '../support/timeouts';

beforeEach('login', () => {
  login();
});

after('logout', () => {
  logout();
});
beforeEach(() => {
  cy.visit('/overview');
});

describe('Processes', () => {
  const waitForUpdate: number = longTimeout;
  const waitForDelete: number = shortTimeout;

  it('add process from yaml and delete it', () => {
    cy.visit('/overview');
    cy.get('#mat-tab-label-0-2').click();
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
