import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../src/studioConfig.js');

try {
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Format current date as YYYY.MM.DD HH:mm
  const now = new Date();
  
  // Convert to Korean Standard Time (UTC+9) for consistency
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
  
  const newVersion = `${year}.${month}.${day} ${hours}:${minutes}`;
  
  // Replace APP_VERSION: "...",
  // or APP_VERSION: '...',
  const updatedContent = content.replace(
    /APP_VERSION:\s*["'][^"']*["']/g,
    `APP_VERSION: "${newVersion}"`
  );
  
  fs.writeFileSync(configPath, updatedContent, 'utf8');
  console.log(`\n✅ APP_VERSION successfully updated to: ${newVersion}\n`);
} catch (error) {
  console.error("Failed to update APP_VERSION:", error);
  process.exit(1);
}
