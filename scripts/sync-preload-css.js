/*
  scripts/sync-preload-css.js
  Post-build helper: find built main CSS filename and update build/index.html
*/
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const cssDir = path.join(buildDir, 'static', 'css');

function findMainCss() {
  if (!fs.existsSync(cssDir)) return null;
  const files = fs.readdirSync(cssDir);
  const main = files.find((f) => /^main\.[0-9a-f]+\.css$/.test(f));
  return main || null;
}

function updateIndexHtml(cssFilename) {
  const indexPath = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('build/index.html not found, skipping sync-preload-css');
    return;
  }
  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace any existing /static/css/main.*.css occurrences inside preload/href or stylesheet href
  html = html.replace(/(href=["'])(\/static\/css\/main\.[0-9a-f]+\.css)(["'])/g, `$1/static/css/${cssFilename}$3`);
  html = html.replace(/(href=["'])(%PUBLIC_URL%\/static\/css\/main\.[0-9a-f]+\.css)(["'])/g, `$1%PUBLIC_URL%/static/css/${cssFilename}$3`);

  // Also handle preload link without leading slash
  html = html.replace(/(href=["'])(static\/css\/main\.[0-9a-f]+\.css)(["'])/g, `$1static/css/${cssFilename}$3`);

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('build/index.html updated to preload', cssFilename);

}

function updatePublicIndexHtml(cssFilename) {
  const publicIndexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (!fs.existsSync(publicIndexPath)) {
    console.warn('public/index.html not found, skipping public update');
    return;
  }
  let html = fs.readFileSync(publicIndexPath, 'utf8');

  // Replace occurrences referencing %PUBLIC_URL%/static/css/main.*.css
  html = html.replace(/(%PUBLIC_URL%\/static\/css\/main\.[0-9a-f]+\.css)/g, `%PUBLIC_URL%/static/css/${cssFilename}`);

  // Replace any direct /static/css/main.*.css references
  html = html.replace(/(href=["'])(\/static\/css\/main\.[0-9a-f]+\.css)(["'])/g, `$1%PUBLIC_URL%/static/css/${cssFilename}$3`);

  // Replace any local static/css/main.*.css references
  html = html.replace(/(href=["'])(static\/css\/main\.[0-9a-f]+\.css)(["'])/g, `$1%PUBLIC_URL%/static/css/${cssFilename}$3`);

  fs.writeFileSync(publicIndexPath, html, 'utf8');
  console.log('public/index.html updated to reference', cssFilename);
}

function main() {
  const mainCss = findMainCss();
  if (!mainCss) {
    console.warn('No main.*.css found in build/static/css — skipping update');
    return;
  }
  updateIndexHtml(mainCss);
  // Also update source public/index.html so dev & build preloads match
  try {
    updatePublicIndexHtml(mainCss);
  } catch (e) {
    console.warn('Failed to update public/index.html:', e);
  }
}

main();
