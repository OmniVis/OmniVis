/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = 'dist-packager';
const PLATFORMS = ['win32', 'darwin', 'linux'];

console.log('📦 Zipping releases...');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`Error: ${DIST_DIR} not found. Run build first.`);
  process.exit(1);
}

const items = fs.readdirSync(DIST_DIR);

items.forEach((item) => {
  // Only zip directories that look like build outputs
  const itemPath = path.join(DIST_DIR, item);
  const stats = fs.statSync(itemPath);

  if (stats.isDirectory() && item.includes('Graphi Desktop-')) {
    const platform = PLATFORMS.find((p) => item.includes(p));
    if (platform) {
      const zipName = `${item}.zip`;
      const zipPath = path.join(DIST_DIR, zipName);

      console.log(`  - Zipping ${item} -> ${zipName}...`);
      try {
        // Use PowerShell to zip (available on Windows)
        execSync(
          `powershell Compress-Archive -Path "${itemPath}" -DestinationPath "${zipPath}" -Force`
        );
        console.log(`    ✅ Created ${zipName}`);
      } catch (e) {
        console.error(`    ❌ Failed to zip ${item}:`, e.message);
      }
    }
  }
});

console.log('🎉 Zipping complete!');
