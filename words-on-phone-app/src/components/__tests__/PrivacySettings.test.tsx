import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PrivacySettings } from '../PrivacySettings'
import { analytics } from '../../services/analytics'

// Mock the analytics service
vi.mock('../../services/analytics', () => ({
  analytics: {
    getOptOutStatus: vi.fn(),
    getAnonymousId: vi.fn(),
    setOptOut: vi.fn(),
    resetAnonymousId: vi.fn(),
    clearStoredData: vi.fn(),
    track: vi.fn()
  }
}))

const mockAnalytics = analytics as any

describe('PrivacySettings', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAnalytics.getOptOutStatus.mockReturnValue(false)
    mockAnalytics.getAnonymousId.mockReturnValue('anon_test123')
  })

  it('should not render when isOpen is false', () => {
    render(<PrivacySettings {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Privacy Settings')).not.toBeInTheDocument()
  })

  it('should render privacy settings modal when open', () => {
    render(<PrivacySettings {...defaultProps} />)
    
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument()
    expect(screen.getByText('Analytics & Data Collection')).toBeInTheDocument()
    expect(screen.getByText('Anonymous Identifier')).toBeInTheDocument()
    expect(screen.getByText('Data Management')).toBeInTheDocument()
    expect(screen.getByText('What Data We Collect')).toBeInTheDocument()
  })

  it('should load current analytics settings when opened', () => {
    mockAnalytics.getOptOutStatus.mockReturnValue(true)
    mockAnalytics.getAnonymousId.mockReturnValue('anon_custom456')

    render(<PrivacySettings {...defaultProps} />)

    expect(mockAnalytics.getOptOutStatus).toHaveBeenCalled()
    expect(mockAnalytics.getAnonymousId).toHaveBeenCalled()
    expect(screen.getByText('Analytics Disabled')).toBeInTheDocument()
    expect(screen.getByText('anon_custom456')).toBeInTheDocument()
  })

  it('should toggle analytics opt-out when toggle is clicked', async () => {
    render(<PrivacySettings {...defaultProps} />)

    const toggle = screen.getByTestId('analytics-toggle')
    expect(toggle).toBeChecked() // Initially enabled (not opted out)

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(mockAnalytics.setOptOut).toHaveBeenCalledWith(true)
    })

    expect(screen.getByText('Analytics Disabled')).toBeInTheDocument()
  })

  it('should track settings change when analytics is re-enabled', async () => {
    mockAnalytics.getOptOutStatus.mockReturnValue(true)
    render(<PrivacySettings {...defaultProps} />)

    const toggle = screen.getByTestId('analytics-toggle')
    expect(toggle).not.toBeChecked() // Initially disabled (opted out)

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(mockAnalytics.setOptOut).toHaveBeenCalledWith(false)
      expect(mockAnalytics.track).toHaveBeenCalledWith('setting_changed', {
        settingName: 'analytics_opt_out',
        previousValue: true,
        newValue: false
      })
    })
  })

  it('should reset anonymous ID when button is clicked', async () => {
    mockAnalytics.resetAnonymousId.mockReturnValue('anon_new789')
    render(<PrivacySettings {...defaultProps} />)

    const resetButton = screen.getByTestId('reset-id-button')
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(mockAnalytics.resetAnonymousId).toHaveBeenCalled()
    })

    expect(mockAnalytics.track).toHaveBeenCalledWith('setting_changed', {
      settingName: 'anonymous_id_reset',
      previousValue: 'old_id',
      newValue: 'new_id'
    })
  })

  it('should disable reset ID button when opted out', () => {
    mockAnalytics.getOptOutStatus.mockReturnValue(true)
    render(<PrivacySettings {...defaultProps} />)

    const resetButton = screen.getByTestId('reset-id-button')
    expect(resetButton).toBeDisabled()
  })

  it('should show confirmation dialog for clearing data', async () => {
    render(<PrivacySettings {...defaultProps} />)

    const clearButton = screen.getByTestId('clear-data-button')
    fireEvent.click(clearButton)

    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument()
    expect(screen.getByTestId('confirm-clear-button')).toBeInTheDocument()
    expect(screen.getByTestId('cancel-clear-button')).toBeInTheDocument()
  })

  it('should clear data when confirmed', async () => {
    mockAnalytics.getAnonymousId.mockReturnValue('anon_new_after_clear')
    render(<PrivacySettings {...defaultProps} />)

    // Click clear data button
    const clearButton = screen.getByTestId('clear-data-button')
    fireEvent.click(clearButton)

    // Confirm the action
    const confirmButton = screen.getByTestId('confirm-clear-button')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockAnalytics.clearStoredData).toHaveBeenCalled()
    })

    // Should hide confirmation dialog
    expect(screen.queryByText(/This will permanently delete/)).not.toBeInTheDocument()
  })

  it('should cancel clearing data when cancel is clicked', async () => {
    render(<PrivacySettings {...defaultProps} />)

    // Click clear data button
    const clearButton = screen.getByTestId('clear-data-button')
    fireEvent.click(clearButton)

    // Cancel the action
    const cancelButton = screen.getByTestId('cancel-clear-button')
    fireEvent.click(cancelButton)

    // Should hide confirmation dialog
    expect(screen.queryByText(/This will permanently delete/)).not.toBeInTheDocument()
    // Should not clear data
    expect(mockAnalytics.clearStoredData).not.toHaveBeenCalled()
  })

  it('should close modal when close button is clicked', () => {
    const onClose = vi.fn()
    render(<PrivacySettings {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should close modal when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<PrivacySettings {...defaultProps} onClose={onClose} />)

    const backdrop = screen.getByText('Privacy Settings').closest('.modal-backdrop')
    expect(backdrop).toBeInTheDocument()
    
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('should show opt-out notice when analytics is disabled', () => {
    mockAnalytics.getOptOutStatus.mockReturnValue(true)
    render(<PrivacySettings {...defaultProps} />)

    expect(screen.getByText(/Analytics are disabled/)).toBeInTheDocument()
  })

  it('should display data collection information', () => {
    render(<PrivacySettings {...defaultProps} />)

    expect(screen.getByText('Game performance and usage statistics')).toBeInTheDocument()
    expect(screen.getByText('Feature interaction and navigation patterns')).toBeInTheDocument()
    expect(screen.getByText('Error logs and crash reports')).toBeInTheDocument()
    expect(screen.getByText(/We NEVER collect:/)).toBeInTheDocument()
  })
}) 