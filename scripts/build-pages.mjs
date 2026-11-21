import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'dist');
const output = join(root, '_site');
await mkdir(output, {recursive: true});
const html = await readFile(join(source, 'index.html'), 'utf8');
const config = JSON.parse(await readFile(join(root, 'shared-api.json'), 'utf8'));
const endpoint = new URL(config.reportsEndpoint);
if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/api/reports' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw new Error('Shared API must be an HTTPS reports endpoint.');
const page = html.replace('<html lang="th">', '<html lang="th" data-api="' + endpoint.href + '">');
if (page === html) throw new Error('Cannot set the shared API endpoint.');
await writeFile(join(output, 'index.html'), page);
await rm(join(output,'templates','plan-9.xlsx'), {force:true});
const publicFiles = ['access.js', 'staff-data.js', 'actions.js', 'app.js', 'core.js', 'data.js', 'excel.js', 'views.js', 'styles.css', 'assets', 'templates'];
for (const file of publicFiles) {
  await cp(join(source, file), join(output, file), {recursive: true});
}
console.log('GitHub Pages build complete in _site/');
