// Runs the browser suites one after another. Each suite gets a freshly seeded API (the sign-in limiter and the data start clean).
//   1) start the isolated frontend once:   NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_API_URL=http://localhost:5100/api/v1 npx next dev -p 3100
//   2) from Directory_backend-main:        node tests/e2e/browser/run-all.mjs [admin|owner|validation]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '../../..');
const SEED = path.join(HERE, '.seed.json');
const suites = process.argv[2] ? [process.argv[2]] : ['admin', 'owner', 'validation'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (args, env = {}) => new Promise((resolve) => { const child = spawn(process.execPath, args, { cwd: BACKEND, stdio: 'inherit', env: { ...process.env, ...env } }); child.on('exit', (code) => resolve(code ?? 1)); });

let failed = 0;
for (const suite of suites) {
  fs.rmSync(SEED, { force: true });
  const api = spawn(process.execPath, ['tests/e2e/server.mjs'], { cwd: BACKEND, stdio: 'ignore', env: { ...process.env, E2E_SEED_FILE: SEED } });
  for (let i = 0; i < 60 && !fs.existsSync(SEED); i += 1) await sleep(500);
  if (!fs.existsSync(SEED)) { console.error('The test API did not start.'); api.kill(); process.exit(1); }
  await sleep(500);
  console.log(`\n=== ${suite} ===`);
  const code = await run([path.join('tests/e2e/browser', `${suite}.e2e.mjs`)], { E2E_SEED_FILE: SEED });
  if (code) failed += 1;
  api.kill();
  await sleep(800);
}
console.log(failed ? `\n${failed} suite(s) failed` : '\nAll browser suites passed');
process.exit(failed ? 1 : 0);
