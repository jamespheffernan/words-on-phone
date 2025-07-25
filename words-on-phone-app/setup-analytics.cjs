#!/usr/bin/env node

/**
 * PostHog Analytics Setup Script
 * 
 * This script helps set up the environment variables needed for PostHog analytics.
 * Run with: node setup-analytics.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_LOCAL_PATH = path.join(__dirname, '.env.local');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 PostHog Analytics Setup for Words on Phone\n');

  // Check if .env.local already exists
  if (fs.existsSync(ENV_LOCAL_PATH)) {
    console.log('⚠️  .env.local already exists.');
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Please provide the following information:\n');

  // Get PostHog project key
  console.log('1. PostHog Project Key:');
  console.log('   - Sign up at https://posthog.com/ if you haven\'t already');
  console.log('   - Go to Settings > Project in your PostHog dashboard');
  console.log('   - Copy the Project API Key (starts with "phc_")\n');
  
  const posthogKey = await question('Enter your PostHog Project Key: ');
  
  if (!posthogKey.startsWith('phc_')) {
    console.log('⚠️  Warning: PostHog keys usually start with "phc_". Please double-check your key.');
  }

  // Get PostHog host (optional)
  console.log('\n2. PostHog Host (optional):');
  console.log('   - US Cloud: https://us.i.posthog.com (default)');
  console.log('   - EU Cloud: https://eu.i.posthog.com');
  console.log('   - Self-hosted: your custom URL\n');
  
  const posthogHost = await question('Enter PostHog Host (press Enter for default): ') || 'https://us.i.posthog.com';

  // Generate build timestamp
  const buildTimestamp = new Date().toISOString();

  // Create .env.local content
  const envContent = `# PostHog Analytics Configuration
# Generated by setup-analytics.js on ${new Date().toLocaleString()}
VITE_POSTHOG_KEY=${posthogKey}
VITE_POSTHOG_HOST=${posthogHost}

# Build Configuration (automatically updated)
VITE_APP_VERSION=0.0.0-dev
VITE_BUILD_TIMESTAMP=${buildTimestamp}

# Instructions:
# - Restart your dev server after changing these values
# - Never commit this file to version control
# - Use different PostHog projects for dev vs production
`;

  // Write the file
  try {
    fs.writeFileSync(ENV_LOCAL_PATH, envContent);
    console.log('\n✅ Successfully created .env.local');
    console.log('\n🔧 Next steps:');
    console.log('   1. Restart your development server: npm run dev');
    console.log('   2. Open browser developer tools');
    console.log('   3. Look for "PostHog analytics initialized" in the console');
    console.log('   4. Check the Network tab for requests to PostHog');
    console.log('\n📊 Your analytics are now configured!');
    
  } catch (error) {
    console.error('\n❌ Error creating .env.local:', error.message);
  }

  rl.close();
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\nSetup cancelled.');
  rl.close();
  process.exit(0);
});

main().catch(console.error); 