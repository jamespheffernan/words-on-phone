describe('Mobile Viewport Tests', () => {
  const mobileViewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 14 Pro', width: 393, height: 852 },
    { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'Galaxy S21', width: 384, height: 854 },
  ];

  const landscapeViewports = [
    { name: 'iPhone SE Landscape', width: 667, height: 375 },
    { name: 'iPhone 14 Pro Landscape', width: 852, height: 393 },
    { name: 'Pixel 5 Landscape', width: 851, height: 393 },
  ];

  beforeEach(() => {
    // Visit the game screen directly
    cy.visit('/');
    
    // Start a game to get to the gameplay screen
    cy.get('.start-button', { timeout: 10000 })
      .should('be.visible')
      .click();
    
    // Wait for game screen to load
    cy.get('.game-screen', { timeout: 5000 }).should('be.visible');
  });

  mobileViewports.forEach(({ name, width, height }) => {
    it(`should not scroll on ${name} (${width}x${height})`, () => {
      cy.viewport(width, height);
      
      // Wait for layout to settle
      cy.wait(500);
      
      // Check that page height does not exceed viewport height
      cy.window().then((win) => {
        const documentHeight = win.document.documentElement.scrollHeight;
        const viewportHeight = win.innerHeight;
        
        expect(documentHeight).to.be.at.most(viewportHeight + 1, 
          `Document height (${documentHeight}px) should not exceed viewport height (${viewportHeight}px)`);
      });
      
      // Verify all critical game elements are visible
      cy.get('.game-header').should('be.visible');
      cy.get('.current-phrase').should('be.visible');
      cy.get('.correct-button').should('be.visible');
      cy.get('.pass-button').should('be.visible');
      
      // Check that action buttons are within viewport
      cy.get('.correct-button').then(($btn) => {
        const rect = $btn[0].getBoundingClientRect();
        expect(rect.bottom).to.be.at.most(height, 
          'Correct button should be fully visible within viewport');
      });
      
      cy.get('.pass-button').then(($btn) => {
        const rect = $btn[0].getBoundingClientRect();
        expect(rect.bottom).to.be.at.most(height, 
          'Pass button should be fully visible within viewport');
      });
    });
  });

  landscapeViewports.forEach(({ name, width, height }) => {
    it(`should not scroll on ${name} (${width}x${height})`, () => {
      cy.viewport(width, height);
      
      // Wait for layout to settle and orientation change
      cy.wait(1000);
      
      // Check that page height does not exceed viewport height
      cy.window().then((win) => {
        const documentHeight = win.document.documentElement.scrollHeight;
        const viewportHeight = win.innerHeight;
        
        expect(documentHeight).to.be.at.most(viewportHeight + 1, 
          `Document height (${documentHeight}px) should not exceed viewport height (${viewportHeight}px) in landscape`);
      });
      
      // Verify all critical game elements are still visible in landscape
      cy.get('.game-header').should('be.visible');
      cy.get('.current-phrase').should('be.visible');
      cy.get('.correct-button').should('be.visible');
      cy.get('.pass-button').should('be.visible');
      
      // In landscape mode with sufficient height, buttons should be horizontal
      if (height >= 500) {
        cy.get('.game-actions').should('satisfy', ($el) => {
          const computedStyle = window.getComputedStyle($el[0]);
          return computedStyle.flexDirection === 'row';
        });
      }
    });
  });

  it('should handle very long phrases without breaking layout', () => {
    cy.viewport(375, 667); // iPhone SE - smallest common viewport
    
    // Mock a very long phrase
    cy.window().then((win) => {
      // Access the game store to set a long phrase
      const gameStore = (win as any).__gameStore;
      if (gameStore) {
        gameStore.getState().setCurrentPhrase(
          'This is an extremely long phrase that should test the wrapping behavior and ensure that even with very long text the layout remains within the viewport boundaries and does not cause any scrolling issues on mobile devices'
        );
      }
    });
    
    // Wait for layout to settle
    cy.wait(500);
    
    // Verify no scroll even with long phrase
    cy.window().then((win) => {
      const documentHeight = win.document.documentElement.scrollHeight;
      const viewportHeight = win.innerHeight;
      
      expect(documentHeight).to.be.at.most(viewportHeight + 1, 
        'Long phrases should not cause viewport overflow');
    });
    
    // Verify phrase is still readable
    cy.get('.current-phrase').should('be.visible');
    cy.get('.correct-button').should('be.visible');
    cy.get('.pass-button').should('be.visible');
  });

  it('should maintain layout integrity during gameplay interactions', () => {
    cy.viewport(393, 852); // iPhone 14 Pro
    
    // Test multiple interactions to ensure layout stays stable
    for (let i = 0; i < 3; i++) {
      // Click correct button
      cy.get('.correct-button').click();
      
      // Wait for new phrase to load
      cy.wait(500);
      
      // Verify no scroll after interaction
      cy.window().then((win) => {
        const documentHeight = win.document.documentElement.scrollHeight;
        const viewportHeight = win.innerHeight;
        
        expect(documentHeight).to.be.at.most(viewportHeight + 1, 
          `Layout should remain stable after interaction ${i + 1}`);
      });
      
      // Verify all elements still visible
      cy.get('.game-header').should('be.visible');
      cy.get('.current-phrase').should('be.visible');
      cy.get('.correct-button').should('be.visible');
      cy.get('.pass-button').should('be.visible');
    }
  });

  it('should handle safe area insets on devices with notches', () => {
    // Simulate iPhone 14 Pro with safe area insets
    cy.viewport(393, 852);
    
    // Add CSS custom properties to simulate safe area insets
    cy.document().then((doc) => {
      const style = doc.createElement('style');
      style.textContent = `
        :root {
          --safe-area-inset-top: 44px;
          --safe-area-inset-bottom: 34px;
          --safe-area-inset-left: 0px;
          --safe-area-inset-right: 0px;
        }
      `;
      doc.head.appendChild(style);
    });
    
    // Wait for styles to apply
    cy.wait(500);
    
    // Verify layout still works with safe area insets
    cy.window().then((win) => {
      const documentHeight = win.document.documentElement.scrollHeight;
      const viewportHeight = win.innerHeight;
      
      expect(documentHeight).to.be.at.most(viewportHeight + 1, 
        'Layout should work with safe area insets');
    });
    
    // Verify content is not clipped by safe areas
    cy.get('.game-header').should('be.visible');
    cy.get('.game-actions').should('be.visible');
  });

  // Header Overlap Detection Tests
  describe('Header Layout - Overlap Prevention', () => {
    mobileViewports.forEach(({ name, width, height }) => {
      it(`should prevent header element overlap on ${name} (${width}x${height})`, () => {
        cy.viewport(width, height);
        
        // Wait for layout to settle
        cy.wait(500);
        
        // Verify skip counter is visible when skip limit > 0
        cy.get('.skip-counter').should('be.visible');
        
        // Get positions of score display and skip counter
        cy.get('.score-display').then(($scoreDisplay) => {
          const scoreRect = $scoreDisplay[0].getBoundingClientRect();
          
          cy.get('.skip-counter').then(($skipCounter) => {
            const skipRect = $skipCounter[0].getBoundingClientRect();
            
            // Verify no vertical overlap - skip counter should be below score display
            expect(skipRect.top).to.be.greaterThan(scoreRect.bottom - 1, 
              `Skip counter (top: ${skipRect.top}) should be below score display (bottom: ${scoreRect.bottom})`);
            
            // Verify proper spacing between elements
            const spacing = skipRect.top - scoreRect.bottom;
            expect(spacing).to.be.greaterThan(4, 
              `Should have at least 4px spacing between score and skip counter, got ${spacing}px`);
          });
        });
        
        // Verify both elements are fully within viewport
        cy.get('.score-display').then(($el) => {
          const rect = $el[0].getBoundingClientRect();
          expect(rect.right).to.be.at.most(width, 'Score display should be within viewport width');
          expect(rect.bottom).to.be.at.most(height, 'Score display should be within viewport height');
        });
        
        cy.get('.skip-counter').then(($el) => {
          const rect = $el[0].getBoundingClientRect();
          expect(rect.right).to.be.at.most(width, 'Skip counter should be within viewport width');
          expect(rect.bottom).to.be.at.most(height, 'Skip counter should be within viewport height');
        });
      });
    });

    landscapeViewports.forEach(({ name, width, height }) => {
      it(`should prevent header element overlap on ${name} (${width}x${height})`, () => {
        cy.viewport(width, height);
        
        // Wait for layout to settle and orientation change
        cy.wait(1000);
        
        // Verify skip counter is visible when skip limit > 0
        cy.get('.skip-counter').should('be.visible');
        
        // Get positions of score display and skip counter
        cy.get('.score-display').then(($scoreDisplay) => {
          const scoreRect = $scoreDisplay[0].getBoundingClientRect();
          
          cy.get('.skip-counter').then(($skipCounter) => {
            const skipRect = $skipCounter[0].getBoundingClientRect();
            
            // Verify no vertical overlap in landscape
            expect(skipRect.top).to.be.greaterThan(scoreRect.bottom - 1, 
              `Skip counter should be below score display in landscape mode`);
            
            // In landscape, spacing might be tighter but should still exist
            const spacing = skipRect.top - scoreRect.bottom;
            expect(spacing).to.be.greaterThan(2, 
              `Should have at least 2px spacing in landscape mode, got ${spacing}px`);
          });
        });
      });
    });

    it('should maintain header layout when skip counter visibility changes', () => {
      cy.viewport(375, 667); // iPhone SE - most constrained
      
      // Initially skip counter should be visible (default skip limit > 0)
      cy.get('.skip-counter').should('be.visible');
      
      // Record initial score display position
      cy.get('.score-display').then(($scoreDisplay) => {
        const initialRect = $scoreDisplay[0].getBoundingClientRect();
        
        // Use skips until none remain to test layout changes
        cy.get('.pass-button').click();
        cy.wait(200);
        cy.get('.pass-button').click();
        cy.wait(200);
        cy.get('.pass-button').click();
        cy.wait(200);
        
        // Skip counter should now be hidden (assuming 3 skip limit)
        cy.get('.skip-counter').should('not.exist');
        
        // Score display position should remain stable
        cy.get('.score-display').then(($scoreDisplay) => {
          const finalRect = $scoreDisplay[0].getBoundingClientRect();
          
          // Position should be very close (allowing for minor layout adjustments)
          expect(Math.abs(finalRect.top - initialRect.top)).to.be.at.most(10, 
            'Score display position should remain stable when skip counter disappears');
        });
      });
    });

    it('should have proper touch targets for header elements', () => {
      cy.viewport(375, 667); // iPhone SE
      
      // Verify minimum touch target sizes (44px iOS standard)
      cy.get('.pause-button').then(($btn) => {
        const rect = $btn[0].getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(40, 'Pause button should have adequate width');
        expect(rect.height).to.be.greaterThan(40, 'Pause button should have adequate height');
      });
      
      // Skip counter should be large enough to read easily
      cy.get('.skip-counter').then(($counter) => {
        const rect = $counter[0].getBoundingClientRect();
        expect(rect.height).to.be.greaterThan(20, 'Skip counter should have adequate height for readability');
      });
      
      // Score display should be readable
      cy.get('.score-display').then(($score) => {
        const rect = $score[0].getBoundingClientRect();
        expect(rect.height).to.be.greaterThan(16, 'Score display should have adequate height for readability');
      });
    });
  });
}); 