import { copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  throw new Error('Node.js >=22.13 is required');
}
const options = process.argv.slice(2);
if (options.some((arg) => arg !== '--docker')) throw new Error('Usage: npm run setup -- [--docker]');
if (!existsSync('.env')) copyFileSync('.env.example', '.env');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script using npm run setup');
run(process.execPath, [npmCli, 'ci']);
run(process.execPath, [npmCli, 'run', 'check']);
if (options.includes('--docker')) run('docker', ['compose', 'up', '-d', '--wait']);
console.log('Setup validated. Start the API with npm run dev. Docker is optional.');
