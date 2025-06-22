import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateVersion() {
  try {
    // Read package.json version
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const packageVersion = packageJson.version;

    // Get git commit hash (short version)
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    
    // Get commit timestamp
    const gitTimestamp = execSync('git log -1 --format=%ct', { encoding: 'utf8' }).trim();
    const commitDate = new Date(parseInt(gitTimestamp) * 1000).toISOString().split('T')[0];

    // Generate version string: v{package}-{hash}
    const version = `v${packageVersion}-${gitHash}`;
    
    const versionInfo = {
      version,
      packageVersion,
      gitHash,
      commitDate,
      buildDate: new Date().toISOString().split('T')[0]
    };

    console.log('Generated version info:', versionInfo);
    return versionInfo;
  } catch (error) {
    console.warn('Failed to generate git version info:', error.message);
    // Fallback version for cases where git is not available
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return {
      version: `v${packageJson.version}-dev`,
      packageVersion: packageJson.version,
      gitHash: 'dev',
      commitDate: new Date().toISOString().split('T')[0],
      buildDate: new Date().toISOString().split('T')[0]
    };
  }
}

export default generateVersion; 