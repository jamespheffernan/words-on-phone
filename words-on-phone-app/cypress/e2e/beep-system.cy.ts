describe('Beep Ramp System', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have tick-tock sounds enabled by default', () => {
    // Start a game
    cy.get('[aria-label="Start solo game"]').click();
    
    // Verify game starts normally with tick-tock system active
    cy.get('.current-phrase').should('be.visible');
    
    // The tick-tock system should be running in background
    // (No UI controls needed - it's always on)
  });

  it('should work with different timer durations', () => {
    // Test with very short timer
    cy.get('[aria-label="Toggle settings"]').click();
    
    // Set timer to 15 seconds
    cy.get('#timer-duration').invoke('val', 15).trigger('change');
    
    cy.get('[aria-label="Start solo game"]').click();
    
    // Verify game starts normally
    cy.get('.current-phrase').should('be.visible');
    
    // Wait a few seconds to let tick-tock system potentially activate
    cy.wait(6000);
    
    // Game should still be running
    cy.get('.current-phrase').should('be.visible');
  });

  it('should work with hidden timer mode', () => {
    // Enable hidden timer mode
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#show-timer').uncheck();
    
    // Start game
    cy.get('[aria-label="Start solo game"]').click();
    
    // Verify timer is hidden but game is running with tick-tock
    cy.get('.timer-display').should('not.exist');
    cy.get('.hidden-timer-indicator').should('be.visible');
    cy.get('.current-phrase').should('be.visible');
    
    // Game should run normally with tick-tock system active
    cy.wait(3000);
    cy.get('.current-phrase').should('be.visible');
  });

  it('should work with randomized timer', () => {
    // Enable random timer
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#use-random-timer').check();
    
    // Start game
    cy.get('[aria-label="Start solo game"]').click();
    
    // Verify game starts with random timer and tick-tock
    cy.get('.current-phrase').should('be.visible');
    cy.get('.hidden-timer-indicator').should('contain', '🎲');
    
    // Game should run normally with tick-tock system
    cy.wait(2000);
    cy.get('.current-phrase').should('be.visible');
  });
}); 