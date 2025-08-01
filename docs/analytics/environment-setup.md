# PostHog Analytics Environment Setup

## Required Environment Variables

Create a `.env.local` file in the `words-on-phone-app/` directory with the following variables:

```bash
# PostHog Analytics Configuration
# Sign up at https://posthog.com/ and get your project key from Settings > Project
VITE_POSTHOG_KEY=phc_your_project_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Build Configuration (automatically generated by build process)
VITE_APP_VERSION=0.0.0-dev
VITE_BUILD_TIMESTAMP=2025-07-22T15:45:00Z
```

## Setup Instructions

1. **Sign up for PostHog** (if you haven't already):
   - Go to [https://posthog.com/](https://posthog.com/)
   - Create a free account
   - Create a new project

2. **Get your Project Key**:
   - In PostHog dashboard, go to **Settings > Project**
   - Copy the **Project API Key** (starts with `phc_`)

3. **Create environment file**:
   ```bash
   cd words-on-phone-app
   cp .env.example .env.local  # If .env.example exists
   # OR create .env.local manually with the content above
   ```

4. **Update the variables**:
   - Replace `phc_your_project_key_here` with your actual PostHog project key
   - Optionally change `VITE_POSTHOG_HOST` if using PostHog Cloud EU or self-hosted instance

5. **Test the integration**:
   ```bash
   npm run dev
   ```
   - Open browser developer tools
   - Look for "PostHog analytics initialized" in console
   - Check Network tab for requests to PostHog

## PostHog Host Options

- **PostHog Cloud US**: `https://us.i.posthog.com` (default)
- **PostHog Cloud EU**: `https://eu.i.posthog.com`
- **Self-hosted**: Your custom PostHog instance URL

## Security Notes

- The `.env.local` file is automatically ignored by git (see `.gitignore`)
- Never commit API keys to version control
- Use different PostHog projects for development vs production
- The `VITE_` prefix makes variables available to the client-side code

## Troubleshooting

### Analytics not initializing
- Check that `VITE_POSTHOG_KEY` is set in `.env.local`
- Verify the key starts with `phc_`
- Restart the dev server after changing environment variables

### Events not appearing in PostHog
- Check browser console for errors
- Verify network requests are being sent to PostHog
- Check PostHog project settings for data ingestion issues
- Events may take a few minutes to appear in the dashboard

### CORS errors
- Ensure `VITE_POSTHOG_HOST` matches your PostHog instance
- Check PostHog project settings for allowed origins (usually not needed for PostHog Cloud) 