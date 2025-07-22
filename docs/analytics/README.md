# Words on Phone Analytics Documentation

This directory contains all documentation and configuration files for PostHog analytics integration and dashboard management.

## Quick Start

### 1. Prerequisites
- PostHog account with dashboard creation permissions
- Personal API key from PostHog (Settings → API keys)
- Words on Phone app deployed with PostHog integration

### 2. Environment Setup
Add these environment variables to your `.env` file:
```bash
# PostHog Configuration (required)
VITE_POSTHOG_KEY=your_project_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Personal API key for dashboard creation (required for setup script)
POSTHOG_PERSONAL_API_KEY=your_personal_api_key_here
```

### 3. Automated Dashboard Setup
```bash
# Set up all PostHog dashboards automatically
npm run setup-dashboards

# Clean up existing dashboards (for testing/reset)
npm run cleanup-dashboards
```

### 4. Manual Setup Alternative
If the automated script doesn't work, you can:
1. Import `posthog-dashboard-config.json` into PostHog manually
2. Follow the step-by-step guide in `dashboard-specifications.md`

## Dashboard Overview

### 📊 User Engagement Dashboard
**Purpose**: Monitor user behavior, retention, and engagement patterns

**Key Metrics**:
- Daily Active Users (DAU)
- Session Duration
- User Journey Funnel
- Popular Categories
- Game Mode Distribution

**View Link**: `{POSTHOG_HOST}/project/{PROJECT_ID}/dashboard/{DASHBOARD_ID}`

### 🎮 Game Performance Dashboard  
**Purpose**: Analyze gameplay metrics and user success patterns

**Key Metrics**:
- Game Completion Rate
- Average Correct Answers by Category
- Skip Usage Patterns
- Timer Preferences
- Game Duration Distribution

### ⚡ Technical Performance Dashboard
**Purpose**: Monitor app performance, errors, and technical health

**Key Metrics**:
- Error Rate and Types
- Performance Metrics (load times, audio latency)
- Audio System Success Rate
- PWA Installation Funnel
- Real-time Alerts

### 🔒 Privacy & Settings Dashboard
**Purpose**: Monitor privacy controls usage and settings preferences

**Key Metrics**:
- Analytics Opt-out Rate
- Privacy Settings Access
- Most Changed Settings
- Anonymous ID Reset Frequency

### 🎯 Custom Category Dashboard
**Purpose**: Monitor AI-generated category usage and quality

**Key Metrics**:
- Daily Category Requests
- AI Provider Success Rates
- Popular Custom Topics
- Request → Usage Conversion

## Analytics Events Reference

### Critical Events Tracked
```typescript
// User Engagement & Navigation
app_start, app_exit, screen_viewed, install

// Gameplay & Performance  
game_started, game_completed
phrase_shown, answer_correct, answer_pass
performance_metric, error_occurred

// Settings & Privacy
settings_opened, setting_changed
buzzer_played

// Custom Categories & AI
category_request_submitted, category_generated
category_selected, surprise_me_clicked

// PWA & Installation
pwa_install_prompt, install
```

### Event Sampling
Some high-volume events are sampled to reduce costs:
- `phrase_shown`: 25% sampling (1 in 4 events)
- All other events: 100% (no sampling)

### Super Properties
These properties are automatically included with every event:
- `appVersion`: App version string  
- `platform`: web/iOS/Android
- `buildTimestamp`: Build date/time
- `isPwaInstall`: PWA installation status
- `isOptedOut`: Analytics opt-out status
- `anonymousId`: User's anonymous identifier

## Privacy Compliance

### GDPR Compliance
- **User Consent**: Privacy Settings modal allows opt-out
- **Data Deletion**: Complete analytics data clearing capability
- **Anonymous Only**: No personal data collected, only anonymous usage patterns
- **Transparency**: Full disclosure of data collection practices

### Opt-out Handling
When users opt out:
- PostHog stops collecting events immediately
- Existing data remains (as legally required for analytics)
- Super property `isOptedOut: true` is set
- Users can opt back in anytime

## Troubleshooting

### Common Issues

#### Dashboard Setup Script Fails
```bash
❌ POSTHOG_PERSONAL_API_KEY environment variable is required
```
**Solution**: Add your PostHog personal API key to `.env` file

#### No Data in Dashboards
**Possible Causes**:
- PostHog integration not working
- User has opted out of analytics
- Events not being sent from app

**Debug Steps**:
1. Check browser console for PostHog errors
2. Verify events in PostHog Live Events tab
3. Check user's opt-out status in Privacy Settings

#### High Alert Volume
**Solution**: Adjust alert thresholds in `posthog-dashboard-config.json`:
```json
{
  "condition": "total > 10", // Increase threshold
  "frequency": "every_30_minutes" // Reduce frequency
}
```

### Event Debugging

#### Check Event Flow
1. Open browser dev tools
2. Go to Network tab, filter by PostHog
3. Trigger app actions
4. Verify events are being sent

#### Common Event Issues
- **Events missing**: Check if user opted out
- **Wrong properties**: Verify event schema in analytics service
- **Sampling confusion**: Remember `phrase_shown` is 25% sampled

## File Structure

```
docs/analytics/
├── README.md                          # This file - main documentation
├── dashboard-specifications.md         # Detailed dashboard specs
├── posthog-dashboard-config.json      # Automated setup configuration
├── environment-setup.md               # PostHog integration setup
└── event-schema.md                    # Complete event reference

words-on-phone-app/
├── scripts/
│   └── setup-posthog-dashboards.js   # Automated setup script
├── src/services/
│   └── analytics.ts                   # Main analytics service
└── src/components/
    └── PrivacySettings.tsx           # Privacy controls UI
```

## Maintenance Tasks

### Weekly
- [ ] Review dashboard data for anomalies
- [ ] Check alert effectiveness (false positive rate)
- [ ] Verify key metrics are trending as expected

### Monthly  
- [ ] Update dashboard configurations for new features
- [ ] Review and adjust alert thresholds
- [ ] Analyze user feedback on privacy controls

### Per Release
- [ ] Add annotations for major app updates
- [ ] Update event tracking for new features
- [ ] Verify dashboard compatibility with changes

## Support & Resources

### PostHog Resources
- [PostHog Documentation](https://posthog.com/docs)
- [Dashboard API Reference](https://posthog.com/docs/api/dashboards)
- [Event Tracking Guide](https://posthog.com/docs/integrate)

### Project Resources  
- **Event Schema**: See `event-schema.md` for complete event reference
- **Privacy Policy**: See app's Privacy Settings for user-facing privacy info
- **Analytics Service**: `src/services/analytics.ts` contains all tracking logic

### Getting Help
1. Check this documentation first
2. Review PostHog's official docs
3. Check browser console for errors
4. Test with Privacy Settings → Analytics enabled

---

*Last updated: Task 6 completion - PostHog dashboard setup* 