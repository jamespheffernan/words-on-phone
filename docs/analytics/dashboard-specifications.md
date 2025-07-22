# PostHog Dashboard Specifications

This document defines the analytics dashboards to be created in PostHog for comprehensive monitoring of Words on Phone app usage and performance.

## Dashboard Overview

### 1. **User Engagement Dashboard** 📊
**Purpose**: Monitor user behavior, retention, and engagement patterns

#### Key Metrics:
- **Daily Active Users (DAU)**: Unique users per day
- **Session Duration**: Average time spent in app per session
- **Games Played**: Total games started per day/week
- **Screen Flow**: Navigation patterns through app screens
- **Feature Adoption**: Usage of settings, custom categories, privacy controls

#### Visualizations:
- **Time Series**: DAU/WAU trends over time
- **Funnel Chart**: User journey from app_start → category_selected → game_started → game_completed
- **Bar Chart**: Most popular categories by selection count
- **Pie Chart**: Game modes (Solo vs Team) distribution
- **Heatmap**: Feature usage intensity (settings, categories, privacy)

#### Filters:
- Date range (last 7 days, 30 days, 90 days)
- Platform (web, iOS, Android)
- App version
- User type (new vs returning)

---

### 2. **Game Performance Dashboard** 🎮
**Purpose**: Analyze gameplay metrics and user success patterns

#### Key Metrics:
- **Game Completion Rate**: % of started games that finish
- **Average Correct Answers**: Per game session
- **Skip Usage**: Average skips per game
- **Category Performance**: Success rates by category
- **Timer Preferences**: Usage of timer settings

#### Visualizations:
- **Line Chart**: Game completion rates over time
- **Bar Chart**: Average correct answers by category
- **Histogram**: Distribution of game durations
- **Scatter Plot**: Skip usage vs success rate correlation
- **Stacked Bar**: Timer setting preferences (hidden vs visible, random vs fixed)

#### Key Events:
- `game_started`, `game_completed`, `answer_correct`, `answer_pass`
- `phrase_shown` (sampled), `category_selected`

---

### 3. **Technical Performance Dashboard** ⚡
**Purpose**: Monitor app performance, errors, and technical health

#### Key Metrics:
- **Error Rate**: Daily error occurrences by type
- **Performance Metrics**: Load times, initialization speeds
- **Audio System Health**: Buzzer success/failure rates
- **PWA Installation**: Install prompt acceptance rates
- **App Crashes**: Fatal error frequency

#### Visualizations:
- **Alert Panel**: Current error rates and performance issues
- **Time Series**: Performance metrics trends (load times, audio latency)
- **Bar Chart**: Error types and frequency
- **Success Rate Gauge**: Audio system reliability
- **Conversion Funnel**: PWA install flow (prompt → acceptance → installation)

#### Key Events:
- `error_occurred`, `performance_metric`, `buzzer_played`
- `pwa_install_prompt`, `install`

---

### 4. **Privacy & Settings Dashboard** 🔒
**Purpose**: Monitor privacy controls usage and settings preferences

#### Key Metrics:
- **Analytics Opt-out Rate**: % of users who disable analytics
- **Privacy Settings Usage**: How often privacy modal is accessed
- **Settings Modification**: Most changed settings
- **Data Retention**: Anonymous ID reset frequency

#### Visualizations:
- **Gauge Chart**: Current opt-out rate
- **Bar Chart**: Most frequently modified settings
- **Time Series**: Privacy modal access trends
- **Pie Chart**: Analytics status distribution (enabled vs disabled)

#### Key Events:
- `settings_opened`, `setting_changed`
- Privacy-specific events from PrivacySettings component

---

### 5. **Custom Category Dashboard** 🎯
**Purpose**: Monitor AI-generated category usage and quality

#### Key Metrics:
- **Category Requests**: Daily custom category generation requests
- **AI Provider Performance**: OpenAI vs Gemini success rates
- **Generation Success Rate**: % of successful category generations
- **Usage Adoption**: How often custom categories are selected for gameplay

#### Visualizations:
- **Bar Chart**: Category requests by topic/theme
- **Success Rate Comparison**: AI provider performance metrics
- **Time Series**: Custom category usage trends
- **Funnel**: Request → Generation → Usage conversion

#### Key Events:
- `category_request_submitted`, `category_generated`
- `category_selected` (filtered for custom categories)

---

## Dashboard Creation Process

### Phase 1: Core Setup
1. **Access PostHog**: Login to PostHog dashboard at configured host
2. **Create Dashboard Structure**: Set up 5 main dashboard sections
3. **Configure Data Sources**: Ensure event ingestion is working properly
4. **Set Up Filters**: Create reusable filters for platform, version, date ranges

### Phase 2: Visualization Creation
1. **Build Charts**: Create each visualization according to specifications above
2. **Configure Alerts**: Set up alerts for error rates, performance degradation
3. **Add Annotations**: Document significant app releases and changes
4. **Test Functionality**: Verify all charts display correct data

### Phase 3: Access & Sharing
1. **Set Permissions**: Configure team access levels
2. **Create Sharing Links**: Generate read-only links for stakeholders
3. **Schedule Reports**: Set up automated weekly/monthly reports
4. **Document Usage**: Create guide for interpreting dashboards

## Event Schema Reference

### Critical Events for Dashboards:
```typescript
// User Engagement
app_start, screen_viewed, install
category_selected, surprise_me_clicked
game_started, game_completed

// Performance & Quality  
phrase_shown, answer_correct, answer_pass
performance_metric, error_occurred
buzzer_played

// Privacy & Settings
settings_opened, setting_changed
// Future: privacy_modal_opened, analytics_opt_out_toggled

// Custom Categories
category_request_submitted, category_generated

// PWA & Technical
pwa_install_prompt, install
```

### Super Properties (Available on All Events):
- `appVersion`: App version string
- `platform`: web/iOS/Android
- `buildTimestamp`: Build date/time
- `isPwaInstall`: PWA installation status
- `isOptedOut`: Analytics opt-out status
- `anonymousId`: User's anonymous identifier

## Success Criteria

### Dashboard Functionality:
- [ ] All 5 dashboards created and populated with data
- [ ] Real-time data updates (within 5-10 minutes)
- [ ] Interactive filters working across all visualizations
- [ ] Mobile-responsive dashboard views
- [ ] Automated alerts configured for critical metrics

### Data Quality:
- [ ] Event data flowing correctly from app to PostHog
- [ ] No missing or malformed events in dashboards
- [ ] Proper handling of sampled events (phrase_shown)
- [ ] Anonymous user tracking working properly
- [ ] Privacy controls reflected in data collection

### Team Access:
- [ ] Dashboard access configured for development team
- [ ] Read-only access for stakeholders
- [ ] Documentation provided for dashboard interpretation
- [ ] Weekly automated reports configured

## Maintenance & Updates

### Regular Tasks:
- **Weekly**: Review dashboard data for anomalies
- **Monthly**: Update dashboard configurations for new features
- **Quarterly**: Assess dashboard effectiveness and user feedback
- **Per Release**: Add annotations for major app updates

### Key Metrics to Monitor:
- Dashboard load times and responsiveness
- Data freshness and accuracy
- Alert effectiveness (not too many false positives)
- Team usage patterns and feedback

---

*This document should be updated as new features are added to the app or new analytics requirements emerge.* 