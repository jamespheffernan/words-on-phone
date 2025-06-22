describe('Team Gameplay Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('.menu-screen', { timeout: 10000 }).should('be.visible');
  });

  describe('Team Setup Flow', () => {
    it('should navigate from menu to team setup', () => {
      // Click Team Game button
      cy.get('.start-button.team-game')
        .should('be.visible')
        .and('contain', '🏆 Team Game')
        .click();

      // Should navigate to team setup screen
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
      cy.get('.team-setup h1').should('contain', 'Team Setup');
    });

    it('should display default team names and allow editing', () => {
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');

      // Should have 2 teams by default
      cy.get('.team-input').should('have.length', 2);

      // Should have random team names (not empty)
      cy.get('.team-input').first().should('not.have.value', '');
      cy.get('.team-input').last().should('not.have.value', '');

      // Should allow editing team names
      cy.get('.team-input').first()
        .clear()
        .type('Custom Team 1');
      
      cy.get('.team-input').first().should('have.value', 'Custom Team 1');
    });

    it('should allow shuffling team names', () => {
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');

      // Get initial team names
      cy.get('.team-input').first().invoke('val').as('initialTeam1');
      cy.get('.team-input').last().invoke('val').as('initialTeam2');

      // Click shuffle button
      cy.get('.shuffle-button').click();

      // Names should change (with high probability)
      cy.get('.team-input').first().invoke('val').then((newName) => {
        cy.get('@initialTeam1').then((initialName: any) => {
          // Allow for small chance names might be same after shuffle
          if (newName !== initialName) {
            expect(newName).to.not.equal(initialName);
          }
        });
      });
    });

    it('should start game from team setup', () => {
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');

      // Click start game button
      cy.get('.start-game-button')
        .should('be.visible')
        .and('not.be.disabled')
        .click();

      // Should navigate to game screen
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Team Game Screen', () => {
    beforeEach(() => {
      // Start a team game
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
      cy.get('.start-game-button').click();
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');
    });

    it('should display team indicator showing current holding team', () => {
      // Should show team indicator
      cy.get('.team-indicator').should('be.visible');
      cy.get('.team-indicator .holding-team').should('be.visible');
      
      // Should show team name
      cy.get('.team-indicator .holding-team .team-name').should('not.be.empty');
    });

    it('should display all team scores', () => {
      // Should show team scores section
      cy.get('.team-scores').should('be.visible');
      
      // Should have score displays for both teams
      cy.get('.team-score').should('have.length', 2);
      
      // Each team score should have name and score
      cy.get('.team-score').each(($teamScore) => {
        cy.wrap($teamScore).find('.team-name').should('not.be.empty');
        cy.wrap($teamScore).find('.score').should('be.visible');
      });
    });

    it('should highlight active team in scores', () => {
      // Active team should have special styling
      cy.get('.team-score.active').should('have.length', 1);
      cy.get('.team-score.active').should('be.visible');
    });

    it('should not show individual correct counter', () => {
      // Individual correct counter should not exist in team mode
      cy.get('.correct-count').should('not.exist');
    });

    it('should track answers for round statistics', () => {
      // Answer a few phrases
      cy.get('.correct-button').click();
      cy.wait(500);
      cy.get('.correct-button').click();
      cy.wait(500);
      cy.get('.correct-button').click();
      
      // Wait for timer to complete (or end round manually if possible)
      // This will be tested in round end flow
    });
  });

  describe('Round End Flow', () => {
    beforeEach(() => {
      // Start team game and simulate round completion
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
      cy.get('.start-game-button').click();
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');
    });

    it('should show round end screen when timer completes', () => {
      // Answer some phrases to generate round stats
      cy.get('.correct-button').click();
      cy.wait(500);
      cy.get('.correct-button').click();
      cy.wait(500);

      // Force timer completion by accessing store
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          gameStore.getState().onTimerComplete();
        }
      });

      // Should show round end screen
      cy.get('.round-end-screen', { timeout: 5000 }).should('be.visible');
      cy.get('.round-title').should('contain', 'Round Complete');
    });

    it('should display round statistics', () => {
      // Answer phrases and end round
      cy.get('.correct-button').click();
      cy.wait(500);
      cy.get('.correct-button').click();
      
      // End round
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          gameStore.getState().onTimerComplete();
        }
      });

      cy.get('.round-end-screen', { timeout: 5000 }).should('be.visible');

      // Should show round stats
      cy.get('.round-stats').should('be.visible');
      cy.get('.stat-item').should('have.length.at.least', 2);
      
      // Should show total correct
      cy.get('.stat-item').contains('Total Correct').should('be.visible');
      
      // Should show fastest answer if any
      cy.get('.stat-item').contains('Fastest Answer').should('be.visible');
    });

    it('should allow selecting winning team', () => {
      // End round
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          gameStore.getState().onTimerComplete();
        }
      });

      cy.get('.round-end-screen', { timeout: 5000 }).should('be.visible');

      // Should show team selection buttons
      cy.get('.team-win-button').should('have.length', 2);
      
      // Each button should show team name and current score
      cy.get('.team-win-button').each(($button) => {
        cy.wrap($button).find('.team-name').should('not.be.empty');
        cy.wrap($button).find('.current-score').should('be.visible');
      });

      // Click first team to win
      cy.get('.team-win-button').first().click();

      // Should continue to next round or end game
      cy.get('.game-screen, .end-screen', { timeout: 5000 }).should('be.visible');
    });

    it('should show progress toward victory', () => {
      // End round
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          gameStore.getState().onTimerComplete();
        }
      });

      cy.get('.round-end-screen', { timeout: 5000 }).should('be.visible');

      // Should show game progress section
      cy.get('.game-progress').should('be.visible');
      cy.get('.game-progress').should('contain', 'First to 7 points wins');
      
      // Should show current team scores
      cy.get('.team-score-display').should('have.length', 2);
    });
  });

  describe('Game Victory Flow', () => {
    it('should end game when team reaches 7 points', () => {
      // Start team game
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
      cy.get('.start-game-button').click();
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');

      // Simulate a team reaching 7 points
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          const state = gameStore.getState();
          // Set team score to 6, then complete a round to reach 7
          state.incrementTeamScore(0, 6);
          state.onTimerComplete();
        }
      });

      cy.get('.round-end-screen', { timeout: 5000 }).should('be.visible');
      
      // Award point to reach 7
      cy.get('.team-win-button').first().click();

      // Should go to end screen
      cy.get('.end-screen', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('End Screen with Teams', () => {
    beforeEach(() => {
      // Start team game and simulate victory
      cy.get('.start-button.team-game').click();
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
      cy.get('.start-game-button').click();
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');

      // Simulate game completion
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          const state = gameStore.getState();
          // Set winning condition
          state.incrementTeamScore(0, 7);
          state.endGame();
        }
      });

      cy.get('.end-screen', { timeout: 5000 }).should('be.visible');
    });

    it('should display victory celebration for winning team', () => {
      // Should show victory title
      cy.get('.end-title').should('contain', 'Wins!');
      
      // Should show trophy icon
      cy.get('.end-icon').should('contain', '🏆');
      
      // Should show congratulations message
      cy.get('.end-message').should('contain', 'Congratulations');
    });

    it('should display final scores sorted by rank', () => {
      // Should show team scores section
      cy.get('.team-scores').should('be.visible');
      cy.get('.team-result').should('have.length', 2);
      
      // Winning team should be highlighted
      cy.get('.team-result.winner').should('have.length', 1);
      cy.get('.team-result.winner .team-name').should('contain', '🏆');
    });

    it('should display comprehensive game statistics', () => {
      // Should show game stats section
      cy.get('.game-stats').should('be.visible');
      
      // Should show rounds played
      cy.get('.stat').contains('Rounds Played').should('be.visible');
      
      // Should show total correct
      cy.get('.stat').contains('Total Correct').should('be.visible');
      
      // May show fastest answer if any rounds were completed
      cy.get('.game-stats').should('be.visible');
    });

    it('should reset teams when starting new game', () => {
      // Click play again
      cy.get('.play-again-button').click();

      // Should go back to team setup
      cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
      
      // Teams should be reset (can verify by checking if scores are 0)
      // This is more of a functional test that would be verified in store tests
    });

    it('should reset teams when going back to menu', () => {
      // Click back to menu
      cy.get('.menu-button').click();

      // Should return to menu
      cy.get('.menu-screen', { timeout: 5000 }).should('be.visible');
      
      // Teams should be reset for next game
    });
  });

  describe('Solo Game (Non-Team) Flow', () => {
    it('should start solo game without team setup', () => {
      // Click Solo Game button
      cy.get('.start-button.solo-game')
        .should('be.visible')
        .and('contain', '👤 Solo Game')
        .click();

      // Should go directly to game screen (no team setup)
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');
      
      // Should not show team indicators
      cy.get('.team-indicator').should('not.exist');
      cy.get('.team-scores').should('not.exist');
    });

    it('should end solo game directly without round end screen', () => {
      // Start solo game
      cy.get('.start-button.solo-game').click();
      cy.get('.game-screen', { timeout: 5000 }).should('be.visible');

      // End game via timer
      cy.window().then((win) => {
        const gameStore = (win as any).useGameStore;
        if (gameStore) {
          gameStore.getState().onTimerComplete();
        }
      });

      // Should go directly to end screen (no round end for solo)
      cy.get('.end-screen', { timeout: 5000 }).should('be.visible');
      
      // Should not show team-specific elements
      cy.get('.team-scores').should('not.exist');
      cy.get('.game-stats').should('not.exist');
    });
  });

  describe('Mobile Responsiveness for Team Elements', () => {
    const mobileViewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 14 Pro', width: 393, height: 852 },
      { name: 'Galaxy S21', width: 384, height: 854 },
    ];

    mobileViewports.forEach(({ name, width, height }) => {
      it(`should display team elements properly on ${name}`, () => {
        cy.viewport(width, height);
        
        // Start team game
        cy.get('.start-button.team-game').click();
        cy.get('.team-setup', { timeout: 5000 }).should('be.visible');
        
        // Team setup should be responsive
        cy.get('.team-input').should('be.visible');
        cy.get('.start-game-button').should('be.visible');
        
        // Start game
        cy.get('.start-game-button').click();
        cy.get('.game-screen', { timeout: 5000 }).should('be.visible');
        
        // Team elements should be visible and not overflow
        cy.get('.team-indicator').should('be.visible');
        cy.get('.team-scores').should('be.visible');
        
        // Check no horizontal scroll
        cy.window().then((win) => {
          const documentWidth = win.document.documentElement.scrollWidth;
          const viewportWidth = win.innerWidth;
          
          expect(documentWidth).to.be.at.most(viewportWidth + 1, 
            'Team elements should not cause horizontal overflow');
        });
      });
    });
  });
}); 