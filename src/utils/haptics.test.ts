import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the @capacitor/haptics module
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined)
  },
  ImpactStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  }
}));

// Import the mocked module
import { Haptics } from '@capacitor/haptics';
// Import after the mock is set up
import { vibrate, vibrateSuccess, vibrateError, vibrateWarning, HapticsImpactStyle } from './haptics';

describe('Haptics Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('vibrate', () => {
    it('calls Haptics.impact with the specified style', async () => {
      await vibrate(HapticsImpactStyle.Light);
      expect(Haptics.impact).toHaveBeenCalledWith({ style: HapticsImpactStyle.Light });
    });

    it('uses Medium style by default if no style is provided', async () => {
      await vibrate();
      expect(Haptics.impact).toHaveBeenCalledWith({ style: HapticsImpactStyle.Medium });
    });

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      vi.mocked(Haptics.impact).mockRejectedValueOnce(new Error('Test error'));
      
      await vibrate();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Haptics not available:',
        expect.any(Error)
      );
    });
  });

  describe('vibrateSuccess', () => {
    it('calls Haptics.notification with SUCCESS type', async () => {
      await vibrateSuccess();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
    });

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      vi.mocked(Haptics.notification).mockRejectedValueOnce(new Error('Test error'));
      
      await vibrateSuccess();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Haptics not available:',
        expect.any(Error)
      );
    });
  });

  describe('vibrateError', () => {
    it('calls Haptics.notification with ERROR type', async () => {
      await vibrateError();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: 'ERROR' });
    });
  });

  describe('vibrateWarning', () => {
    it('calls Haptics.notification with WARNING type', async () => {
      await vibrateWarning();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: 'WARNING' });
    });
  });
}); 