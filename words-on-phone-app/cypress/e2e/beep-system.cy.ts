describe('Beep Ramp System', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should enable beep ramp system by default', () => {
    // Open settings
    cy.get('[aria-label="Toggle settings"]').click();
    
    // Check that beep ramp is enabled by default
    cy.get('#enable-beep-ramp').should('be.checked');
    cy.get('label[for="enable-beep-ramp"]').should('contain', 'Enable Beep Ramp');
  });

  it('should allow configuring beep ramp settings', () => {
    // Open settings
    cy.get('[aria-label="Toggle settings"]').click();
    
    // Test beep ramp start time setting
    cy.get('#beep-ramp-start').should('be.visible');
    cy.get('#beep-ramp-start').invoke('val', 15).trigger('change');
    cy.get('label[for="beep-ramp-start"]').should('contain', 'Beep Start: 15s');
    
    // Test first interval setting
    cy.get('#beep-first-interval').should('be.visible');
    cy.get('#beep-first-interval').invoke('val', 800).trigger('change');
    cy.get('label[for="beep-first-interval"]').should('contain', 'First Interval: 800ms');
    
    // Test final interval setting
    cy.get('#beep-final-interval').should('be.visible');
    cy.get('#beep-final-interval').invoke('val', 200).trigger('change');
    cy.get('label[for="beep-final-interval"]').should('contain', 'Final Interval: 200ms');
    
    // Test beep volume setting
    cy.get('#beep-volume').should('be.visible');
    cy.get('#beep-volume').invoke('val', 0.8).trigger('change');
    cy.get('label[for="beep-volume"]').should('contain', 'Beep Volume: 80%');
  });

  it('should persist beep settings across sessions', () => {
    // Configure beep settings
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#enable-beep-ramp').uncheck();
    cy.get('#beep-ramp-start').invoke('val', 25).trigger('change');
    cy.get('#beep-volume').invoke('val', 0.3).trigger('change');
    
    // Reload the page
    cy.reload();
    
    // Check that settings persisted
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#enable-beep-ramp').should('not.be.checked');
    cy.get('#beep-ramp-start').should('have.value', '25');
    cy.get('#beep-volume').should('have.value', '0.3');
  });

  it('should disable beep system when toggle is off', () => {
    // Disable beep ramp
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#enable-beep-ramp').uncheck();
    
    // Start game with short timer to test beep behavior
    cy.get('#timer-duration').invoke('val', 30).trigger('change');
    cy.get('[aria-label="Start game"]').click();
    
    // Wait for game to start
    cy.get('.current-phrase').should('be.visible');
    
    // Since beeps are disabled, we can't directly test audio
    // but we can verify the game runs normally without errors
    cy.wait(2000);
    cy.get('.current-phrase').should('be.visible');
  });

  it('should work with different timer durations', () => {
    // Test with very short timer to trigger beep ramp quickly
    cy.get('[aria-label="Toggle settings"]').click();
    
    // Set beep ramp to start at 10s before end
    cy.get('#beep-ramp-start').invoke('val', 10).trigger('change');
    
    // Set timer to 15 seconds so beep ramp activates at 10s remaining
    cy.get('#timer-duration').invoke('val', 15).trigger('change');
    
    cy.get('[aria-label="Start game"]').click();
    
    // Verify game starts normally
    cy.get('.current-phrase').should('be.visible');
    
    // Wait a few seconds to let beep ramp potentially activate
    cy.wait(6000);
    
    // Game should still be running
    cy.get('.current-phrase').should('be.visible');
  });

  it('should handle beep settings validation', () => {
    cy.get('[aria-label="Toggle settings"]').click();
    
    // Test that final interval cannot be greater than first interval
    cy.get('#beep-first-interval').invoke('val', 500).trigger('change');
    cy.get('#beep-final-interval').invoke('val', 600).trigger('change');
    
    // The system should clamp the final interval to not exceed first interval
    cy.get('#beep-final-interval').should('have.value', '500');
    
    // Test beep ramp start time bounds
    cy.get('#beep-ramp-start').invoke('val', 5).trigger('change');
    cy.get('#beep-ramp-start').should('have.value', '10'); // Should clamp to minimum
    
    cy.get('#beep-ramp-start').invoke('val', 50).trigger('change');
    cy.get('#beep-ramp-start').should('have.value', '40'); // Should clamp to maximum
  });

  it('should work with hidden timer mode', () => {
    // Enable hidden timer mode and beep ramp
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#show-timer').uncheck();
    cy.get('#enable-beep-ramp').check();
    cy.get('#beep-ramp-start').invoke('val', 15).trigger('change');
    
    // Start game
    cy.get('[aria-label="Start game"]').click();
    
    // Verify timer is hidden but game is running
    cy.get('.timer-display').should('not.exist');
    cy.get('.hidden-timer-indicator').should('be.visible');
    cy.get('.current-phrase').should('be.visible');
    
    // Game should run normally with beep system active
    cy.wait(3000);
    cy.get('.current-phrase').should('be.visible');
  });

  it('should work with randomized timer', () => {
    // Enable random timer and beep ramp
    cy.get('[aria-label="Toggle settings"]').click();
    cy.get('#use-random-timer').check();
    cy.get('#enable-beep-ramp').check();
    
    // Start game
    cy.get('[aria-label="Start game"]').click();
    
    // Verify game starts with random timer
    cy.get('.current-phrase').should('be.visible');
    cy.get('.hidden-timer-indicator').should('contain', '🎲');
    
    // Game should run normally with beep system
    cy.wait(2000);
    cy.get('.current-phrase').should('be.visible');
  });
}); 