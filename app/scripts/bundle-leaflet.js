// Script to bundle Leaflet CSS and JS into a TypeScript file for Android WebView
const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join(__dirname, '../src/assets/leaflet.min.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/assets/leaflet.min.css'), 'utf8');

// Escape for embedding in a JS template literal
function escapeForTemplateLiteral(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const escapedJs = escapeForTemplateLiteral(js);
const escapedCss = escapeForTemplateLiteral(css);

const output = `// Auto-generated - Leaflet 1.9.4 bundled locally for Android WebView compatibility
// This ensures maps work WITHOUT any CDN network requests (critical for Android)
// Regenerate: node scripts/bundle-leaflet.js

export const LEAFLET_CSS = \`${escapedCss}\`;

export const LEAFLET_JS = \`${escapedJs}\`;
`;

fs.writeFileSync(path.join(__dirname, '../src/assets/LeafletAssets.ts'), output);
console.log('LeafletAssets.ts written successfully');
console.log('CSS size:', css.length, 'JS size:', js.length);
