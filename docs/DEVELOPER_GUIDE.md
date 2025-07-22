# Developer Guide - Words on Phone

*Technical documentation for developers working on Words on Phone*

## 🏗️ Architecture Overview

Words on Phone is built as a React Progressive Web App with TypeScript, focusing on privacy-first analytics and offline gameplay capabilities.

### Core Technologies
- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand with persistence middleware
- **Analytics**: PostHog (privacy-focused, user-controlled)
- **Audio**: Web Audio API with singleton pattern
- **Persistence**: IndexedDB via idb-keyval
- **Testing**: Vitest + React Testing Library

### Key Design Principles
1. **Privacy by Design**: All analytics are optional and transparent
2. **Offline First**: Core gameplay works without internet
3. **Mobile Optimized**: Touch-friendly interface with responsive design
4. **Performance**: Lazy loading, efficient state management
5. **Accessibility**: Keyboard navigation and screen reader support

## 📊 Analytics Implementation

### PostHog Integration Architecture

#### Service Layer (`src/services/analytics.ts`)
```typescript
class AnalyticsService {
  private isInitialized = false
  private isOptedOut = false
  private anonymousId: string | null = null

  // Key methods:
  init()                    // Initialize PostHog SDK
  track(eventName, props)   // Track events with type safety
  setOptOut(optOut)        // Privacy controls
  resetAnonymousId()       // Generate new anonymous ID
}
```

#### Event Schema
All events are strongly typed with TypeScript interfaces:

```typescript
interface AnalyticsEvent {
  // User engagement
  app_start: { launchSource: string, hasSavedState: boolean }
  game_started: { categoryName: string, timerMode: string }
  
  // Privacy & settings
  settings_opened: { source: 'menu_button' | 'header_button' }
  setting_changed: { settingName: string, previousValue: any, newValue: any }
  
  // Performance & errors
  error_occurred: { errorType: string, errorMessage: string }
  performance_metric: { metricName: string, value: number }
}
```

#### Event Sampling Strategy
```typescript
const SAMPLING_RATES = {
  phrase_shown: 0.25,  // 25% sampling for high-volume events
  default: 1.0         // 100% for all other events
}
```

### Privacy Controls Implementation

#### Anonymous ID Management
```typescript
// Secure ID generation with fallbacks
private generateAnonymousId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `anon_${crypto.randomUUID()}`
    }
    // Fallback for older browsers
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 15)
    return `anon_${timestamp}_${random}`
  } catch {
    // Ultimate fallback
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
```

#### Opt-out Implementation
```typescript
setOptOut(optOut: boolean) {
  this.isOptedOut = optOut
  
  try {
    localStorage.setItem('analyticsOptOut', String(optOut))
  } catch {
    // Graceful degradation if localStorage unavailable
  }

  if (this.isInitialized) {
    if (optOut) {
      posthog.opt_out_capturing()
    } else {
      posthog.opt_in_capturing()
    }
  }
}
```

### Super Properties
Properties automatically included with every event:
```typescript
posthog.register({
  appVersion: this.getAppVersion(),      // Git-based versioning
  platform: this.detectPlatform(),      // web/iOS/Android
  buildTimestamp: import.meta.env.VITE_BUILD_TIMESTAMP,
  isPwaInstall: this.isPWAInstalled(),   // PWA detection
  isOptedOut: this.isOptedOut,           // Privacy status
  anonymousId: this.anonymousId          // User identifier
})
```

## 🔒 Privacy Component Architecture

### PrivacySettings Component (`src/components/PrivacySettings.tsx`)
```typescript
export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ isOpen, onClose }) => {
  const [isOptedOut, setIsOptedOut] = useState(false)
  const [anonymousId, setAnonymousId] = useState<string | null>(null)
  
  // Load current state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsOptedOut(analytics.getOptOutStatus())
      setAnonymousId(analytics.getAnonymousId())
    }
  }, [isOpen])

  // Handle opt-out toggle with event tracking
  const handleOptOutToggle = () => {
    const newOptOutStatus = !isOptedOut
    setIsOptedOut(newOptOutStatus)
    analytics.setOptOut(newOptOutStatus)
    
    // Track the settings change (if not opted out)
    if (!newOptOutStatus) {
      analytics.track('setting_changed', {
        settingName: 'analytics_opt_out',
        previousValue: !newOptOutStatus,
        newValue: newOptOutStatus
      })
    }
  }
}
```

### Privacy Settings UI Features
1. **Analytics Toggle**: Visual toggle switch with immediate effect
2. **Anonymous ID Display**: Monospace font display with reset capability
3. **Data Management**: Confirmation dialog for data clearing
4. **Transparency Section**: Full disclosure of data collection practices

## 🚀 Development Workflow

### Environment Setup
```bash
# Required for analytics (optional for development)
VITE_POSTHOG_KEY=your_project_key
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Required for dashboard automation
POSTHOG_PERSONAL_API_KEY=your_personal_api_key

# Optional AI features
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_OPENAI_MODEL=gpt-4o
```

### Development Commands
```bash
# Development server with analytics
npm run dev

# Production build
npm run build

# Testing suite
npm run test
npm run test:coverage

# Analytics dashboard management
npm run setup-dashboards     # Create all PostHog dashboards
npm run cleanup-dashboards   # Remove existing dashboards
```

### Code Quality Tools
```bash
# ESLint with TypeScript
npm run lint

# Type checking
npm run type-check

# Automated testing
npm run test:watch
```

## 🧪 Testing Strategy

### Analytics Testing
```typescript
// Mock PostHog for testing
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn()
  }
}))

describe('Analytics Service', () => {
  it('should track events when opted in', () => {
    analytics.track('app_start', { launchSource: 'direct' })
    expect(mockPosthog.capture).toHaveBeenCalledWith('app_start', { launchSource: 'direct' })
  })
  
  it('should not track events when opted out', () => {
    analytics.setOptOut(true)
    analytics.track('app_start', { launchSource: 'direct' })
    expect(mockPosthog.capture).not.toHaveBeenCalled()
  })
})
```

### Privacy Component Testing
```typescript
describe('PrivacySettings', () => {
  it('should toggle analytics opt-out when toggle is clicked', async () => {
    render(<PrivacySettings isOpen={true} onClose={vi.fn()} />)
    
    const toggle = screen.getByTestId('analytics-toggle')
    fireEvent.click(toggle)
    
    await waitFor(() => {
      expect(mockAnalytics.setOptOut).toHaveBeenCalledWith(true)
    })
  })
})
```

### Test Coverage Requirements
- **Analytics Service**: 100% coverage of privacy controls
- **Privacy Settings**: All user interactions tested
- **Event Tracking**: Verify correct event schemas
- **Error Handling**: Graceful degradation when APIs fail

## 📈 Dashboard Development

### PostHog Dashboard Automation
```javascript
// Automated dashboard setup via PostHog API
const setupDashboards = async () => {
  const config = loadConfig() // Load from posthog-dashboard-config.json
  
  for (const dashboardConfig of config.dashboard_config.dashboards) {
    const dashboard = await createDashboard(projectId, dashboardConfig)
    await createDashboardTiles(projectId, dashboard.id, dashboardConfig.tiles)
  }
}
```

### Dashboard Configuration
```json
{
  "dashboard_config": {
    "dashboards": [
      {
        "id": "user_engagement",
        "name": "User Engagement Dashboard",
        "tiles": [
          {
            "id": "dau_trend",
            "name": "Daily Active Users",
            "type": "time_series",
            "query": {
              "event": "app_start",
              "aggregation": "unique_users"
            }
          }
        ]
      }
    ]
  }
}
```

### Key Metrics Tracked
1. **User Engagement**: DAU, session duration, user funnels
2. **Game Performance**: Completion rates, category popularity
3. **Technical Health**: Error rates, performance metrics
4. **Privacy Usage**: Opt-out rates, settings changes

## 🎯 Event Tracking Implementation

### Component-Level Tracking
```typescript
// GameScreen component with event tracking
export const GameScreen: React.FC = () => {
  const { currentPhrase, selectedCategories } = useGameStore()

  // Track phrase display (sampled)
  useEffect(() => {
    if (currentPhrase && status === GameStatus.PLAYING) {
      const phraseId = `phrase_${currentPhrase.replace(/\s+/g, '_').toLowerCase().substring(0, 20)}`
      
      analytics.track('phrase_shown', {
        phraseId,
        categoryName: selectedCategories.join(', '),
        phraseLength: currentPhrase.length,
        timeRemaining: displayTime
      })
    }
  }, [currentPhrase, status])
}
```

### Store-Level Tracking
```typescript
// Zustand store with integrated analytics
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      startGame: () => set((state) => {
        // Track game start with comprehensive data
        analytics.track('game_started', {
          categoryName: state.selectedCategories.join(', '),
          timerMode: state.showTimer ? 'visible' : 'hidden',
          isTeamMode: state.teams.length > 0,
          skipLimit: state.skipLimit,
          gameId: generateGameId(),
          phraseCount: phraseSet.size
        })
        
        return { /* new state */ }
      })
    }),
    { /* persistence config */ }
  )
)
```

## 🛠️ Build & Deployment

### Vite Configuration
```typescript
// vite.config.ts with analytics integration
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ /* PWA config */ })
  ],
  define: {
    // Inject version info at build time
    __APP_VERSION__: JSON.stringify(generateVersionInfo().version),
    __APP_VERSION_INFO__: JSON.stringify(generateVersionInfo())
  }
})
```

### Version Generation
```javascript
// scripts/generate-version.js
function generateVersionInfo() {
  const packageVersion = JSON.parse(fs.readFileSync('package.json')).version
  const gitHash = execSync('git rev-parse --short HEAD').toString().trim()
  const commitDate = execSync('git log -1 --format=%cd --date=short').toString().trim()
  
  return {
    version: `v${packageVersion}-${gitHash}`,
    packageVersion,
    gitHash,
    commitDate,
    buildDate: new Date().toISOString().split('T')[0]
  }
}
```

## 🔐 Security Considerations

### API Key Management
- PostHog project keys in environment variables only
- Personal API keys never committed to source code
- Serverless functions for sensitive operations

### Anonymous Data Handling
- No PII in event data - verified by TypeScript interfaces
- Anonymous IDs cannot be linked to real identities
- Secure ID generation using crypto APIs

### Privacy Controls
- All privacy settings stored locally only
- Immediate effect opt-out (no server round-trip)
- Graceful degradation when localStorage unavailable

## 📚 Documentation Standards

### Code Documentation
```typescript
/**
 * Track a typed analytics event with automatic sampling
 * 
 * @param eventName - Strongly typed event name from AnalyticsEvent interface
 * @param properties - Event properties matching the event schema
 * @example
 * ```typescript
 * analytics.track('game_started', {
 *   categoryName: 'Movies & TV',
 *   timerMode: 'hidden',
 *   isTeamMode: false
 * })
 * ```
 */
track<T extends keyof AnalyticsEvent>(
  eventName: T,
  properties: AnalyticsEvent[T]
) {
  // Implementation...
}
```

### Privacy Documentation Requirements
- User-facing privacy policy in plain language
- Developer documentation for all analytics implementations
- Clear data flow diagrams for audit purposes
- Regular privacy impact assessments

## 🚦 Development Guidelines

### Analytics Best Practices
1. **Type Safety**: All events must use TypeScript interfaces
2. **Privacy First**: Default to not tracking, make opt-in clear
3. **Minimal Data**: Only collect data that improves user experience
4. **Transparent**: Document all tracking in user-facing language
5. **Testable**: All analytics code must have unit tests

### Code Review Checklist
- [ ] New analytics events have TypeScript interfaces
- [ ] Privacy controls work correctly
- [ ] No PII in event properties
- [ ] User consent is respected
- [ ] Tests cover privacy scenarios
- [ ] Documentation is updated

### Release Process
1. **Analytics Review**: Verify no new PII collection
2. **Privacy Testing**: Test all opt-out scenarios
3. **Dashboard Update**: Update PostHog dashboards for new events
4. **Documentation**: Update privacy policy if needed
5. **Deployment**: Staged rollout with privacy monitoring

---

**Key Takeaway**: Privacy controls are not just a feature - they're core to the app's architecture. All analytics code should be designed with user privacy and control as the primary consideration. 