/**
 * Register the service worker for PWA functionality
 */
export const registerServiceWorker = () => {
  console.log('Checking if service worker is supported');
  
  if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported in this browser');
    
    window.addEventListener('load', () => {
      console.log('Window loaded, registering service worker');
      
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered successfully with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
        });
        
      // Log current service worker status
      if (navigator.serviceWorker.controller) {
        console.log('Page is currently controlled by service worker');
      } else {
        console.log('Page is not currently controlled by service worker');
      }
    });
  } else {
    console.log('Service Worker is not supported in this browser');
  }
};

/**
 * Check if the app can be installed as a PWA
 * @returns Promise<boolean> True if the app can be installed
 */
export const canInstallPWA = async (): Promise<boolean> => {
  console.log('Checking if app can be installed as PWA');
  
  if ('getInstalledRelatedApps' in navigator) {
    try {
      console.log('getInstalledRelatedApps API is available');
      const relatedApps = await (navigator as any).getInstalledRelatedApps();
      const canInstall = relatedApps.length === 0;
      console.log('App can be installed as PWA:', canInstall);
      return canInstall;
    } catch (error) {
      console.error('Error checking installed apps:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
    }
  } else {
    console.log('getInstalledRelatedApps API is not available');
  }
  return false;
};

export default { registerServiceWorker, canInstallPWA }; 