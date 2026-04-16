import fs from 'fs';
import path from 'path';
import { manualContent } from './src/manualsData';

const dir = path.join(process.cwd(), 'public', 'manuals');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const lang in manualContent) {
  fs.writeFileSync(path.join(dir, `${lang}.md`), manualContent[lang]);
}
console.log('Manuals extracted successfully.');
