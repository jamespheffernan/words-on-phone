import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { VersionDisplay } from '../VersionDisplay';

// Mock the version constants
const mockVersionInfo = {
  version: 'v1.0.0-abc123d',
  packageVersion: '1.0.0',
  gitHash: 'abc123d',
  commitDate: '2025-01-15',
  buildDate: '2025-01-15'
};

// Mock the global version constants
Object.defineProperty(globalThis, '__APP_VERSION__', {
  value: mockVersionInfo.version,
  writable: false
});

Object.defineProperty(globalThis, '__APP_VERSION_INFO__', {
  value: mockVersionInfo,
  writable: false
});

describe('VersionDisplay', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render version number', () => {
    render(<VersionDisplay />);
    
    const versionButton = screen.getByText('v1.0.0-abc123d');
    expect(versionButton).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<VersionDisplay />);
    
    const versionButton = screen.getByRole('button');
    expect(versionButton).toHaveAttribute('aria-label', 'App version v1.0.0-abc123d. Click to copy version details.');
    expect(versionButton).toHaveAttribute('title', 'Click to copy version information');
  });

  it('should copy version information to clipboard when clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    render(<VersionDisplay />);
    
    const versionButton = screen.getByRole('button');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        'Version: v1.0.0-abc123d\nBuild Date: 2025-01-15\nCommit: abc123d\nCommit Date: 2025-01-15'
      );
    });
  });

  it('should show copy feedback after successful copy', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    render(<VersionDisplay />);
    
    const versionButton = screen.getByRole('button');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // Feedback should disappear after timeout
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle clipboard API failure gracefully', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard failed'));
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<VersionDisplay />);
    
    const versionButton = screen.getByRole('button');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy version info:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should apply custom className when provided', () => {
    render(<VersionDisplay className="custom-class" />);
    
    const versionDisplay = screen.getByRole('button').parentElement;
    expect(versionDisplay).toHaveClass('version-display', 'custom-class');
  });

  it('should handle browsers without clipboard API', async () => {
    // Remove clipboard API
    Object.assign(navigator, {
      clipboard: undefined
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<VersionDisplay />);
    
    const versionButton = screen.getByRole('button');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Version Info:', 
        'Version: v1.0.0-abc123d\nBuild Date: 2025-01-15\nCommit: abc123d\nCommit Date: 2025-01-15'
      );
    });

    consoleSpy.mockRestore();
  });
}); 