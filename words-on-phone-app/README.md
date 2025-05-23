# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

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

### Required Environment Variables

For full functionality including custom categories, you need to configure:

```bash
# .env.local (create this file in the project root)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional overrides
VITE_GEMINI_MODEL=gemini-1.5-flash
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env.local` file

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

1. **Environment Variables**: Set `VITE_GEMINI_API_KEY` in Netlify's environment variables
2. **Build Settings**:
   - Base directory: `words-on-phone-app`
   - Build command: `npm run build`
   - Publish directory: `words-on-phone-app/dist`

### Other Platforms

The app can be deployed to any static hosting service. Just ensure:
- Environment variables are properly configured
- Build assets are served from the correct directory

## Features Overview

### Core Game
- Timer-based gameplay
- Skip functionality with limits
- Multiple game categories
- Score tracking

### Custom Categories (Requires API Key)
- AI-generated phrase categories
- Preview sample words before generation
- Seamless integration with existing categories

### PWA Features
- Offline gameplay
- App-like experience on mobile
- Background phrase fetching

## License

MIT
