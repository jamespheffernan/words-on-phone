#!/usr/bin/env node

/**
 * Simple PostHog Dashboard Cleanup Script
 * 
 * This script directly deletes all Words on Phone dashboards
 */

import fs from 'fs'
import path from 'path'

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
  }
} catch (error) {
  console.log('Could not load .env.local:', error.message)
}

const POSTHOG_HOST = process.env.VITE_POSTHOG_HOST?.replace('i.posthog.com', 'posthog.com') || 'https://us.posthog.com'
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT_KEY = process.env.VITE_POSTHOG_KEY

if (!POSTHOG_API_KEY || !PROJECT_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${POSTHOG_HOST}/api/${endpoint}`
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }
  
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  if (method === 'DELETE') {
    return null
  }
  
  return await response.json()
}

async function cleanup() {
  try {
    console.log('🧹 Starting simple dashboard cleanup...')
    
    // Get project ID
    const projects = await makeRequest('projects/')
    const project = projects.results.find(p => p.api_token === PROJECT_KEY)
    if (!project) {
      throw new Error('Project not found')
    }
    
    console.log(`📡 Found project: ${project.name} (ID: ${project.id})`)
    
    // Get all dashboards
    const dashboards = await makeRequest(`projects/${project.id}/dashboards/`)
    
    // Filter for Words on Phone dashboards
    const wordsOnPhoneDashboards = dashboards.results.filter(dashboard => 
      dashboard.name && (
        dashboard.name.includes('User Engagement Dashboard') ||
        dashboard.name.includes('Game Performance Dashboard') ||
        dashboard.name.includes('Technical Performance Dashboard') ||
        dashboard.name.includes('Privacy & Settings Dashboard') ||
        dashboard.name.includes('Custom Category Dashboard') ||
        dashboard.name.includes('Words on Phone')
      )
    )
    
    console.log(`🗑️  Found ${wordsOnPhoneDashboards.length} dashboards to delete`)
    
    if (wordsOnPhoneDashboards.length === 0) {
      console.log('✅ No dashboards to cleanup')
      return
    }
    
    // Delete dashboards
    let deleted = 0
    for (const dashboard of wordsOnPhoneDashboards) {
      try {
        await makeRequest(`projects/${project.id}/dashboards/${dashboard.id}/`, 'DELETE')
        console.log(`✅ Deleted: ${dashboard.name}`)
        deleted++
        await new Promise(resolve => setTimeout(resolve, 50)) // Small delay
      } catch (error) {
        console.log(`❌ Failed to delete ${dashboard.name}: ${error.message}`)
      }
    }
    
    console.log(`🎉 Cleanup completed! Deleted ${deleted}/${wordsOnPhoneDashboards.length} dashboards`)
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    process.exit(1)
  }
}

cleanup() 