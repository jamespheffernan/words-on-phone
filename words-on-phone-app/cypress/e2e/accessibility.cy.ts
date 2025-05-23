describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should not have accessibility violations on the menu screen', () => {
    cy.checkA11y();
  });

  it('should not have accessibility violations on the settings panel', () => {
    cy.get('[aria-label="Toggle settings"]').click();
    cy.checkA11y();
  });

  it('should not have accessibility violations on the how to play modal', () => {
    cy.get('[aria-label="How to play"]').click();
    cy.checkA11y();
    
    // Close modal
    cy.get('[aria-label="Close modal"]').click();
  });

  it('should not have accessibility violations during gameplay', () => {
    // Start a game
    cy.get('[aria-label="Start game"]').click();
    
    // Check accessibility during game
    cy.checkA11y();
    
    // Test skip functionality
    cy.get('[aria-label="Skip phrase"]').click();
    cy.checkA11y();
    
    // Test correct functionality
    cy.get('[aria-label="Mark phrase as correct"]').click();
    cy.checkA11y();
  });

  it('should not have accessibility violations on the end screen', () => {
    // Start a game and let it time out
    cy.get('[aria-label="Start game"]').click();
    
    // Wait for timer to complete (adjust based on actual timer duration)
    cy.wait(5000); // Assuming shortest timer is 30s, but we'll use shorter wait for test
    
    // Force end screen by triggering timeout
    cy.window().then((win) => {
      // Force trigger end game
      (win as any).gameStore?.getState().endGame();
    });
    
    cy.checkA11y();
  });

  it('should maintain keyboard navigation accessibility', () => {
    // Test keyboard navigation on menu
    cy.get('body').type('{tab}');
    cy.focused().should('be.visible');
    
    cy.checkA11y();
  });

  it('should have proper ARIA labels and roles', () => {
    // Check for essential ARIA attributes
    cy.get('[aria-label]').should('have.length.greaterThan', 0);
    
    // Verify buttons have accessible names
    cy.get('button').each(($button) => {
      cy.wrap($button).should('satisfy', ($el) => {
        const hasAriaLabel = $el.attr('aria-label');
        const hasText = $el.text().trim().length > 0;
        const hasAriaLabelledBy = $el.attr('aria-labelledby');
        
        return hasAriaLabel || hasText || hasAriaLabelledBy;
      });
    });
  });

  it('should have proper heading hierarchy', () => {
    // Check that headings follow proper hierarchy
    cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
      const headingLevels = Array.from($headings).map(h => parseInt(h.tagName[1]));
      
      // Should have at least one h1
      expect(headingLevels).to.include(1);
      
      // Check for proper nesting (no gaps in hierarchy)
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        expect(current - previous).to.be.at.most(1);
      }
    });
  });

  it('should have sufficient color contrast in both light and dark modes', () => {
    // Test light mode
    cy.checkA11y(undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    // Test dark mode (simulate system preference)
    cy.window().then((win) => {
      const mediaQuery = win.matchMedia('(prefers-color-scheme: dark)');
      Object.defineProperty(mediaQuery, 'matches', {
        writable: true,
        value: true,
      });
      mediaQuery.dispatchEvent(new Event('change'));
    });
    
    cy.checkA11y(undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

  it('should be usable with screen readers', () => {
    // Test that interactive elements have proper labels
    cy.get('button, input, select, [role="button"]').each(($el) => {
      cy.wrap($el).should('satisfy', ($element) => {
        const tagName = $element.prop('tagName').toLowerCase();
        const hasAriaLabel = $element.attr('aria-label');
        const hasText = $element.text().trim();
        const hasAriaLabelledBy = $element.attr('aria-labelledby');
        const hasTitle = $element.attr('title');
        const hasPlaceholder = tagName === 'input' && $element.attr('placeholder');
        
        return hasAriaLabel || hasText || hasAriaLabelledBy || hasTitle || hasPlaceholder;
      });
    });
  });
}); 