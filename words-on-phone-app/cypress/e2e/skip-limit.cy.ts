describe('Skip Limit Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should disable Pass button when skip limit is reached', () => {
    // Open settings and set skip limit to 2
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').should('be.visible');
    cy.get('#skip-limit').invoke('val', 2).trigger('change');
    
    // Verify the skip limit is set
    cy.get('label[for="skip-limit"]').should('contain', 'Skip Limit: 2');
    
    // Start the game
    cy.get('[aria-label="Start game"]').click();
    
    // Verify we're in game mode
    cy.get('.current-phrase').should('be.visible');
    cy.get('[aria-label="Skip phrase"]').should('be.visible').should('not.be.disabled');
    cy.get('.skip-counter').should('contain', 'Skips left: 2');
    
    // Skip first phrase
    cy.get('[aria-label="Skip phrase"]').click();
    cy.get('.skip-counter').should('contain', 'Skips left: 1');
    cy.get('[aria-label="Skip phrase"]').should('not.be.disabled');
    
    // Skip second phrase
    cy.get('[aria-label="Skip phrase"]').click();
    cy.get('.skip-counter').should('contain', 'Skips left: 0');
    cy.get('[aria-label="Skip phrase"]').should('be.disabled');
    
    // Verify Pass button is disabled and styled correctly
    cy.get('[aria-label="Skip phrase"]').should('have.css', 'cursor', 'not-allowed');
  });

  it('should reset skips when marking a phrase as correct', () => {
    // Set skip limit to 3
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').invoke('val', 3).trigger('change');
    cy.get('[aria-label="Start game"]').click();
    
    // Use up 2 skips
    cy.get('[aria-label="Skip phrase"]').click();
    cy.get('[aria-label="Skip phrase"]').click();
    cy.get('.skip-counter').should('contain', 'Skips left: 1');
    
    // Mark phrase as correct
    cy.get('[aria-label="Mark phrase as correct"]').click();
    
    // Verify skips are reset
    cy.get('.skip-counter').should('contain', 'Skips left: 3');
    cy.get('[aria-label="Skip phrase"]').should('not.be.disabled');
  });

  it('should work with unlimited skips (skip limit = 0)', () => {
    // Set skip limit to unlimited
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').invoke('val', 0).trigger('change');
    cy.get('label[for="skip-limit"]').should('contain', 'Skip Limit: Unlimited');
    cy.get('[aria-label="Start game"]').click();
    
    // Skip counter should not be visible for unlimited skips
    cy.get('.skip-counter').should('not.exist');
    
    // Skip multiple phrases - button should never be disabled
    for (let i = 0; i < 10; i++) {
      cy.get('[aria-label="Skip phrase"]').should('not.be.disabled').click();
    }
    
    cy.get('[aria-label="Skip phrase"]').should('not.be.disabled');
  });

  it('should persist skip limit setting across sessions', () => {
    // Set skip limit to 1
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').invoke('val', 1).trigger('change');
    cy.get('label[for="skip-limit"]').should('contain', 'Skip Limit: 1');
    
    // Reload the page
    cy.reload();
    
    // Check that the setting persisted
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').should('have.value', '1');
    cy.get('label[for="skip-limit"]').should('contain', 'Skip Limit: 1');
  });

  it('should handle settings changes during gameplay', () => {
    // Start with skip limit of 2
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').invoke('val', 2).trigger('change');
    cy.get('[aria-label="Start game"]').click();
    
    // Use 1 skip
    cy.get('[aria-label="Skip phrase"]').click();
    cy.get('.skip-counter').should('contain', 'Skips left: 1');
    
    // Pause game to access settings
    cy.get('[aria-label="Pause game"]').click();
    
    // Change skip limit to unlimited
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#skip-limit').invoke('val', 0).trigger('change');
    
    // Resume game
    cy.get('button').contains('Resume').click();
    
    // Skip counter should be hidden now
    cy.get('.skip-counter').should('not.exist');
    cy.get('[aria-label="Skip phrase"]').should('not.be.disabled');
  });
}); 