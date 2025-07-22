# Words on Phone 📱

A mobile-first party game inspired by the classic "catch-phrase" mechanics. Players take turns describing phrases while others guess, with customizable categories and timer settings for endless entertainment.

## ✨ Features

### 🎮 Core Gameplay
- **Solo & Team Modes**: Play individually or set up team-based competition
- **20+ Categories**: Movies & TV, Sports, Music, Food & Drink, and more
- **Custom Categories**: AI-generated phrases for any topic you want
- **Customizable Timer**: Hidden by default, randomized duration (45-75s)
- **Skip Limits**: Optional skip restrictions for strategic play

### 🔊 Enhanced Experience  
- **Audio Feedback**: Accelerating "hot potato" beeping system
- **Haptic Feedback**: Vibration support for mobile devices
- **Progressive Web App**: Install on any device for native app experience
- **Offline Ready**: Play without internet connection

### 🎯 Advanced Features
- **Smart Categories**: Quick Play widget with popular and recently played categories
- **Version Display**: Always see which app version you're using
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive Design**: Optimized for phones, tablets, and desktop

### 🔒 Privacy-First Analytics (Optional)
- **Complete User Control**: Analytics can be disabled with one toggle
- **Anonymous Only**: No personal information collected - ever
- **Transparent**: Full disclosure of what data is collected and why
- **GDPR Compliant**: Built-in privacy controls and data deletion

## 🚀 Quick Start

### Play Now
Visit the live app: [Words on Phone](https://words-on-phone.netlify.app)

### Install as PWA
1. Visit the app in your mobile browser
2. Look for "Add to Home Screen" prompt
3. Install for native app experience

### Privacy Settings
- Analytics is **enabled by default** to help improve the app
- To disable: Go to **Settings** → **🔒 Privacy Settings** → Toggle off
- All analytics are anonymous and cannot identify you personally

## 📊 Analytics & Privacy

### What We Collect (When Enabled)
- **Usage Patterns**: Which categories you play, game duration, settings preferences
- **Performance Data**: Load times, errors, audio system functionality  
- **Anonymous Stats**: Success rates, skip usage (no personal identification possible)

### What We DON'T Collect
- ❌ Personal information (name, email, contacts)
- ❌ Location data or browsing history
- ❌ Any data that can identify you personally

### Your Control
- **One-Click Opt-Out**: Disable all analytics instantly
- **Anonymous ID Reset**: Generate new anonymous ID anytime  
- **Data Deletion**: Clear all stored preferences and analytics data
- **Complete Transparency**: View exactly what data would be sent

See our full [Privacy Policy](PRIVACY.md) for detailed information.

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- Modern browser with ES2015+ support

### Installation
```bash
# Clone the repository
git clone https://github.com/jamespheffernan/words-on-phone.git
cd words-on-phone

# Install dependencies
cd words-on-phone-app
npm install

# Start development server
npm run dev
```

### Environment Setup
Create `.env` file in `words-on-phone-app/`:
```bash
# Analytics (Optional)
VITE_POSTHOG_KEY=your_posthog_project_key
VITE_POSTHOG_HOST=https://us.i.posthog.com

# AI Category Generation (Optional)
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_OPENAI_MODEL=gpt-4o
```

### Build & Deploy
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

### Analytics Dashboard Setup
```bash
# Set up PostHog dashboards (requires POSTHOG_PERSONAL_API_KEY)
npm run setup-dashboards

# Clean up dashboards
npm run cleanup-dashboards
```

## 🏗️ Architecture

### App Structure
- **React 19** with TypeScript for type safety
- **Zustand** for state management with persistence
- **Vite** for fast development and building
- **PWA** with offline capabilities and installability

### Analytics Architecture  
- **PostHog** for privacy-focused analytics
- **Anonymous Tracking** with user-controlled identifiers
- **Event-Driven**: 16 event types covering user behavior
- **Real-Time Dashboards**: 5 comprehensive analytics dashboards

### Key Technologies
- **Audio System**: Web Audio API with singleton pattern
- **Persistence**: IndexedDB with zustand middleware
- **Haptics**: Capacitor haptics for mobile feedback
- **AI Integration**: OpenAI & Gemini for custom categories

## 📁 Project Structure

```
words-on-phone/
├── words-on-phone-app/          # Main React application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # Analytics, AI, persistence
│   │   ├── hooks/              # Custom React hooks
│   │   ├── data/               # Game phrases and categories
│   │   └── workers/            # Web Workers for performance
│   ├── scripts/                # Build and setup scripts  
│   └── netlify/functions/       # Serverless API endpoints
├── docs/                        # Project documentation
│   ├── analytics/              # PostHog setup and specs
│   └── implementation-plan/     # Development planning
└── tools/                      # Development tools
    └── phrase-database/        # Phrase generation system
```

## 🧪 Testing

### Test Suites
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Interactive test UI
npm run test:ui
```

### E2E Testing
```bash
# Cypress (if installed)
npm run cypress:open
```

### Test Coverage
- **Unit Tests**: All critical components and services
- **Integration Tests**: Privacy controls, analytics service
- **E2E Tests**: Complete user flows and accessibility

## 🌟 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run `npm run test` to ensure all tests pass
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode with full type coverage
- **ESLint**: Code quality and consistency
- **Testing**: Unit tests required for new features
- **Privacy**: Any analytics changes need privacy review

## 📈 Analytics Dashboard

### Available Dashboards
1. **User Engagement**: DAU, session duration, user journey
2. **Game Performance**: Success rates, category popularity
3. **Technical Health**: Error tracking, performance metrics  
4. **Privacy Controls**: Opt-out rates, settings usage
5. **Custom Categories**: AI generation success rates

### Dashboard Access
- Set up with `npm run setup-dashboards`
- Access via PostHog web interface
- Real-time updates every 5-10 minutes

## 📜 Privacy & Legal

### Privacy Commitment
- **Privacy by Design**: Optional analytics with full user control
- **Anonymous Only**: No personal data collection
- **GDPR Compliant**: Right to opt-out and data deletion
- **Transparent**: Complete disclosure of data practices

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

### Getting Help
- **Privacy Questions**: Check [Privacy Policy](PRIVACY.md)  
- **Technical Issues**: Open a GitHub issue
- **Feature Requests**: Discuss in GitHub Discussions

### Analytics Troubleshooting
- **No data in dashboards**: Check if analytics is enabled in Privacy Settings
- **Events not tracking**: Check browser console for PostHog errors
- **Privacy concerns**: All analytics can be disabled in app settings

---

**Built with ❤️ for party game enthusiasts who value their privacy.**
