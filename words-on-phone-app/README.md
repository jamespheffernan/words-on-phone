# Words on Phone - React PWA

A charades-style party game built with React, TypeScript, and Vite. Features real-time gameplay, team scoring, custom categories, and comprehensive analytics.

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PostHog Analytics** (optional but recommended):
   ```bash
   node setup-analytics.cjs
   ```
   Or manually create `.env.local` with your PostHog project key:
   ```bash
   VITE_POSTHOG_KEY=phc_your_project_key_here
   VITE_POSTHOG_HOST=https://us.i.posthog.com
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Features

- 🎮 **Real-time Gameplay**: Charades-style word guessing with timer
- 👥 **Team Mode**: Multi-team scoring and competition
- 🎯 **Custom Categories**: AI-generated phrases for any topic
- 📱 **PWA Ready**: Installable on mobile devices
- 📊 **Analytics**: Comprehensive gameplay analytics with PostHog
- 🎵 **Audio & Haptics**: Sound effects and vibration feedback
- 🌙 **Dark Mode**: Automatic theme switching
- ♿ **Accessible**: Screen reader friendly with ARIA labels

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

# Words on Phone

A React-based party game app similar to "Catch Phrase" where players guess phrases while passing a phone around.

## Features

- 🎮 Party game with timer-based phrase guessing
- 📱 Mobile-first responsive design
- 🎯 Multiple categories of phrases
- ⭐ Custom category generation (powered by Gemini AI)
- 🔊 Audio cues and visual feedback
- 📊 Firebase analytics integration
- 🚀 PWA support for offline play

## Environment Setup

### Required Environment Variables (Server-side)

For full functionality including custom categories, you need to configure these environment variables **in your hosting platform** (e.g., Netlify):

```bash
# Required for custom category generation (Server-side only)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional overrides
GEMINI_MODEL=gemini-1.5-flash
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add the key to your hosting platform's environment variables

> **Security Note**: The API key is handled securely through serverless functions and never exposed in the client-side code.

> **Note**: The app works without an API key, but custom category generation will be unavailable.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Deployment

### Netlify Deployment

1. **Environment Variables**: Set `GEMINI_API_KEY` (without `VITE_` prefix) in Netlify's environment variables
2. **Build Settings**:
   - Base directory: `words-on-phone-app`
   - Build command: `npm run build`
   - Publish directory: `words-on-phone-app/dist`

### Security

- API keys are handled server-side through Netlify Functions
- No sensitive credentials are exposed in the client-side bundle
- CORS headers are properly configured for secure API communication

### Other Platforms

The app can be deployed to any static hosting service that supports serverless functions. You'll need to:
- Adapt the `netlify/functions/gemini.ts` for your platform's serverless function format
- Configure environment variables on your hosting platform
- Ensure CORS headers are properly set

## Features Overview

### Core Game
- Timer-based gameplay
- Skip functionality with limits
- Multiple game categories
- Score tracking

### Custom Categories (Requires API Key)
- AI-generated phrase categories via secure serverless functions
- Preview sample words before generation
- Seamless integration with existing categories

### PWA Features
- Offline gameplay
- App-like experience on mobile
- Background phrase fetching

## License

MIT
