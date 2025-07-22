# PostHog Event Schema for Words on Phone

## Naming Conventions
- **Event names**: snake_case (e.g., `game_started`)
- **Property keys**: camelCase (e.g., `categoryName`)
- **Values**: Use consistent enums where possible

## Super Properties (Set Once Per Session)
These properties are automatically attached to every event:

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `appVersion` | string | App version from package.json | `"0.0.0-105fb2da"` |
| `platform` | string | Platform detection | `"web"`, `"ios"`, `"android"` |
| `buildTimestamp` | string | Build timestamp | `"2025-01-15T10:30:00Z"` |
| `isPwaInstall` | boolean | Whether app is PWA installed | `true`, `false` |
| `isOptedOut` | boolean | Analytics opt-out status | `true`, `false` |

## User Properties (People Properties)
Updated periodically to track user behavior over time:

| Property | Type | Description |
|----------|------|-------------|
| `installDate` | string | First app_start timestamp |
| `totalGamesPlayed` | number | Cumulative games completed |
| `totalCorrectAnswers` | number | Cumulative correct answers |
| `lastActiveDate` | string | Most recent app_start timestamp |
| `favoriteCategory` | string | Most frequently selected category |

---

## Core Events

### 1. Lifecycle Events

#### `app_start`
**Trigger**: App loaded and React mounted  
**Primary Metric**: Daily Active Users (DAU)

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `launchSource` | string | How user accessed app | `"direct"`, `"pwa_icon"`, `"share_link"` |
| `hasSavedState` | boolean | Whether game state was restored | `true`, `false` |
| `loadTimeMs` | number | Time from page load to React ready | `1200` |

#### `app_exit`
**Trigger**: Visibility change to hidden/unload  
**Primary Metric**: Average Session Length

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `sessionDurationMs` | number | Total session time | `180000` (3 minutes) |
| `gamesPlayed` | number | Games completed this session | `2` |
| `exitReason` | string | How session ended | `"visibility_change"`, `"page_unload"` |

#### `install`
**Trigger**: First ever app_start on device  
**Primary Metric**: New Installs

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `platform` | string | Installation platform | `"web"`, `"ios"` |
| `appVersion` | string | Version at install | `"0.0.0-105fb2da"` |
| `referrer` | string | Document referrer if available | `"https://google.com"` |

### 2. Navigation Events

#### `screen_viewed`
**Trigger**: React Route change or major modal opened  
**Primary Metric**: Screen Popularity

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `screenName` | string | Screen identifier | `"Home"`, `"CategorySelector"`, `"GameScreen"`, `"Settings"`, `"ReviewPage"` |
| `previousScreen` | string | Previous screen name | `"Home"`, `"CategorySelector"` |
| `navigationMethod` | string | How user navigated | `"button_click"`, `"back_button"`, `"auto_redirect"` |

### 3. Category Selection Events

#### `category_selected`
**Trigger**: User taps a category tile  
**Primary Metric**: Category Popularity

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `categoryName` | string | Selected category | `"Movies & TV"`, `"Food & Drink"` |
| `source` | string | Selection method | `"grid"`, `"quick_play"`, `"surprise_me"`, `"last_played"` |
| `categoryGroup` | string | Category grouping | `"Entertainment"`, `"Daily Life"` |
| `selectionIndex` | number | Position in list/grid | `0`, `5` |
| `isMultiSelect` | boolean | Whether multi-select mode | `true`, `false` |

#### `surprise_me_clicked`
**Trigger**: User clicks "Surprise Me" button  
**Primary Metric**: Feature Adoption

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `selectedCategory` | string | Random category chosen | `"Nature & Animals"` |
| `availableCategories` | number | Total categories available | `20` |

### 4. Gameplay Events

#### `game_started`
**Trigger**: User taps "Start" or auto-start from quick play  
**Primary Metric**: Game Starts

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `categoryName` | string | Selected category | `"Movies & TV"` |
| `timerMode` | string | Timer display mode | `"hidden"`, `"visible"`, `"random"` |
| `isTeamMode` | boolean | Whether team mode enabled | `true`, `false` |
| `teamCount` | number | Number of teams (if team mode) | `2`, `3` |
| `skipLimit` | number | Skip limit setting | `3`, `5`, `999` |
| `gameId` | string | Unique game identifier | `"game_1642678890123"` |
| `phraseCount` | number | Available phrases in category | `76` |

#### `phrase_shown`
**Trigger**: Phrase rendered in GameScreen  
**Primary Metric**: Phrase Exposure Rate  
**Sampling**: 25% to control volume

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `phraseId` | string | Unique phrase identifier | `"phrase_123"` |
| `categoryName` | string | Phrase category | `"Movies & TV"` |
| `phraseLength` | number | Character count | `15` |
| `timeRemaining` | number | Timer remaining (ms) | `45000` |
| `roundNumber` | number | Current round | `1`, `2` |

#### `answer_correct`
**Trigger**: Correct button tap  
**Primary Metric**: Conversion Rate

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `phraseId` | string | Phrase that was guessed | `"phrase_123"` |
| `timeRemaining` | number | Time left when answered | `30000` |
| `teamName` | string | Team that scored (if team mode) | `"Team A"`, `null` |
| `scoreAfter` | number | Score after this answer | `5` |
| `responseTimeMs` | number | Time from phrase_shown to answer | `8000` |

#### `answer_pass`
**Trigger**: Pass button tap  
**Primary Metric**: Pass Rate

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `phraseId` | string | Phrase that was passed | `"phrase_456"` |
| `reason` | string | Why passed | `"skip_limit"`, `"user_pass"` |
| `timeRemaining` | number | Time left when passed | `20000` |
| `skipsRemaining` | number | Skip limit remaining | `2` |

#### `game_completed`
**Trigger**: Game flow ends (timer or score limit)  
**Primary Metric**: Game Completion %, Average Score

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `totalCorrect` | number | Correct answers | `8` |
| `totalPass` | number | Passed phrases | `3` |
| `durationMs` | number | Game duration | `60000` |
| `winningTeam` | string | Winner (if team mode) | `"Team B"`, `null` |
| `gameId` | string | Same as game_started | `"game_1642678890123"` |
| `endReason` | string | How game ended | `"timer"`, `"score_limit"` |
| `finalScores` | object | Team scores (if team mode) | `{"Team A": 5, "Team B": 7}` |

### 5. Settings Events

#### `settings_opened`
**Trigger**: Settings panel opened  
**Primary Metric**: Feature Engagement

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `source` | string | How settings accessed | `"header_button"`, `"first_time_setup"` |

#### `setting_changed`
**Trigger**: User toggles/saves a setting  
**Primary Metric**: Settings Adoption

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `settingName` | string | Setting that changed | `"skipLimit"`, `"timerMode"`, `"soundEnabled"` |
| `previousValue` | any | Value before change | `3`, `"hidden"`, `true` |
| `newValue` | any | Value after change | `5`, `"visible"`, `false` |

### 6. Custom Category Events

#### `category_request_submitted`
**Trigger**: User submits custom category request  
**Primary Metric**: Custom Category Interest

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `requestedCategory` | string | Category requested | `"Video Games"` |
| `phraseCount` | number | Requested phrase count | `25` |
| `requestId` | string | Unique request identifier | `"req_1642678890123"` |

#### `category_generated`
**Trigger**: Category generation completes successfully  
**Primary Metric**: Generation Success Rate

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `requestedCategory` | string | Category that was generated | `"Video Games"` |
| `generatedCount` | number | Phrases actually generated | `23` |
| `provider` | string | AI provider used | `"openai"`, `"gemini"` |
| `requestId` | string | Links to request_submitted | `"req_1642678890123"` |
| `durationMs` | number | Generation time | `15000` |

### 7. PWA & Technical Events

#### `pwa_install_prompt`
**Trigger**: Browser shows PWA install prompt  
**Primary Metric**: PWA Installation Funnel

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `accepted` | boolean | Whether user accepted | `true`, `false` |
| `platform` | string | Platform showing prompt | `"ios_safari"`, `"android_chrome"` |

#### `buzzer_played`
**Trigger**: Buzzer sound triggered  
**Primary Metric**: Audio Reliability

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `durationMs` | number | Buzzer duration | `2000` |
| `origin` | string | What triggered buzzer | `"manual_test"`, `"game_end"` |
| `audioContextState` | string | AudioContext state | `"running"`, `"suspended"` |
| `success` | boolean | Whether sound played | `true`, `false` |

---

## Implementation Notes

### Event Sampling
- `phrase_shown` events are sampled at 25% to control volume
- All other events are captured at 100%

### Error Handling
- Failed events are logged locally but don't block app functionality
- Offline events are queued and sent when connection restored
- Opt-out users generate no network calls

### Data Privacy
- All events use anonymous `distinct_id`
- No personally identifiable information collected
- User can opt-out via settings panel
- Events respect browser Do Not Track headers

### Testing
- Unit tests mock PostHog SDK
- Cypress E2E tests verify events with network stubs
- Manual verification in PostHog UI during development 