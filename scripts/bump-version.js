// scripts/bump-version.js
const fs = require('fs');
const path = require('path');
const appJsonPath = path.join(__dirname, '../app.json');

if (!fs.existsSync(appJsonPath)) {
  console.error('app.json not found!');
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Increment Android versionCode
if (appJson.expo && appJson.expo.android && typeof appJson.expo.android.versionCode === 'number') {
  appJson.expo.android.versionCode += 1;
} else {
  if (!appJson.expo) appJson.expo = {};
  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = 1;
}

// 2. Increment App version patch (e.g. 1.0.1 -> 1.0.2)
if (appJson.expo && typeof appJson.expo.version === 'string') {
  const versionParts = appJson.expo.version.split('.');
  if (versionParts.length === 3) {
    versionParts[2] = String(Number(versionParts[2]) + 1);
    appJson.expo.version = versionParts.join('.');
  }
} else {
  if (!appJson.expo) appJson.expo = {};
  appJson.expo.version = '1.0.0';
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Updated to Version: ${appJson.expo.version}, Code: ${appJson.expo.android.versionCode}`);
