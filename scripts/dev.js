const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCommand = 'npm';

function spawnDevProcess(label, cwd, args) {
  let child;
  try {
    child = spawn(npmCommand, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: isWindows,
      detached: !isWindows
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[${label}] failed to start:`, error.message || error);
    return null;
  }

  child.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.error(`[${label}] failed to start:`, error.message || error);
  });

  return child;
}

const processes = [
  spawnDevProcess('backend', path.join(rootDir, 'backend'), ['run', 'dev']),
  spawnDevProcess('frontend', path.join(rootDir, 'frontend'), ['run', 'dev'])
].filter(Boolean);

let isShuttingDown = false;
function shutdown(signal = 'SIGTERM') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  processes.forEach((child) => {
    if (!child || child.killed) return;
    if (isWindows) {
      try {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch (_) {
        // ignore
      }
      return;
    }

    try {
      process.kill(-child.pid, signal);
    } catch (_) {
      try {
        child.kill(signal);
      } catch (_) {
        // ignore
      }
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

processes.forEach((child) => {
  child.on('exit', (code) => {
    shutdown();
    process.exit(code ?? 0);
  });
});
