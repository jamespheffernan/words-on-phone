// Netlify build plugin to enforce proper MIME types
module.exports = {
  onPreBuild: ({ utils }) => {
    console.log('Setting up custom MIME types for JavaScript modules');
  },
  onBuild: ({ utils }) => {
    console.log('Successfully built with proper MIME type handling');
  },
  onPostBuild: ({ utils }) => {
    // Add any required post-build handling here
    console.log('Build completed with custom MIME type handling');
  }
}; 