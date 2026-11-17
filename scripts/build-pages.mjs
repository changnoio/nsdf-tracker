import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'dist');
const output = join(root, '_site');
await mkdir(output, {recursive: true});
const html = await readFile(join(source, 'index.html'), 'utf8');
const page = html.replace('<html lang="th">', '<html lang="th" data-storage="browser">');
if (page === html) throw new Error('Cannot set the GitHub Pages storage mode.');
await writeFile(join(output, 'index.html'), page);
await rm(join(output,'templates','plan-9.xlsx'), {force:true});
const publicFiles = ['access.js', 'staff-data.js', 'actions.js', 'app.js', 'core.js', 'data.js', 'excel.js', 'views.js', 'styles.css', 'assets', 'templates'];
for (const file of publicFiles) {
  await cp(join(source, file), join(output, file), {recursive: true});
}
console.log('GitHub Pages build complete in _site/');
