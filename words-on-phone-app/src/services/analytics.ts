import posthog from 'posthog-js'
import { env } from '../config/environment'

// Event sampling rates
const SAMPLING_RATES = {
  phrase_shown: 0.25, // 25% sampling for high-volume events
  default: 1.0 // 100% for all other events
}

// Type definitions for events
export interface AnalyticsEvent {
  // Lifecycle events
  app_start: {
    launchSource: 'direct' | 'pwa_icon' | 'share_link'
    hasSavedState: boolean
    loadTimeMs: number
  }
  app_exit: {
    sessionDurationMs: number
    gamesPlayed: number
    exitReason: 'visibility_change' | 'page_unload'
  }
  install: {
    platform: string
    appVersion: string
    referrer?: string
  }
  
  // Navigation events
  screen_viewed: {
    screenName: 'Home' | 'TeamSetup' | 'GameScreen' | 'RoundEnd' | 'EndScreen' | 'PausedScreen' | 'CategorySelector' | 'Settings' | 'ReviewPage'
    previousScreen?: string
    navigationMethod: 'button_click' | 'back_button' | 'auto_redirect'
  }
  
  // Category selection events
  category_selected: {
    categoryName: string
    source: 'grid' | 'quick_play' | 'surprise_me' | 'last_played'
    categoryGroup?: string
    selectionIndex?: number
    isMultiSelect?: boolean
  }
  surprise_me_clicked: {
    selectedCategory: string
    availableCategories: number
  }
  
  // Gameplay events
  game_started: {
    categoryName: string
    timerMode: 'hidden' | 'visible' | 'random'
    isTeamMode: boolean
    teamCount?: number
    skipLimit: number
    gameId: string
    phraseCount: number
  }
  phrase_shown: {
    phraseId: string
    categoryName: string
    phraseLength: number
    timeRemaining: number
    roundNumber?: number
  }
  answer_correct: {
    phraseId: string
    timeRemaining: number
    teamName?: string
    scoreAfter: number
    responseTimeMs: number
  }
  answer_pass: {
    phraseId: string
    reason: 'skip_limit' | 'user_pass'
    timeRemaining: number
    skipsRemaining: number
  }
  game_completed: {
    totalCorrect: number
    totalPass: number
    durationMs: number
    winningTeam?: string
    gameId: string
    endReason: 'timer' | 'score_limit' | 'victory'
    finalScores?: Record<string, number>
  }
  round_completed: {
    roundNumber: number
    totalCorrect: number
    totalSkip: number
    durationMs: number
    durationSec: number
    isTeamMode: boolean
  }
  
  // Settings events
  settings_opened: {
    source: 'header_button' | 'first_time_setup' | 'menu_button'
  }
  setting_changed: {
    settingName: string
    previousValue: any
    newValue: any
  }
  
  // Custom category events
  category_request_submitted: {
    requestedCategory: string
    phraseCount: number
    requestId: string
  }
  category_generated: {
    requestedCategory: string
    generatedCount: number
    provider: 'openai' | 'gemini'
    requestId: string
    durationMs: number
  }
  
  // PWA & technical events
  pwa_install_prompt: {
    accepted: boolean
    platform: string
  }
  buzzer_played: {
    durationMs: number
    origin: 'manual_test' | 'game_end'
    audioContextState: string
    success: boolean
  }
  
  // Performance & error events
  error_occurred: {
    errorType: 'audio_failure' | 'phrase_loading' | 'api_request' | 'storage_error'
    errorMessage: string
    context: string
    stack?: string
  }
  performance_metric: {
    metricName: 'phrase_load_time' | 'game_start_time' | 'audio_init_time'
    value: number
    unit: 'ms' | 'count'
    context?: string
  }
}

class AnalyticsService {
  private isInitialized = false
  private isOptedOut = false
  private anonymousId: string | null = null
  private sessionStartTime = Date.now()
  private gamesPlayedThisSession = 0

  constructor() {
    // Load opt-out preference and anonymous ID from localStorage on initialization
    this.loadUserPreferences()
  }

  /**
   * Load user preferences from localStorage
   */
  private loadUserPreferences() {
    try {
      // Load opt-out preference
      const optOutPreference = localStorage.getItem('analyticsOptOut')
      if (optOutPreference !== null) {
        this.isOptedOut = optOutPreference === 'true'
      }

      // Load or generate anonymous ID
      this.anonymousId = localStorage.getItem('analyticsAnonymousId')
      if (!this.anonymousId) {
        this.anonymousId = this.generateAnonymousId()
        localStorage.setItem('analyticsAnonymousId', this.anonymousId)
      }
    } catch (error) {
      console.warn('Failed to load analytics preferences:', error)
      // Generate anonymous ID if localStorage fails
      this.anonymousId = this.generateAnonymousId()
    }
  }

  /**
   * Generate a secure anonymous ID
   */
  private generateAnonymousId(): string {
    try {
      // Use crypto.randomUUID() if available (modern browsers)
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `anon_${crypto.randomUUID()}`
      }
      
      // Fallback to timestamp + random
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 15)
      return `anon_${timestamp}_${random}`
    } catch {
      // Ultimate fallback
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 15)
      return `anon_${timestamp}_${random}`
    }
  }

  /**
   * Initialize PostHog with environment configuration
   */
  init() {
    if (this.isInitialized) {
      return
    }

    // Check for PostHog key and provide detailed logging
    if (!env.POSTHOG_KEY) {
      console.warn('🚨 PostHog Analytics disabled - VITE_POSTHOG_KEY environment variable not found')
      console.warn('   To enable analytics:')
      console.warn('   1. Add VITE_POSTHOG_KEY to your environment variables')
      console.warn('   2. For local development: create .env.local file with VITE_POSTHOG_KEY=your_key')
      console.warn('   3. For production: add VITE_POSTHOG_KEY to Netlify environment variables')
      return
    }

    try {
      posthog.init(env.POSTHOG_KEY, {
        api_host: env.POSTHOG_HOST,
        person_profiles: 'identified_only', // Only create profiles for identified users
        capture_pageview: false, // We'll handle screen tracking manually
        capture_pageleave: false, // We'll handle app_exit manually
        disable_session_recording: true, // Disable by default for privacy
        opt_out_capturing_by_default: this.isOptedOut, // Respect user preference
        loaded: (posthog) => {
          // CRITICAL FIX: Manually attach PostHog to window if not already there
          if (typeof (window as any).posthog === 'undefined') {
            (window as any).posthog = posthog;
          }
          
          // Set anonymous ID and super properties
          if (this.anonymousId) {
            posthog.identify(this.anonymousId)
          }
          this.setSuperProperties()
          
          // Apply opt-out state if user has opted out
          if (this.isOptedOut) {
            posthog.opt_out_capturing()
          }
        }
      })

      // Additional fallback: Attach PostHog to window if still not there
      setTimeout(() => {
        if (typeof (window as any).posthog === 'undefined') {
          (window as any).posthog = posthog;
        }
      }, 100);
      
      this.isInitialized = true
      console.log('PostHog analytics initialized', this.isOptedOut ? '(opted out)' : '(tracking enabled)')
    } catch (error) {
      console.error('Failed to initialize PostHog:', error)
    }
  }

  /**
   * Set super properties that are included with every event
   */
  private setSuperProperties() {
    if (!this.isInitialized) return

    const appVersion = this.getAppVersion()
    const platform = this.detectPlatform()
    const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString()
    const isPwaInstall = this.isPWAInstalled()

    posthog.register({
      appVersion,
      platform,
      buildTimestamp,
      isPwaInstall,
      isOptedOut: this.isOptedOut,
      anonymousId: this.anonymousId
    })
  }

  // Removed unused checkOptOutStatus method - opt-out status is handled in loadUserPreferences

  /**
   * Get current opt-out status
   */
  getOptOutStatus(): boolean {
    return this.isOptedOut
  }

  /**
   * Get current anonymous ID
   */
  getAnonymousId(): string | null {
    return this.anonymousId
  }

  /**
   * Set opt-out status
   */
  setOptOut(optOut: boolean) {
    this.isOptedOut = optOut
    
    try {
      localStorage.setItem('analyticsOptOut', String(optOut))
    } catch {
      // Ignore localStorage errors
    }

    if (this.isInitialized) {
      if (optOut) {
        posthog.opt_out_capturing()
      } else {
        posthog.opt_in_capturing()
      }
      
      // Update super properties
      posthog.register({ isOptedOut: optOut })
    }

    console.log(`Analytics ${optOut ? 'disabled' : 'enabled'} by user preference`)
  }

  /**
   * Reset anonymous ID (generates new one)
   */
  resetAnonymousId(): string {
    const newId = this.generateAnonymousId()
    this.anonymousId = newId
    
    try {
      localStorage.setItem('analyticsAnonymousId', newId)
    } catch {
      // Ignore localStorage errors
    }

    if (this.isInitialized && !this.isOptedOut) {
      posthog.identify(newId)
    }

    return newId
  }

  /**
   * Clear all stored analytics data
   */
  clearStoredData() {
    try {
      localStorage.removeItem('analyticsOptOut')
      localStorage.removeItem('analyticsAnonymousId')
      localStorage.removeItem('analyticsInstallDate')
      localStorage.removeItem('totalGamesPlayed')
      localStorage.removeItem('totalCorrectAnswers')
      localStorage.removeItem('favoriteCategory')
    } catch {
      // Ignore localStorage errors
    }

    // Reset internal state
    this.isOptedOut = false
    this.anonymousId = this.generateAnonymousId()
    
    if (this.isInitialized) {
      posthog.reset()
      posthog.identify(this.anonymousId)
    }

    console.log('Analytics data cleared')
  }

  /**
   * Track a typed analytics event
   */
  track<T extends keyof AnalyticsEvent>(
    eventName: T,
    properties: AnalyticsEvent[T]
  ) {
    if (!this.isInitialized || this.isOptedOut) {
      return
    }

    // Apply sampling for high-volume events
    const samplingRate = SAMPLING_RATES[eventName as keyof typeof SAMPLING_RATES] || SAMPLING_RATES.default
    if (Math.random() > samplingRate) {
      return
    }

    try {
      posthog.capture(eventName, properties)
    } catch (error) {
      console.error('Failed to track event:', eventName, error)
    }
  }

  /**
   * Track screen view with automatic previous screen detection
   */
  trackScreenView(
    screenName: AnalyticsEvent['screen_viewed']['screenName'],
    navigationMethod: AnalyticsEvent['screen_viewed']['navigationMethod'] = 'button_click'
  ) {
    const previousScreen = this.getCurrentScreen()
    this.setCurrentScreen(screenName)
    
    this.track('screen_viewed', {
      screenName,
      previousScreen,
      navigationMethod
    })
  }

  /**
   * Track app start event
   */
  trackAppStart() {
    const launchSource = this.detectLaunchSource()
    const hasSavedState = this.hasSavedGameState()
    const loadTimeMs = Date.now() - this.sessionStartTime

    // Check if this is first install
    const isFirstVisit = !localStorage.getItem('analyticsInstallDate')
    if (isFirstVisit) {
      this.trackInstall()
    }

    this.track('app_start', {
      launchSource,
      hasSavedState,
      loadTimeMs
    })

    // Update user properties
    this.updateUserProperties()
  }

  /**
   * Track app exit event
   */
  trackAppExit(exitReason: 'visibility_change' | 'page_unload') {
    const sessionDurationMs = Date.now() - this.sessionStartTime
    
    this.track('app_exit', {
      sessionDurationMs,
      gamesPlayed: this.gamesPlayedThisSession,
      exitReason
    })
  }

  /**
   * Track errors with context
   */
  trackError(errorType: 'audio_failure' | 'phrase_loading' | 'api_request' | 'storage_error', error: Error, context: string) {
    this.track('error_occurred', {
      errorType,
      errorMessage: error.message,
      context,
      stack: error.stack
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName: 'phrase_load_time' | 'game_start_time' | 'audio_init_time', value: number, unit: 'ms' | 'count' = 'ms', context?: string) {
    this.track('performance_metric', {
      metricName,
      value,
      unit,
      context
    })
  }

  /**
   * Track install event (first time only)
   */
  private trackInstall() {
    const installDate = new Date().toISOString()
    
    try {
      localStorage.setItem('analyticsInstallDate', installDate)
    } catch {
      // Ignore localStorage errors
    }

    this.track('install', {
      platform: this.detectPlatform(),
      appVersion: this.getAppVersion(),
      referrer: document.referrer || undefined
    })
  }

  /**
   * Increment games played counter
   */
  incrementGamesPlayed() {
    this.gamesPlayedThisSession++
  }

  /**
   * Update user properties periodically
   */
  private updateUserProperties() {
    if (!this.isInitialized || this.isOptedOut) return

    try {
      const installDate = localStorage.getItem('analyticsInstallDate')
      const totalGamesPlayed = parseInt(localStorage.getItem('totalGamesPlayed') || '0')
      const totalCorrectAnswers = parseInt(localStorage.getItem('totalCorrectAnswers') || '0')
      const favoriteCategory = localStorage.getItem('favoriteCategory')

      posthog.people.set({
        installDate,
        totalGamesPlayed,
        totalCorrectAnswers,
        lastActiveDate: new Date().toISOString(),
        ...(favoriteCategory && { favoriteCategory })
      })
    } catch (error) {
      console.error('Failed to update user properties:', error)
    }
  }

  // Utility methods
  private getAppVersion(): string {
    return import.meta.env.VITE_APP_VERSION || '0.0.0-dev'
  }

  private detectPlatform(): string {
    if (typeof window !== 'undefined') {
      // @ts-ignore - Capacitor is injected globally
      if (window.Capacitor) {
        // @ts-ignore
        return window.Capacitor.getPlatform()
      }
    }
    return 'web'
  }

  private isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           // @ts-ignore
           window.navigator.standalone === true
  }

  private detectLaunchSource(): 'direct' | 'pwa_icon' | 'share_link' {
    if (this.isPWAInstalled()) {
      return 'pwa_icon'
    }
    
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      return 'share_link'
    }
    
    return 'direct'
  }

  private hasSavedGameState(): boolean {
    try {
      return !!localStorage.getItem('gameState') || !!localStorage.getItem('selectedCategories')
    } catch {
      return false
    }
  }

  private getCurrentScreen(): string | undefined {
    try {
      return localStorage.getItem('currentScreen') || undefined
    } catch {
      return undefined
    }
  }

  private setCurrentScreen(screenName: string) {
    try {
      localStorage.setItem('currentScreen', screenName)
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

// Initialize on import (but only if not opted out)
if (typeof window !== 'undefined') {
  analytics.init()
  
  // Track app exit events for session duration
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      analytics.trackAppExit('visibility_change')
    }
  })
  
  window.addEventListener('beforeunload', () => {
    analytics.trackAppExit('page_unload')
  })
} 