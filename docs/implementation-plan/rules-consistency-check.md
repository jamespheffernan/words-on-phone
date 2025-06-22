# Rules Consistency Check Implementation Plan

Branch Name: `feature/rules-consistency`

## Background and Motivation

The official ruleset in `docs/ruleset.md` defines Words on Phone as a hot-potato style team game. We need to ensure all game mechanics align with these rules:

**Core Rules:**
- Teams sit in alternating order and pass device clockwise
- Cannot say words in the phrase, rhymes, or spell letters
- Team NOT holding device when buzzer sounds scores 1 point
- First to 7 points wins
- Optional: +1 bonus if non-holding team guesses visible phrase

**Current Inconsistencies:**
- No enforcement of taboo word penalties
- No clear indication of team alternation
- Missing hot-potato pass mechanics
- No bonus point option for guessing visible phrase

## Key Challenges and Analysis

1. **Taboo Word Detection**: Need to detect when clue-giver says a word from the phrase
2. **Pass Indication**: Need clear UI for "pass device to next team"
3. **Bonus Point**: Need mechanism for non-holding team to guess after buzzer
4. **Alternative Mode**: High-score mode needs proper implementation

## High-level Task Breakdown

### Task 1: Create feature branch
**Success Criteria**: 
- Create and checkout `feature/rules-consistency` branch
- Verify clean git status

### Task 2: Implement taboo word penalty system
**Success Criteria**:
- Add speech recognition for clue-giver monitoring (optional/future)
- Add manual "Taboo!" button for self-reporting
- When pressed, current team keeps device and must continue
- Visual/audio feedback for penalty
- Track penalties in game statistics

### Task 3: Add team alternation indicators
**Success Criteria**:
- Show "Pass to [Next Team Name]" after each correct answer
- Arrow or animation showing clockwise direction
- Visual countdown before allowing next phrase
- Ensure team colors alternate in UI

### Task 4: Implement bonus point mechanism
**Success Criteria**:
- After buzzer, show phrase to all players
- Add "Bonus Point" button for non-holding team
- If they guess correctly, award +1 point
- Track bonus points separately in statistics

### Task 5: Add Alternative High-Score Mode
**Success Criteria**:
- Add game mode selection to menu
- Implement 60-second timed rounds per team
- Track phrases guessed per team
- Best of 3 rounds scoring
- Separate leaderboard for high-score mode

### Task 6: Update game instructions
**Success Criteria**:
- Update HowToPlayModal with official rules
- Add illustrations for seating arrangement
- Explain penalties and bonus points
- Include both game modes

### Task 7: Add rule enforcement settings
**Success Criteria**:
- Settings to enable/disable strict rules
- Toggle for bonus point rule
- Toggle for taboo penalty enforcement
- Persist settings across sessions

### Task 8: Create rules compliance tests
**Success Criteria**:
- Test taboo penalty flow
- Test bonus point awarding
- Test team alternation
- Test both game modes
- All tests pass

## Project Status Board

### TODO:
- [ ] Task 1: Create feature branch
- [ ] Task 2: Implement taboo word penalty system
- [ ] Task 3: Add team alternation indicators
- [ ] Task 4: Implement bonus point mechanism
- [ ] Task 5: Add Alternative High-Score Mode
- [ ] Task 6: Update game instructions
- [ ] Task 7: Add rule enforcement settings
- [ ] Task 8: Create rules compliance tests

### In Progress:

### Completed:

## Executor's Feedback or Assistance Requests

_This section will be updated by the Executor during implementation_

## Lessons Learned

_Lessons learned during implementation will be documented here_ 