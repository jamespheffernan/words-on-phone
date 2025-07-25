// Comprehensive PostHog Debug Script
// Copy and paste this into the browser console on https://words-on-phone.netlify.app

console.log('🕵️ Deep PostHog Analytics Debug');
console.log('================================');

// 1. Check localStorage for privacy settings
console.log('\n1. Privacy & localStorage Settings:');
const analyticsOptOut = localStorage.getItem('analyticsOptOut');
const anonymousId = localStorage.getItem('analyticsAnonymousId');
console.log('analyticsOptOut:', analyticsOptOut);
console.log('analyticsAnonymousId:', anonymousId ? '[SET]' : '[MISSING]');

// 2. Check PostHog SDK state
console.log('\n2. PostHog SDK State:');
console.log('window.posthog exists:', typeof window.posthog);
if (typeof window.posthog !== 'undefined') {
  console.log('PostHog methods available:', {
    capture: typeof window.posthog.capture,
    init: typeof window.posthog.init,
    opt_out_capturing: typeof window.posthog.opt_out_capturing,
    has_opted_out_capturing: typeof window.posthog.has_opted_out_capturing,
    get_distinct_id: typeof window.posthog.get_distinct_id
  });
  
  try {
    console.log('PostHog opted out status:', window.posthog.has_opted_out_capturing());
    console.log('PostHog distinct ID:', window.posthog.get_distinct_id());
    console.log('PostHog config:', window.posthog.config);
  } catch (error) {
    console.log('Error reading PostHog state:', error);
  }
}

// 3. Test manual event capture
console.log('\n3. Manual Event Test:');
if (typeof window.posthog !== 'undefined') {
  console.log('Attempting manual capture...');
  try {
    // Clear any previous network monitoring
    console.log('📡 WATCH NETWORK TAB NOW - sending test event');
    
    window.posthog.capture('debug_manual_test', {
      timestamp: new Date().toISOString(),
      test_id: Math.random().toString(36).substring(7),
      debug_source: 'manual_console_test'
    });
    
    console.log('✅ Manual capture call completed (check Network tab for actual request)');
  } catch (error) {
    console.log('❌ Manual capture failed:', error);
  }
} else {
  console.log('❌ Cannot test - PostHog not available');
}

// 4. Check for Content Security Policy
console.log('\n4. Security & Blocking Check:');
const metaCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
console.log('CSP meta tag:', metaCsp ? metaCsp.content : 'None found');

// Check for common ad blockers
const adBlockerTest = document.createElement('div');
adBlockerTest.innerHTML = '&nbsp;';
adBlockerTest.className = 'adsbox';
document.body.appendChild(adBlockerTest);
setTimeout(() => {
  const isBlocked = adBlockerTest.offsetHeight === 0;
  console.log('Ad blocker detected:', isBlocked);
  document.body.removeChild(adBlockerTest);
}, 100);

// 5. Check analytics service state (if exposed)
console.log('\n5. Analytics Service State:');
if (typeof window.analytics !== 'undefined') {
  console.log('Analytics service available');
  try {
    console.log('Is initialized:', window.analytics.isInitialized);
    console.log('Opt out status:', window.analytics.getOptOutStatus());
    console.log('Anonymous ID:', window.analytics.getAnonymousId());
  } catch (error) {
    console.log('Error reading analytics service:', error);
  }
} else {
  console.log('Analytics service not exposed to window (normal)');
}

// 6. Test network connectivity to PostHog
console.log('\n6. Network Connectivity Test:');
fetch('https://us.i.posthog.com/decide/?v=3', {
  method: 'GET',
  mode: 'cors'
}).then(response => {
  console.log('PostHog decide endpoint reachable:', response.ok, response.status);
}).catch(error => {
  console.log('PostHog network connectivity failed:', error);
});

// 7. Environment variables check
console.log('\n7. Environment Variables:');
console.log('Note: Environment variables are only accessible within the app modules');
console.log('They should be visible in the app initialization messages');

// 8. Instructions for user
console.log('\n8. Next Steps:');
console.log('📝 Please check:');
console.log('   1. Are you using any ad blockers or privacy extensions?');
console.log('   2. Check Network tab for any requests to us.i.posthog.com');
console.log('   3. Try in incognito/private browsing mode');
console.log('   4. Navigate around the app and check for capture requests');
console.log('   5. Look for any console errors or warnings');

console.log('\n✅ Debug complete! Check all sections above.'); 