# PostHog Dashboard Templates

This directory contains reusable dashboard templates for PostHog analytics, extracted from the successful **Words on Phone** implementation. These templates provide proven configurations for common analytics use cases.

## 🎯 Available Templates

### 1. [User Engagement Dashboard](./user-engagement-dashboard.json)
**Purpose**: Monitor user behavior, retention, and engagement patterns  
**Key Metrics**: DAU, User Journey Funnel, Popular Categories, Game Mode Distribution, Session Duration  
**Best For**: Product managers, UX teams, growth analytics

### 2. [Game Performance Dashboard](./game-performance-dashboard.json)  
**Purpose**: Analyze gameplay metrics and user success patterns  
**Key Metrics**: Completion Rate, Performance by Category, Skip Usage, Timer Preferences, Duration Distribution  
**Best For**: Game designers, product optimization, difficulty analysis

### 3. [Technical Performance Dashboard](./technical-performance-dashboard.json)
**Purpose**: Monitor app performance, error rates, and technical health  
**Key Metrics**: Error Rate, Performance Metrics, Audio Success Rate, PWA Install Conversion, Error Breakdown  
**Best For**: Engineering teams, DevOps, technical monitoring

## 🚀 Quick Start

### Step 1: Choose Your Template
1. Review the available templates above
2. Select the template that matches your analytics needs
3. Download the JSON file for your chosen template

### Step 2: Customize Events and Properties
Each template includes a `customization_guide` section with:
- **Event Mapping**: Replace template events with your actual events
- **Property Mapping**: Map template properties to your data schema  
- **Layout Configuration**: Adjust tile positions and sizes

### Step 3: Deploy Using Setup Script
```bash
# Copy your customized template to the main config
cp user-engagement-dashboard.json ../posthog-dashboard-config.json

# Run the dashboard setup script
cd ../../words-on-phone-app
node scripts/setup-posthog-dashboards.js
```

## 📋 Template Structure

Each template follows this standardized structure:

```json
{
  "template_info": {
    "name": "Template Name",
    "description": "Template description and purpose",
    "version": "1.0.0",
    "created_date": "2025-01-22",
    "use_cases": ["List of specific use cases"],
    "required_events": ["Events needed for this dashboard"],
    "required_properties": ["Properties needed for this dashboard"]
  },
  "dashboard_config": {
    // Complete PostHog dashboard configuration
    "tiles": [...],
    "filters": [...],
    "layout": {...}
  },
  "customization_guide": {
    // Step-by-step customization instructions
    "event_mapping": {...},
    "property_mapping": {...}
  }
}
```

## 🔧 Customization Guide

### Event Mapping
Replace template events with your application's actual events:

**Template Event** → **Your Event**
- `app_start` → `user_login` or `session_start`
- `category_selected` → `feature_accessed` or `menu_selected`
- `game_started` → `activity_started` or `session_begin`

### Property Mapping  
Map template properties to your data schema:

**Template Property** → **Your Property**
- `categoryName` → `feature_type` or `content_category`
- `isTeamMode` → `collaboration_mode` or `multiplayer`
- `sessionDurationMs` → `session_time` or `engagement_duration`

### Layout Customization
Adjust tile positions and sizes in the `layout` section:
```json
"layout": {
  "position": {"x": 0, "y": 0},  // Grid position (12-column grid)
  "size": {"width": 6, "height": 4}  // Width/height in grid units
}
```

## 🛠️ Advanced Configuration

### Dashboard Filters
Customize global filters for your use case:
```json
"filters": [
  {
    "name": "Environment",
    "property": "environment",
    "values": ["production", "staging"]
  }
]
```

### Alert Configuration (Technical Dashboard)
Set up custom alerts for your thresholds:
```json
"alerts": [
  {
    "condition": "total > 50",  // Adjust threshold
    "severity": "high",
    "message": "Custom alert message"
  }
]
```

### Refresh Intervals
Set appropriate refresh rates:
- **Real-time monitoring**: `"1m"` (Technical dashboards)
- **Business metrics**: `"auto"` (User engagement, performance)
- **Historical analysis**: `"1h"` (Trend analysis)

## 📊 Dashboard Deployment

### Using the Enhanced Setup Script
The templates work with the enhanced `setup-posthog-dashboards.js` script that includes:
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting (240/min, 1200/hour)  
- ✅ Comprehensive error handling
- ✅ Progress tracking and validation

### Production Deployment Checklist
- [ ] Customize events and properties for your app
- [ ] Test with development/staging PostHog instance first
- [ ] Verify all required events are being tracked
- [ ] Set appropriate alert thresholds
- [ ] Configure team access and sharing settings
- [ ] Document your customizations for future reference

## 🎯 Success Metrics

These templates are based on a **proven implementation** with:
- ✅ **100% Success Rate**: All dashboards created successfully
- ✅ **Production Tested**: Live with real-time data in PostHog
- ✅ **Comprehensive Coverage**: 26+ insights across 5 dashboards
- ✅ **Performance Optimized**: Handles API rate limits and errors gracefully

## 🔍 Troubleshooting

### Common Issues
1. **404 Errors**: Verify your PostHog project ID and API key
2. **Permission Denied**: Ensure API key has `insight:write` and `dashboard:write` scopes
3. **Rate Limiting**: Script handles this automatically with built-in delays
4. **Missing Data**: Verify events are being tracked before dashboard creation

### Debug Mode
Enable debug logging in the setup script:
```bash
DEBUG=true node scripts/setup-posthog-dashboards.js
```

## 📚 Additional Resources

- [PostHog Dashboard API Documentation](https://posthog.com/docs/api/dashboards)
- [PostHog Insights API Documentation](https://posthog.com/docs/api/insights)
- [PostHog Event Tracking Guide](https://posthog.com/docs/integrate/overview)

## 🤝 Contributing

To add new templates:
1. Create a new JSON file following the template structure
2. Include comprehensive `template_info` and `customization_guide` sections
3. Test the template with the setup script
4. Update this README with the new template documentation

---

**Version**: 1.0.0  
**Last Updated**: January 22, 2025  
**Based On**: Words on Phone Production Implementation 