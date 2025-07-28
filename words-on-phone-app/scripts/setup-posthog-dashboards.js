#!/usr/bin/env node

/**
 * PostHog Dashboard Setup Script (Enhanced)
 * 
 * This script automatically creates PostHog dashboards based on the configuration
 * defined in docs/analytics/posthog-dashboard-config.json
 * 
 * Enhanced with:
 * - Improved error handling and logging
 * - Personal API key authentication
 * - Rate limit handling
 * - Comprehensive dashboard creation from config
 * - Better validation and verification
 * 
 * Usage:
 *   npm run setup-dashboards
 *   or
 *   node scripts/setup-posthog-dashboards.js
 *   node scripts/setup-posthog-dashboards.js --config core-insights-test.json
 *   node scripts/setup-posthog-dashboards.js cleanup
 * 
 * Environment Variables Required:
 *   VITE_POSTHOG_KEY - PostHog project API key
 *   VITE_POSTHOG_HOST - PostHog host URL (default: https://us.posthog.com)
 *   POSTHOG_PERSONAL_API_KEY - Personal API key for dashboard creation (required)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from .env.local manually
try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=')
        }
      }
    })
    console.log('✅ Loaded environment variables from .env.local')
  }
} catch (error) {
  console.log('⚠️  Could not load .env.local:', error.message)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_CONFIG_PATH = path.join(__dirname, '../../docs/analytics/posthog-dashboard-config.json')
const CONFIG_PATH = process.argv.includes('--config') ? 
  path.join(__dirname, '../../docs/analytics/', process.argv[process.argv.indexOf('--config') + 1]) : 
  DEFAULT_CONFIG_PATH
const POSTHOG_HOST = process.env.VITE_POSTHOG_HOST?.replace('i.posthog.com', 'posthog.com') || 'https://us.posthog.com'
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT_KEY = process.env.VITE_POSTHOG_KEY

// Rate limiting configuration
const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 240,
  REQUESTS_PER_HOUR: 1200,
  REQUEST_DELAY: 250 // 250ms between requests
}

// Request tracking for rate limiting
let requestCount = 0
let requestHistory = []

if (!POSTHOG_API_KEY) {
  console.error('❌ POSTHOG_PERSONAL_API_KEY environment variable is required')
  console.error('   This key is needed to create dashboards and insights via the PostHog API')
  console.error('   Get your Personal API key from: PostHog Settings → Account → Personal API Keys')
  process.exit(1)
}

if (!PROJECT_KEY) {
  console.error('❌ VITE_POSTHOG_KEY environment variable is required')  
  console.error('   This is your project API key found in: PostHog Settings → Project → Project API Key')
  process.exit(1)
}

/**
 * Enhanced logging with timestamps and color coding
 */
const logger = {
  info: (message) => console.log(`🔵 [${new Date().toISOString()}] ${message}`),
  success: (message) => console.log(`✅ [${new Date().toISOString()}] ${message}`),
  warning: (message) => console.log(`⚠️  [${new Date().toISOString()}] ${message}`),
  error: (message) => console.error(`❌ [${new Date().toISOString()}] ${message}`),
  debug: (message) => process.env.DEBUG && console.log(`🔍 [${new Date().toISOString()}] ${message}`)
}

/**
 * Rate limiting helper
 */
async function handleRateLimit() {
  const now = Date.now()
  requestHistory = requestHistory.filter(time => now - time < 60000) // Keep last minute
  
  if (requestHistory.length >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
    const waitTime = 60000 - (now - requestHistory[0])
    logger.warning(`Rate limit approaching, waiting ${waitTime}ms`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  requestHistory.push(now)
  await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.REQUEST_DELAY))
}

/**
 * Load dashboard configuration from JSON file
 */
function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8')
    const config = JSON.parse(configData)
    logger.success(`Loaded configuration from: ${path.basename(CONFIG_PATH)}`)
    logger.success(`Found ${config.dashboard_config.dashboards.length} dashboards to create`)
    return config
  } catch (error) {
    logger.error(`Failed to load dashboard configuration: ${error.message}`)
    logger.error(`Expected config file at: ${CONFIG_PATH}`)
    process.exit(1)
  }
}

/**
 * Enhanced API request to PostHog with better error handling
 */
async function postHogRequest(endpoint, method = 'GET', data = null, retries = 3) {
  await handleRateLimit()
  
  const url = `${POSTHOG_HOST}/api/${endpoint}`
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
  
  if (data) {
    options.body = JSON.stringify(data)
  }
  
  logger.debug(`Making ${method} request to: ${endpoint}`)
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP ${response.status}: ${errorText}`
        
        // Enhanced error messages for common issues
        if (response.status === 401) {
          errorMessage = `Authentication failed. Please check your POSTHOG_PERSONAL_API_KEY.`
        } else if (response.status === 403) {
          errorMessage = `Permission denied. Your API key may not have the required scopes (insight:write, dashboard:write).`
        } else if (response.status === 429) {
          errorMessage = `Rate limit exceeded. Waiting before retry...`
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 5000 * attempt))
            continue
          }
        }
        
        throw new Error(errorMessage)
      }
      
      requestCount++
      return await response.json()
    } catch (error) {
      if (attempt === retries) {
        logger.error(`PostHog API request failed after ${retries} attempts: ${error.message}`)
        throw error
      }
      
      logger.warning(`Attempt ${attempt} failed, retrying: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

/**
 * Get project ID from PostHog API with enhanced error handling
 */
async function getProjectId() {
  try {
    logger.info('Finding project ID...')
    
    // Get the user info first, which includes team/project information
    const userInfo = await postHogRequest('users/@me/')
    
    if (userInfo && userInfo.team) {
      logger.success(`Found project: ${userInfo.team.name} (ID: ${userInfo.team.id})`)
      return userInfo.team.id
    }
    
    // Fallback: try to get project list and find by API key
    logger.info('Fallback: searching project list...')
    const projects = await postHogRequest('projects/')
    
    if (projects && projects.results) {
      // Find project that matches our API key
      const project = projects.results.find(p => p.api_token === PROJECT_KEY)
      
      if (project) {
        logger.success(`Found project: ${project.name} (ID: ${project.id})`)
        return project.id
      }
    }
    
    throw new Error('Could not find project ID. Please verify your API keys are correct.')
  } catch (error) {
    logger.error(`Failed to get project ID: ${error.message}`)
    throw error
  }
}

/**
 * Convert dashboard config to PostHog query format
 */
function convertToPostHogQuery(tileConfig) {
  // Convert simplified config format to PostHog's InsightVizNode format
  const baseQuery = {
    kind: "InsightVizNode",
    source: {
      version: 1
    },
    version: 1
  }

  switch (tileConfig.type) {
    case 'time_series':
      baseQuery.source.kind = "TrendsQuery"
      baseQuery.source.series = [{
        kind: "EventsNode",
        event: tileConfig.query.event,
        name: tileConfig.query.event,
        math: tileConfig.query.aggregation === 'unique_users' ? 'dau' : 'total',
        version: 1
      }]
      baseQuery.source.interval = tileConfig.query.interval || 'day'
      baseQuery.source.dateRange = {
        date_from: tileConfig.query.date_from || '-30d'
      }
      break
      
    case 'funnel':
      baseQuery.source.kind = "FunnelsQuery"
      baseQuery.source.series = tileConfig.query.events.map(event => ({
        kind: "EventsNode",
        event: event.event,
        name: event.event,
        version: 1
      }))
      baseQuery.source.dateRange = {
        date_from: tileConfig.query.date_from || '-7d'
      }
      break
      
    case 'bar_chart':
    case 'pie_chart':
      baseQuery.source.kind = "TrendsQuery"
      baseQuery.source.series = [{
        kind: "EventsNode",
        event: tileConfig.query.event,
        name: tileConfig.query.event,
        math: 'total',
        version: 1
      }]
      // Breakdown support disabled temporarily due to API validation issues
      // if (tileConfig.query.breakdown) {
      //   baseQuery.source.breakdown = tileConfig.query.breakdown
      //   baseQuery.source.breakdown_type = 'event'
      // }
      baseQuery.source.dateRange = {
        date_from: tileConfig.query.date_from || '-30d'
      }
      break
      
    case 'number':
      baseQuery.source.kind = "TrendsQuery"
      baseQuery.source.series = [{
        kind: "EventsNode",
        event: tileConfig.query.event,
        name: tileConfig.query.event,
        math: tileConfig.query.aggregation === 'avg' ? 'avg' : 'total',
        math_property: tileConfig.query.property || undefined,
        version: 1
      }]
      baseQuery.source.dateRange = {
        date_from: tileConfig.query.date_from || '-7d'
      }
      break
      
    default:
      // Default to trends query
      baseQuery.source.kind = "TrendsQuery"
      baseQuery.source.series = [{
        kind: "EventsNode",
        event: tileConfig.query.event || '$pageview',
        name: tileConfig.query.event || '$pageview',
        math: 'total',
        version: 1
      }]
  }

  return baseQuery
}

/**
 * Create a dashboard in PostHog with enhanced error handling
 */
async function createDashboard(projectId, dashboardConfig) {
  try {
    logger.info(`Creating dashboard: ${dashboardConfig.name}`)
    
    const dashboardData = {
      name: dashboardConfig.name,
      description: dashboardConfig.description || `Auto-generated dashboard for ${dashboardConfig.name}`,
      pinned: false,
      tags: ['words-on-phone', 'analytics', 'auto-generated']
    }
    
    const dashboard = await postHogRequest(
      `projects/${projectId}/dashboards/`,
      'POST',
      dashboardData
    )
    
    logger.success(`Created dashboard: ${dashboard.name} (ID: ${dashboard.id})`)
    return dashboard
  } catch (error) {
    logger.error(`Failed to create dashboard ${dashboardConfig.name}: ${error.message}`)
    throw error
  }
}

/**
 * Create dashboard tiles (insights) with enhanced configuration support
 */
async function createDashboardTiles(projectId, dashboardId, tiles) {
  const createdTiles = []
  
  logger.info(`Creating ${tiles.length} tiles for dashboard...`)
  
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]
    try {
      logger.info(`  Creating tile ${i+1}/${tiles.length}: ${tile.name}`)
      
      // Convert config format to PostHog query format
      const query = convertToPostHogQuery(tile)
      
      // Create the insight and add it directly to the dashboard
      const insightData = {
        name: tile.name,
        query: query,
        description: `Auto-generated insight: ${tile.name}`,
        tags: ['dashboard-tile', 'words-on-phone'],
        dashboards: [dashboardId] // Add directly to dashboard
      }
      
      logger.debug(`Creating insight with query: ${JSON.stringify(query, null, 2)}`)
      
      const insight = await postHogRequest(
        `projects/${projectId}/insights/`,
        'POST',
        insightData
      )
      
      logger.success(`    Created tile: ${tile.name}`)
      createdTiles.push(tile)
      
    } catch (error) {
      logger.error(`    Failed to create tile ${tile.name}: ${error.message}`)
      // Continue with other tiles instead of failing completely
    }
  }
  
  logger.success(`Successfully created ${createdTiles.length}/${tiles.length} tiles`)
  return createdTiles
}

/**
 * Set up alerts (if supported by PostHog API)
 */
async function setupAlerts(projectId, alerts) {
  // PostHog doesn't currently support alerts via API
  // Alerts need to be configured manually in the PostHog UI
  logger.warning('🚨 Alert setup skipped - PostHog alerts must be configured manually in the UI')
  logger.info('   To set up alerts:')
  logger.info('   1. Go to your PostHog project settings')
  logger.info('   2. Navigate to the Alerts section')
  logger.info('   3. Configure alerts based on your dashboard insights')
}


/**
 * Verify dashboard setup
 */
async function verifySetup(projectId, expectedDashboards) {
  try {
    logger.info('🔍 Verifying dashboard setup...')
    
    const dashboards = await postHogRequest(`projects/${projectId}/dashboards/`)
    const createdDashboards = dashboards.results?.filter(d => 
      d.tags?.includes('words-on-phone')
    ) || []
    
    logger.info(`📊 Found ${createdDashboards.length} Words on Phone dashboards`)
    
    for (const dashboard of createdDashboards) {
      const tiles = await postHogRequest(`projects/${projectId}/dashboard_tiles/?dashboard=${dashboard.id}`)
      logger.info(`  - ${dashboard.name}: ${tiles.results?.length || 0} tiles`)
    }
    
    if (createdDashboards.length >= expectedDashboards) {
      logger.success('✅ Dashboard setup verification passed')
      return true
    } else {
      logger.warning('⚠️  Some dashboards may not have been created successfully')
      return false
    }
  } catch (error) {
    logger.error('❌ Dashboard verification failed:', error.message)
    return false
  }
}

/**
 * Main setup function
 */
async function setupDashboards() {
  try {
    logger.info('🚀 Starting PostHog dashboard setup...')
    logger.info(`📡 PostHog Host: ${POSTHOG_HOST}`)
    
    // Load configuration
    const config = loadConfig()
    
    // Get project ID
    const projectId = await getProjectId()
    
    // Create dashboards
    logger.info('\n📊 Creating dashboards...')
    const createdDashboards = []
    
    for (const dashboardConfig of config.dashboard_config.dashboards) {
      try {
        const dashboard = await createDashboard(projectId, dashboardConfig)
        
        if (dashboardConfig.tiles?.length > 0) {
          await createDashboardTiles(projectId, dashboard.id, dashboardConfig.tiles)
        }
        
        createdDashboards.push(dashboard)
      } catch (error) {
        logger.error(`❌ Failed to fully create dashboard ${dashboardConfig.name}`)
        // Continue with other dashboards
      }
    }
    
    // Set up alerts
    if (config.dashboard_config.alerts?.length > 0) {
      logger.info('\n🚨 Setting up alerts...')
      await setupAlerts(projectId, config.dashboard_config.alerts)
    }
    
    // Verify setup
    logger.info('\n🔍 Verifying setup...')
    const success = await verifySetup(projectId, config.dashboard_config.dashboards.length)
    
    if (success) {
      logger.success('\n🎉 PostHog dashboard setup completed successfully!')
      logger.info(`\n📊 Dashboard URLs:`)
      for (const dashboard of createdDashboards) {
        logger.info(`  - ${dashboard.name}: ${POSTHOG_HOST}/project/${projectId}/dashboard/${dashboard.id}`)
      }
    } else {
      logger.warning('\n⚠️  Dashboard setup completed with some issues. Please check the PostHog interface.')
      process.exit(1)
    }
    
  } catch (error) {
    logger.error('\n❌ Dashboard setup failed:', error.message)
    process.exit(1)
  }
}

/**
 * Clean up existing dashboards (for testing/reset)
 */
async function cleanupDashboards() {
  try {
    logger.info('🧹 Starting dashboard cleanup...')
    
    const projectId = await getProjectId()
    
    // Get all dashboards
    logger.info('📊 Fetching existing dashboards...')
    const response = await postHogRequest(`projects/${projectId}/dashboards/`, 'GET')
    const allDashboards = response.results || []
    
    // Filter for Words on Phone dashboards (by name patterns)
    const wordsOnPhoneDashboards = allDashboards.filter(dashboard => 
      dashboard.name && (
        dashboard.name.includes('User Engagement Dashboard') ||
        dashboard.name.includes('Game Performance Dashboard') ||
        dashboard.name.includes('Technical Performance Dashboard') ||
        dashboard.name.includes('Privacy & Settings Dashboard') ||
        dashboard.name.includes('Custom Category Dashboard') ||
        dashboard.name.includes('Words on Phone')
      )
    )
    
    if (wordsOnPhoneDashboards.length === 0) {
      logger.info('✅ No Words on Phone dashboards found to cleanup')
      return
    }
    
    logger.info(`🗑️  Found ${wordsOnPhoneDashboards.length} dashboards to delete:`)
    wordsOnPhoneDashboards.forEach(dashboard => {
      logger.info(`   - ${dashboard.name} (ID: ${dashboard.id})`)
    })
    
    // Delete each dashboard
    for (const dashboard of wordsOnPhoneDashboards) {
      try {
        await handleRateLimit()
        await postHogRequest(`projects/${projectId}/dashboards/${dashboard.id}/`, 'DELETE')
        logger.success(`   ✅ Deleted: ${dashboard.name}`)
      } catch (error) {
        logger.error(`   ❌ Failed to delete ${dashboard.name}: ${error.message}`)
      }
    }
    
    logger.success(`🎉 Cleanup completed! Deleted ${wordsOnPhoneDashboards.length} dashboards`)
    
  } catch (error) {
    logger.error('❌ Dashboard cleanup failed:', error.message)
    throw error
  }
}

// Command line handling
const args = process.argv.slice(2)
const command = args.find(arg => !arg.startsWith('--') && !args[args.indexOf(arg) - 1]?.startsWith('--')) || 'setup'

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PostHog Dashboard Setup Script

Usage:
  node scripts/setup-posthog-dashboards.js [command] [options]

Commands:
  setup    Create dashboards (default)
  cleanup  Remove existing Words on Phone dashboards

Options:
  --config <file>    Use custom config file (default: posthog-dashboard-config.json)
  --help, -h         Show this help message

Examples:
  node scripts/setup-posthog-dashboards.js
  node scripts/setup-posthog-dashboards.js --config core-insights-test.json
  node scripts/setup-posthog-dashboards.js cleanup
`)
  process.exit(0)
}

switch (command) {
  case 'cleanup':
    cleanupDashboards()
    break
  case 'setup':
  default:
    setupDashboards()
    break
} 