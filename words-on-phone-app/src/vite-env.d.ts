/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string;
declare const __APP_VERSION_INFO__: {
  version: string;
  packageVersion: string;
  gitHash: string;
  commitDate: string;
  buildDate: string;
};

// Enable JSON module imports
declare module "*.json" {
  const value: any;
  export default value;
}
