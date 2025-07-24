#!/usr/bin/env node

/**
 * PostHog Dashboard Setup Script
 * 
 * This script automatically creates PostHog dashboards based on the configuration
 * defined in docs/analytics/posthog-dashboard-config.json
 * 
 * Usage:
 *   npm run setup-dashboards
 *   or
 *   node scripts/setup-posthog-dashboards.js
 * 
 * Environment Variables Required:
 *   VITE_POSTHOG_KEY - PostHog API key
 *   VITE_POSTHOG_HOST - PostHog host URL
 *   POSTHOG_PERSONAL_API_KEY - Personal API key for dashboard creation
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
const CONFIG_PATH = path.join(__dirname, '../../docs/analytics/posthog-dashboard-config.json')
const POSTHOG_HOST = process.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT_KEY = process.env.VITE_POSTHOG_KEY

if (!POSTHOG_API_KEY) {
  console.error('❌ POSTHOG_PERSONAL_API_KEY environment variable is required')
  process.exit(1)
}

if (!PROJECT_KEY) {
  console.error('❌ VITE_POSTHOG_KEY environment variable is required')  
  process.exit(1)
}

/**
 * Load dashboard configuration from JSON file
 */
function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(configData)
  } catch (error) {
    console.error('❌ Failed to load dashboard configuration:', error.message)
    process.exit(1)
  }
}

/**
 * Make API request to PostHog
 */
async function postHogRequest(endpoint, method = 'GET', data = null) {
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
  
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`❌ PostHog API request failed: ${error.message}`)
    throw error
  }
}

/**
 * Get project ID from PostHog API
 */
async function getProjectId() {
  try {
    console.log('🔍 Finding project ID...')
    
    // Get the user info first, which includes team/project information
    const userInfo = await postHogRequest('users/@me/')
    
    if (userInfo && userInfo.team) {
      console.log(`✅ Found project: ${userInfo.team.name} (ID: ${userInfo.team.id})`)
      return userInfo.team.id
    }
    
    // Fallback: try to get project list and find by API key
    const projects = await postHogRequest('projects/')
    
    if (projects && projects.results) {
      // Find project that matches our API key
      const project = projects.results.find(p => p.api_token === PROJECT_KEY)
      
      if (project) {
        console.log(`✅ Found project: ${project.name} (ID: ${project.id})`)
        return project.id
      }
    }
    
    throw new Error('Could not find project ID')
  } catch (error) {
    console.error('❌ Failed to get project ID:', error.message)
    throw error
  }
}

/**
 * Create a dashboard in PostHog
 */
async function createDashboard(projectId, dashboardConfig) {
  try {
    console.log(`📊 Creating dashboard: ${dashboardConfig.name}`)
    
    const dashboardData = {
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      pinned: false,
      filters: dashboardConfig.filters || {},
      tags: ['words-on-phone', 'analytics']
    }
    
    const dashboard = await postHogRequest(
      `projects/${projectId}/dashboards/`,
      'POST',
      dashboardData
    )
    
    console.log(`✅ Created dashboard: ${dashboard.name} (ID: ${dashboard.id})`)
    return dashboard
  } catch (error) {
    console.error(`❌ Failed to create dashboard ${dashboardConfig.name}:`, error.message)
    throw error
  }
}

/**
 * Create dashboard tiles (insights)
 */
async function createDashboardTiles(projectId, dashboardId, tiles) {
  const createdTiles = []
  
  for (const tile of tiles) {
    try {
      console.log(`  📈 Creating tile: ${tile.name}`)
      
      // Create the insight first
      const insightData = {
        name: tile.name,
        query: tile.query,
        filters: tile.filters || {},
        tags: ['dashboard-tile'],
        description: `Auto-generated tile for ${tile.name}`
      }
      
      const insight = await postHogRequest(
        `projects/${projectId}/insights/`,
        'POST',
        insightData
      )
      
      // Add insight to dashboard
      const tileData = {
        insight: insight.id,
        dashboard: dashboardId,
        layouts: {
          sm: { x: 0, y: createdTiles.length * 4, w: 6, h: 4 },
          lg: { x: (createdTiles.length % 2) * 6, y: Math.floor(createdTiles.length / 2) * 4, w: 6, h: 4 }
        }
      }
      
      await postHogRequest(
        `projects/${projectId}/dashboard_tiles/`,
        'POST',
        tileData
      )
      
      console.log(`    ✅ Created tile: ${tile.name}`)
      createdTiles.push(tile)
      
    } catch (error) {
      console.error(`    ❌ Failed to create tile ${tile.name}:`, error.message)
      // Continue with other tiles
    }
  }
  
  return createdTiles
}

/**
 * Set up alerts
 */
async function setupAlerts(projectId, alerts) {
  for (const alert of alerts) {
    try {
      console.log(`🚨 Setting up alert: ${alert.name}`)
      
      const alertData = {
        name: alert.name,
        query: alert.query,
        condition: alert.condition,
        frequency: alert.frequency,
        subscriptions: alert.channels.map(channel => ({ 
          type: channel,
          enabled: true 
        })),
        enabled: true
      }
      
      await postHogRequest(
        `projects/${projectId}/alerts/`,
        'POST',
        alertData
      )
      
      console.log(`  ✅ Created alert: ${alert.name}`)
    } catch (error) {
      console.error(`  ❌ Failed to create alert ${alert.name}:`, error.message)
      // Continue with other alerts
    }
  }
}

/**
 * Verify dashboard setup
 */
async function verifySetup(projectId, expectedDashboards) {
  try {
    console.log('🔍 Verifying dashboard setup...')
    
    const dashboards = await postHogRequest(`projects/${projectId}/dashboards/`)
    const createdDashboards = dashboards.results?.filter(d => 
      d.tags?.includes('words-on-phone')
    ) || []
    
    console.log(`📊 Found ${createdDashboards.length} Words on Phone dashboards`)
    
    for (const dashboard of createdDashboards) {
      const tiles = await postHogRequest(`projects/${projectId}/dashboard_tiles/?dashboard=${dashboard.id}`)
      console.log(`  - ${dashboard.name}: ${tiles.results?.length || 0} tiles`)
    }
    
    if (createdDashboards.length >= expectedDashboards) {
      console.log('✅ Dashboard setup verification passed')
      return true
    } else {
      console.log('⚠️  Some dashboards may not have been created successfully')
      return false
    }
  } catch (error) {
    console.error('❌ Dashboard verification failed:', error.message)
    return false
  }
}

/**
 * Main setup function
 */
async function setupDashboards() {
  try {
    console.log('🚀 Starting PostHog dashboard setup...')
    console.log(`📡 PostHog Host: ${POSTHOG_HOST}`)
    
    // Load configuration
    const config = loadConfig()
    console.log(`📋 Loaded configuration for ${config.dashboard_config.dashboards.length} dashboards`)
    
    // Get project ID
    const projectId = await getProjectId()
    
    // Create dashboards
    console.log('\n📊 Creating dashboards...')
    const createdDashboards = []
    
    for (const dashboardConfig of config.dashboard_config.dashboards) {
      try {
        const dashboard = await createDashboard(projectId, dashboardConfig)
        
        if (dashboardConfig.tiles?.length > 0) {
          await createDashboardTiles(projectId, dashboard.id, dashboardConfig.tiles)
        }
        
        createdDashboards.push(dashboard)
      } catch (error) {
        console.error(`❌ Failed to fully create dashboard ${dashboardConfig.name}`)
        // Continue with other dashboards
      }
    }
    
    // Set up alerts
    if (config.dashboard_config.alerts?.length > 0) {
      console.log('\n🚨 Setting up alerts...')
      await setupAlerts(projectId, config.dashboard_config.alerts)
    }
    
    // Verify setup
    console.log('\n🔍 Verifying setup...')
    const success = await verifySetup(projectId, config.dashboard_config.dashboards.length)
    
    if (success) {
      console.log('\n🎉 PostHog dashboard setup completed successfully!')
      console.log(`\n📊 Dashboard URLs:`)
      for (const dashboard of createdDashboards) {
        console.log(`  - ${dashboard.name}: ${POSTHOG_HOST}/project/${projectId}/dashboard/${dashboard.id}`)
      }
    } else {
      console.log('\n⚠️  Dashboard setup completed with some issues. Please check the PostHog interface.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Dashboard setup failed:', error.message)
    process.exit(1)
  }
}

/**
 * Clean up existing dashboards (for testing/reset)
 */
async function cleanupDashboards() {
  try {
    console.log('🧹 Cleaning up existing Words on Phone dashboards...')
    
    const projectId = await getProjectId()
    const dashboards = await postHogRequest(`projects/${projectId}/dashboards/`)
    
    const wordsOnPhoneDashboards = dashboards.results?.filter(d => 
      d.tags?.includes('words-on-phone')
    ) || []
    
    for (const dashboard of wordsOnPhoneDashboards) {
      try {
        await postHogRequest(`projects/${projectId}/dashboards/${dashboard.id}/`, 'DELETE')
        console.log(`  ✅ Deleted dashboard: ${dashboard.name}`)
      } catch (error) {
        console.error(`  ❌ Failed to delete dashboard ${dashboard.name}:`, error.message)
      }
    }
    
    console.log(`🧹 Cleanup completed. Removed ${wordsOnPhoneDashboards.length} dashboards.`)
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
  }
}

// Command line handling
const command = process.argv[2]

switch (command) {
  case 'cleanup':
    cleanupDashboards()
    break
  case 'setup':
  default:
    setupDashboards()
    break
} 