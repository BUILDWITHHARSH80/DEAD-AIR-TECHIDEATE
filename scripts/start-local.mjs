import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './sites-env.mjs';

const config = path.join(projectRoot, 'dist/server/wrangler.json');
const environmentFile = path.join(projectRoot, '.env');
if (!existsSync(config)) throw new Error('Run npm run build before npm start.');
if (!existsSync(environmentFile)) throw new Error('Copy .env.example to .env and set ADMIN_PASSWORD first.');

// Wrangler resolves relative secret-file paths from the generated config folder.
// Use an absolute path so both CLI parsing and Worker bindings load the same file.
const child = spawn(process.execPath, [
  path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js'),
  'dev', '--config', config, '--local',
  '--persist-to', path.join(projectRoot, '.wrangler/state'),
  '--ip', '127.0.0.1', '--inspector-port', '0',
  '--env-file', environmentFile,
  ...process.argv.slice(2),
], { cwd: projectRoot, env: process.env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}