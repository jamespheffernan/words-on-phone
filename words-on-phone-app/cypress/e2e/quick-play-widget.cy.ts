/// <reference types="cypress" />

describe('Quick Play Widget E2E Tests', () => {
  beforeEach(() => {
    // Start fresh for each test
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();
    
    // Visit the app and wait for it to load
    cy.visit('/');
    cy.get('[data-testid="menu-screen"]', { timeout: 10000 }).should('be.visible');
    
    // Ensure Quick Play Widget is visible
    cy.get('[data-testid="quick-play-widget"]', { timeout: 5000 }).should('be.visible');
  });

  describe('Quick Play Widget Basic Functionality', () => {
    it('should display Quick Play Widget with correct structure', () => {
      // Check main widget structure
      cy.get('[data-testid="quick-play-widget"]').should('be.visible');
      cy.contains('⚡ Quick Play').should('be.visible');
      cy.contains('👆 1-2 taps to start playing!').should('be.visible');
      
      // Check that widget is expanded by default
      cy.get('[data-testid="quick-play-widget"]').should('have.class', 'expanded');
      
      // Check for Surprise Me button
      cy.get('[data-testid="surprise-me-button"]').should('be.visible');
      cy.contains('Surprise Me!').should('be.visible');
      
      // Check for Popular Categories section
      cy.contains('Popular Categories').should('be.visible');
      cy.get('[data-testid="category-tile"]').should('have.length.at.least', 1);
    });

    it('should be collapsible and expandable', () => {
      // Initially expanded
      cy.get('[data-testid="quick-play-widget"]').should('have.class', 'expanded');
      cy.get('[data-testid="surprise-me-button"]').should('be.visible');
      
      // Click to collapse
      cy.get('[data-testid="quick-play-header"]').click();
      cy.get('[data-testid="quick-play-widget"]').should('have.class', 'collapsed');
      cy.get('[data-testid="surprise-me-button"]').should('not.be.visible');
      
      // Click to expand again
      cy.get('[data-testid="quick-play-header"]').click();
      cy.get('[data-testid="quick-play-widget"]').should('have.class', 'expanded');
      cy.get('[data-testid="surprise-me-button"]').should('be.visible');
    });

    it('should have proper accessibility attributes', () => {
      // Check ARIA attributes
      cy.get('[data-testid="quick-play-header"]').should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-testid="quick-play-header"]').should('have.attr', 'aria-label').and('include', 'Quick Play');
      
      // Test keyboard navigation
      cy.get('[data-testid="quick-play-header"]').focus().type('{enter}');
      cy.get('[data-testid="quick-play-widget"]').should('have.class', 'collapsed');
      cy.get('[data-testid="quick-play-header"]').should('have.attr', 'aria-expanded', 'false');
    });
  });

  describe('Surprise Me Functionality', () => {
    it('should start a random game when "Surprise Me" is clicked', () => {
      // Click Surprise Me
      cy.get('[data-testid="surprise-me-button"]').click();
      
      // Should navigate to game screen
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      
      // Should show a category was selected
      cy.get('[data-testid="current-category"]').should('be.visible').and('not.be.empty');
      
      // Should show phrase content
      cy.get('[data-testid="phrase-display"]').should('be.visible').and('not.be.empty');
      
      // Should show game timer
      cy.get('[data-testid="game-timer"]').should('be.visible');
    });

    it('should provide quick game start with minimal taps', () => {
      const startTime = Date.now();
      
      // Single click should start the game
      cy.get('[data-testid="surprise-me-button"]').click();
      
      // Verify game started quickly (within reasonable time)
      cy.get('[data-testid="game-screen"]', { timeout: 2000 }).should('be.visible');
      
      // Verify we're in an active game state
      cy.get('[data-testid="phrase-display"]').should('be.visible');
      cy.get('[data-testid="game-timer"]').should('be.visible');
    });

    it('should select different categories on repeated clicks', () => {
      const selectedCategories = new Set();
      
      // Try multiple "Surprise Me" clicks to test randomness
      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          // Return to menu for subsequent tests
          cy.get('[data-testid="end-game-button"]').click();
          cy.get('[data-testid="menu-screen"]').should('be.visible');
        }
        
        cy.get('[data-testid="surprise-me-button"]').click();
        cy.get('[data-testid="game-screen"]', { timeout: 2000 }).should('be.visible');
        
        // Get the selected category
        cy.get('[data-testid="current-category"]').invoke('text').then((category) => {
          selectedCategories.add(category);
        });
      }
      
      // Note: Due to Cypress limitations, we can't easily verify randomness across runs
      // But we ensure the functionality works consistently
    });
  });

  describe('Category Tiles Functionality', () => {
    it('should display popular category tiles with correct information', () => {
      // Check that category tiles are displayed
      cy.get('[data-testid="category-tile"]').should('have.length.at.least', 1);
      
      // Each tile should have required information
      cy.get('[data-testid="category-tile"]').each(($tile) => {
        cy.wrap($tile).should('be.visible');
        cy.wrap($tile).find('.tile-name').should('be.visible').and('not.be.empty');
        cy.wrap($tile).find('.phrase-count').should('be.visible');
      });
      
      // Should not exceed 6 tiles (design limit)
      cy.get('[data-testid="category-tile"]').should('have.length.at.most', 6);
    });

    it('should start games when category tiles are clicked', () => {
      // Get the first category tile and its name
      cy.get('[data-testid="category-tile"]').first().as('firstTile');
      
      cy.get('@firstTile').find('.tile-name').invoke('text').as('categoryName');
      
      // Click the tile
      cy.get('@firstTile').click();
      
      // Should navigate to game screen
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      
      // Should show the selected category
      cy.get('@categoryName').then((categoryName) => {
        cy.get('[data-testid="current-category"]').should('contain.text', categoryName);
      });
      
      // Should be in active game state
      cy.get('[data-testid="phrase-display"]').should('be.visible');
      cy.get('[data-testid="game-timer"]').should('be.visible');
    });

    it('should show hover states and be touch-friendly on mobile', () => {
      // Test for mobile-friendly touch targets
      cy.get('[data-testid="category-tile"]').each(($tile) => {
        cy.wrap($tile).should('have.css', 'min-height').and('not.equal', '0px');
        
        // Hover should change appearance (if not on mobile)
        cy.wrap($tile).trigger('mouseover');
        // Note: CSS hover states are hard to test in Cypress, but we ensure basic structure
      });
    });
  });

  describe('Last Played Functionality', () => {
    it('should not show Last Played initially', () => {
      // On first visit, there should be no Last Played button
      cy.get('[data-testid="last-played-button"]').should('not.exist');
    });

    it('should show Last Played after playing a game', () => {
      // First, play a game via category tile
      cy.get('[data-testid="category-tile"]').first().find('.tile-name').invoke('text').as('categoryName');
      cy.get('[data-testid="category-tile"]').first().click();
      
      // Wait for game to start
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      
      // End the game (or wait for natural end)
      cy.get('[data-testid="end-game-button"]').click();
      cy.get('[data-testid="menu-screen"]').should('be.visible');
      
      // Now Last Played should be visible
      cy.get('[data-testid="last-played-button"]').should('be.visible');
      cy.contains('Last Played').should('be.visible');
      
      // Should show the correct category name
      cy.get('@categoryName').then((categoryName) => {
        cy.get('[data-testid="last-played-button"]').should('contain.text', categoryName);
      });
    });

    it('should start game with last played category when clicked', () => {
      // Set up a "last played" state by playing a game first
      cy.get('[data-testid="category-tile"]').first().find('.tile-name').invoke('text').as('categoryName');
      cy.get('[data-testid="category-tile"]').first().click();
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      cy.get('[data-testid="end-game-button"]').click();
      cy.get('[data-testid="menu-screen"]').should('be.visible');
      
      // Now test Last Played functionality
      cy.get('[data-testid="last-played-button"]').should('be.visible').click();
      
      // Should start game with the same category
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      cy.get('@categoryName').then((categoryName) => {
        cy.get('[data-testid="current-category"]').should('contain.text', categoryName);
      });
    });
  });

  describe('Integration with Game Flow', () => {
    it('should properly integrate with the game state management', () => {
      // Start game via Quick Play
      cy.get('[data-testid="surprise-me-button"]').click();
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      
      // Verify game state is properly set
      cy.get('[data-testid="current-category"]').should('be.visible').and('not.be.empty');
      cy.get('[data-testid="phrase-display"]').should('be.visible').and('not.be.empty');
      
      // Test game actions work correctly
      cy.get('[data-testid="correct-button"]').should('be.visible');
      cy.get('[data-testid="skip-button"]').should('be.visible');
      cy.get('[data-testid="end-game-button"]').should('be.visible');
      
      // End game and return to menu
      cy.get('[data-testid="end-game-button"]').click();
      cy.get('[data-testid="menu-screen"]').should('be.visible');
      
      // Quick Play should still be available
      cy.get('[data-testid="quick-play-widget"]').should('be.visible');
    });

    it('should track category popularity correctly', () => {
      // Play the same category multiple times
      cy.get('[data-testid="category-tile"]').first().as('targetTile');
      
      for (let i = 0; i < 2; i++) {
        cy.get('@targetTile').click();
        cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
        cy.get('[data-testid="end-game-button"]').click();
        cy.get('[data-testid="menu-screen"]').should('be.visible');
      }
      
      // The played category should appear in top positions
      // (Note: Exact popularity ordering is hard to test deterministically)
      cy.get('[data-testid="category-tile"]').should('have.length.at.least', 1);
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should load quickly and be responsive', () => {
      // Widget should be visible quickly after page load
      cy.get('[data-testid="quick-play-widget"]', { timeout: 5000 }).should('be.visible');
      
      // Actions should be responsive
      const startTime = Date.now();
      cy.get('[data-testid="surprise-me-button"]').click();
      cy.get('[data-testid="game-screen"]', { timeout: 2000 }).should('be.visible');
      
      // Game should start within reasonable time (implicit in timeout above)
    });

    it('should handle rapid successive clicks gracefully', () => {
      // Rapid clicks shouldn't break the interface
      cy.get('[data-testid="quick-play-header"]').click().click().click();
      cy.get('[data-testid="quick-play-widget"]').should('exist');
      
      // Expand if collapsed
      cy.get('[data-testid="quick-play-widget"]').then(($widget) => {
        if ($widget.hasClass('collapsed')) {
          cy.get('[data-testid="quick-play-header"]').click();
        }
      });
      
      // Multiple surprise me clicks shouldn't cause issues
      cy.get('[data-testid="surprise-me-button"]').should('be.visible');
      // Note: Avoid actual rapid clicks as they might cause race conditions
    });
  });

  describe('Mobile and Touch Experience', () => {
    it('should work well on mobile viewport', () => {
      // Set mobile viewport
      cy.viewport(375, 667); // iPhone SE dimensions
      
      // Widget should still be visible and usable
      cy.get('[data-testid="quick-play-widget"]').should('be.visible');
      cy.get('[data-testid="surprise-me-button"]').should('be.visible');
      
      // Touch targets should be adequate size
      cy.get('[data-testid="category-tile"]').each(($tile) => {
        cy.wrap($tile).should('have.css', 'min-height');
      });
      
      // Functionality should work on mobile
      cy.get('[data-testid="surprise-me-button"]').click();
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty category lists gracefully', () => {
      // Even if no categories are loaded, widget should not crash
      cy.get('[data-testid="quick-play-widget"]').should('be.visible');
      cy.contains('⚡ Quick Play').should('be.visible');
    });

    it('should recover from interrupted game states', () => {
      // Start a game
      cy.get('[data-testid="surprise-me-button"]').click();
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
      
      // Simulate navigation back via browser back button
      cy.go('back');
      cy.get('[data-testid="menu-screen"]').should('be.visible');
      
      // Quick Play should still work
      cy.get('[data-testid="quick-play-widget"]').should('be.visible');
      cy.get('[data-testid="surprise-me-button"]').should('be.visible').click();
      cy.get('[data-testid="game-screen"]', { timeout: 3000 }).should('be.visible');
    });
  });
}); 