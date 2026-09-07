import fs from 'fs';
import path from 'path';

const dist = path.resolve('dist');

// Clean dist folder
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

// Copy root files
const rootFiles = ['index.html', 'manifest.json', 'sw.js', 'database.rules.json', 'firestore.rules'];
for (const file of rootFiles) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(dist, file));
    console.log(`Copied ${file} -> dist/${file}`);
  }
}

// Copy directories
const dirs = ['css', 'js', 'icons'];
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join(dist, dir), { recursive: true });
    console.log(`Copied ${dir}/ -> dist/${dir}/`);
  }
}

console.log('Build completed successfully! All assets ready in dist/.');
