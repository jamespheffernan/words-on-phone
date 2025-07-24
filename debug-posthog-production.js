// Debug script to test PostHog production environment
// Run this in browser console on https://words-on-phone.netlify.app

console.log('=== PostHog Production Debug ===');

// 1. Check environment variables
console.log('Environment variables:');
console.log('import.meta.env:', import.meta.env);
console.log('VITE_POSTHOG_KEY:', import.meta.env.VITE_POSTHOG_KEY);
console.log('VITE_POSTHOG_HOST:', import.meta.env.VITE_POSTHOG_HOST);

// 2. Check if PostHog is loaded
console.log('\nPostHog status:');
console.log('window.posthog exists:', typeof window.posthog !== 'undefined');
if (typeof window.posthog !== 'undefined') {
  console.log('PostHog config:', window.posthog.config);
  console.log('PostHog has_opted_out_capturing:', window.posthog.has_opted_out_capturing());
  console.log('PostHog get_distinct_id:', window.posthog.get_distinct_id());
}

// 3. Test analytics service
if (typeof window.analytics !== 'undefined') {
  console.log('\nAnalytics service:');
  console.log('Analytics service exists:', typeof window.analytics);
  console.log('Analytics isInitialized:', window.analytics.isInitialized);
  console.log('Analytics isOptedOut:', window.analytics.getOptOutStatus());
  console.log('Analytics anonymousId:', window.analytics.getAnonymousId());
} else {
  console.log('\nAnalytics service not found on window object');
}

// 4. Check for PostHog network requests
console.log('\nTo check network requests:');
console.log('1. Open DevTools Network tab');
console.log('2. Filter by "posthog" or "capture"');
console.log('3. Navigate around the app');
console.log('4. Look for requests to https://us.i.posthog.com/');

// 5. Manual test event
console.log('\nTesting manual event...');
if (typeof window.posthog !== 'undefined') {
  try {
    window.posthog.capture('debug_test_event', {
      timestamp: new Date().toISOString(),
      source: 'debug_script'
    });
    console.log('✅ Manual test event sent');
  } catch (error) {
    console.log('❌ Manual test event failed:', error);
  }
} else {
  console.log('❌ Cannot send test event - PostHog not loaded');
}

console.log('\n=== Debug Complete ==='); 