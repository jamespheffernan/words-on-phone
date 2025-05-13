/**
 * Register the service worker for PWA functionality
 */
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
};

/**
 * Check if the app can be installed as a PWA
 * @returns Promise<boolean> True if the app can be installed
 */
export const canInstallPWA = async (): Promise<boolean> => {
  if ('getInstalledRelatedApps' in navigator) {
    try {
      const relatedApps = await (navigator as any).getInstalledRelatedApps();
      return relatedApps.length === 0;
    } catch (error) {
      console.error('Error checking installed apps:', error);
    }
  }
  return false;
};

export default { registerServiceWorker, canInstallPWA }; 