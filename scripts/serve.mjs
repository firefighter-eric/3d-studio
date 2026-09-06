import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { get } from 'node:http';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2];
const extraArgs = process.argv.slice(3);
const port = mode === 'preview' ? 5181 : 5180;
const url = `http://localhost:${port}/`;

function portIsFree() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') resolve(false);
      else reject(error);
    });
    probe.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

function belongsToThisCheckout() {
  try {
    const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 2000 };
    const pids = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], options)
      .trim().split(/\s+/u).filter(Boolean);
    return pids.length > 0 && pids.every((pid) => {
      const cwd = execFileSync('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn'], options)
        .split('\n').find((line) => line.startsWith('n'))?.slice(1);
      return cwd && realpathSync(cwd) === root;
    });
  } catch {
    return false;
  }
}

function respondsAsExpected() {
  const expectedHtml = mode === 'preview' ? readFileSync(path.join(root, 'dist/index.html'), 'utf8') : null;
  return new Promise((resolve) => {
    const request = get({
      hostname: '127.0.0.1', port, path: '/',
      headers: { Accept: mode === 'dev' ? 'text/x-vite-ping' : 'text/html' },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('error', () => resolve(false));
      response.on('end', () => resolve(mode === 'dev'
        ? response.statusCode === 204
        : response.statusCode === 200 && body === expectedHtml));
    });
    request.setTimeout(2000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

async function main() {
  if (mode !== 'dev' && mode !== 'preview') throw new Error('用法：node scripts/serve.mjs dev|preview');
  process.chdir(root);

  // Only reuse the standard buttons. Explicit CLI options retain Vite's behavior.
  if (extraArgs.length === 0 && !await portIsFree()) {
    if (belongsToThisCheckout() && await respondsAsExpected()) {
      console.log(`[3d-studio] ${mode === 'dev' ? '开发' : '预览'}服务已在运行：${url}`);
      return;
    }
    throw new Error(`端口 ${port} 已被占用，无法确认为当前项目的${mode === 'dev' ? '开发' : '预览'}服务。现有进程未被修改。`);
  }

  const require = createRequire(import.meta.url);
  const viteCli = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  // Keep Vite in this terminal's process so Ctrl-C stops it normally.
  process.argv = [process.execPath, viteCli, ...(mode === 'preview' ? ['preview'] : []),
    '--host', '0.0.0.0', '--port', String(port), '--strictPort', ...extraArgs];
  await import(pathToFileURL(viteCli).href);
}

main().catch((error) => {
  console.error(`[3d-studio] ${error.message}`);
  process.exitCode = 1;
});
