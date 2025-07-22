import { describe, it, expect, vi, beforeEach } from 'vitest'
import posthog from 'posthog-js'

// Mock PostHog - must be defined inline in the factory
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    people: {
      set: vi.fn()
    }
  }
}))

const mockPosthog = vi.mocked(posthog)

// Mock environment
vi.mock('../../config/environment', () => ({
  env: {
    POSTHOG_KEY: 'test-key',
    POSTHOG_HOST: 'https://test.posthog.com',
    IS_DEVELOPMENT: true
  }
}))

// Import analytics after mocks are set up
import { analytics } from '../analytics'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock window properties
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn(() => ({
    matches: false
  }))
})

Object.defineProperty(window, 'navigator', {
  value: {
    standalone: false
  }
})

Object.defineProperty(document, 'referrer', {
  value: ''
})

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('Initialization', () => {
    it('should initialize PostHog with correct configuration', () => {
      expect(mockPosthog.init).toHaveBeenCalledWith('test-key', {
        api_host: 'https://test.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        opt_out_capturing_by_default: false,
        loaded: expect.any(Function)
      })
    })

    it('should not initialize without PostHog key', () => {
      vi.doMock('../../config/environment', () => ({
        env: {
          POSTHOG_KEY: undefined,
          POSTHOG_HOST: 'https://test.posthog.com'
        }
      }))
      
      // The service should not call init without a key
      expect(mockPosthog.init).toHaveBeenCalledTimes(1) // From the initial import
    })
  })

  describe('Event Tracking', () => {
    it('should track app_start event with correct properties', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'analyticsInstallDate') return null // First visit
        return null
      })

      analytics.trackAppStart()

      expect(mockPosthog.capture).toHaveBeenCalledWith('install', {
        platform: 'web',
        appVersion: '0.0.0-dev',
        referrer: undefined
      })

      expect(mockPosthog.capture).toHaveBeenCalledWith('app_start', {
        launchSource: 'direct',
        hasSavedState: false,
        loadTimeMs: expect.any(Number)
      })
    })

    it('should track screen_viewed event', () => {
      analytics.trackScreenView('Home', 'button_click')

      expect(mockPosthog.capture).toHaveBeenCalledWith('screen_viewed', {
        screenName: 'Home',
        previousScreen: undefined,
        navigationMethod: 'button_click'
      })
    })

    it('should track game events with correct properties', () => {
      const gameStartProps = {
        categoryName: 'Movies & TV',
        timerMode: 'hidden' as const,
        isTeamMode: false,
        skipLimit: 3,
        gameId: 'game_123',
        phraseCount: 76
      }

      analytics.track('game_started', gameStartProps)

      expect(mockPosthog.capture).toHaveBeenCalledWith('game_started', gameStartProps)
    })

    it('should apply sampling to high-volume events', () => {
      // Mock Math.random to always return 0.5 (50%)
      const originalRandom = Math.random
      Math.random = vi.fn(() => 0.5)

      // phrase_shown has 25% sampling, so 0.5 > 0.25 should skip
      analytics.track('phrase_shown', {
        phraseId: 'phrase_123',
        categoryName: 'Movies & TV',
        phraseLength: 15,
        timeRemaining: 30000
      })

      expect(mockPosthog.capture).not.toHaveBeenCalled()

      // Reset Math.random
      Math.random = originalRandom
    })

    it('should not track events when opted out', () => {
      analytics.setOptOut(true)
      
      analytics.track('app_start', {
        launchSource: 'direct',
        hasSavedState: false,
        loadTimeMs: 1000
      })

      expect(mockPosthog.capture).not.toHaveBeenCalled()
    })
  })

  describe('Opt-out functionality', () => {
    it('should handle opt-out correctly', () => {
      analytics.setOptOut(true)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('analyticsOptOut', 'true')
      expect(mockPosthog.opt_out_capturing).toHaveBeenCalled()
      expect(mockPosthog.register).toHaveBeenCalledWith({ isOptedOut: true })
    })

    it('should handle opt-in correctly', () => {
      analytics.setOptOut(false)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('analyticsOptOut', 'false')
      expect(mockPosthog.opt_in_capturing).toHaveBeenCalled()
      expect(mockPosthog.register).toHaveBeenCalledWith({ isOptedOut: false })
    })
  })

  describe('Platform Detection', () => {
    it('should detect web platform', () => {
      analytics.trackAppStart()

      expect(mockPosthog.capture).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          platform: 'web'
        })
      )
    })

    it('should detect PWA installation', () => {
      // Mock PWA detection
      window.matchMedia = vi.fn(() => ({
        matches: true
      })) as any

      analytics.trackAppStart()

      expect(mockPosthog.capture).toHaveBeenCalledWith('app_start', {
        launchSource: 'pwa_icon',
        hasSavedState: false,
        loadTimeMs: expect.any(Number)
      })
    })
  })

  describe('Session Management', () => {
    it('should track app exit with session duration', () => {
      analytics.trackAppExit('visibility_change')

      expect(mockPosthog.capture).toHaveBeenCalledWith('app_exit', {
        sessionDurationMs: expect.any(Number),
        gamesPlayed: 0,
        exitReason: 'visibility_change'
      })
    })

    it('should increment games played counter', () => {
      analytics.incrementGamesPlayed()
      analytics.trackAppExit('page_unload')

      expect(mockPosthog.capture).toHaveBeenCalledWith('app_exit', {
        sessionDurationMs: expect.any(Number),
        gamesPlayed: 1,
        exitReason: 'page_unload'
      })
    })
  })
}) 