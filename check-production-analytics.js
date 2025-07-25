// Script to check PostHog analytics in production
// Instructions: 
// 1. Wait for Netlify deployment to complete (usually 2-3 minutes)
// 2. Open https://words-on-phone.netlify.app in browser
// 3. Open browser DevTools Console
// 4. Copy and paste this script into the console
// 5. Look for the output and network activity

console.log('🔍 Production PostHog Analytics Check');
console.log('=====================================');

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('VITE_POSTHOG_KEY:', import.meta.env?.VITE_POSTHOG_KEY ? '✅ SET' : '❌ MISSING');
console.log('VITE_POSTHOG_HOST:', import.meta.env?.VITE_POSTHOG_HOST || 'https://us.i.posthog.com (default)');

// Check PostHog object
console.log('\n2. PostHog SDK:');
console.log('window.posthog exists:', typeof window.posthog !== 'undefined' ? '✅ YES' : '❌ NO');

if (typeof window.posthog !== 'undefined') {
  console.log('PostHog config:', window.posthog.config);
  console.log('PostHog opted out:', window.posthog.has_opted_out_capturing ? window.posthog.has_opted_out_capturing() : 'N/A');
  console.log('PostHog distinct ID:', window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : 'N/A');
}

// Check analytics service (if exposed)
console.log('\n3. Analytics Service:');
if (typeof window.analytics !== 'undefined') {
  console.log('Analytics service exists: ✅ YES');
  console.log('Is initialized:', window.analytics.isInitialized || 'unknown');
  console.log('Is opted out:', window.analytics.getOptOutStatus ? window.analytics.getOptOutStatus() : 'unknown');
} else {
  console.log('Analytics service exists: ❌ NO (may be normal if not exposed to window)');
}

// Manual test event
console.log('\n4. Manual Test Event:');
if (typeof window.posthog !== 'undefined' && !window.posthog.has_opted_out_capturing()) {
  try {
    window.posthog.capture('production_debug_test', {
      timestamp: new Date().toISOString(),
      source: 'manual_debug_script',
      test_id: Math.random().toString(36).substring(7)
    });
    console.log('✅ Test event sent - check PostHog dashboard in 2-3 minutes');
  } catch (error) {
    console.log('❌ Test event failed:', error);
  }
} else {
  console.log('❌ Cannot send test event - PostHog not available or opted out');
}

// Network monitoring instructions
console.log('\n5. Network Monitoring:');
console.log('📡 To monitor PostHog requests:');
console.log('   1. Open DevTools Network tab');
console.log('   2. Filter by "posthog" or "capture"');
console.log('   3. Navigate around the app');
console.log('   4. Look for requests to https://us.i.posthog.com/capture');

// Check for console warnings
console.log('\n6. Console Warnings:');
console.log('🔍 Look above for any PostHog warnings or errors');
console.log('   - Warning messages indicate missing environment variables');
console.log('   - Error messages indicate initialization problems');

console.log('\n✅ Check complete! See results above.');
console.log('📊 If PostHog is working, you should see capture requests in Network tab.'); 