const { spawn, spawnSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const port = String(process.env.PORT || 5000);

const getListeningPids = () => {
  const result = spawnSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .trim()
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
};

const getCommandName = (pid) => {
  const result = spawnSync('ps', ['-p', pid, '-o', 'comm='], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return '';
  }

  return result.stdout.trim();
};

const waitForPortToClear = (timeoutMs = 5000) => new Promise((resolve, reject) => {
  const startedAt = Date.now();

  const poll = () => {
    if (getListeningPids().length === 0) {
      resolve();
      return;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error(`Port ${port} is still busy after waiting ${timeoutMs}ms.`));
      return;
    }

    setTimeout(poll, 150);
  };

  poll();
});

const stopExistingNodeServer = async () => {
  const pids = getListeningPids();
  if (pids.length === 0) {
    return;
  }

  const nodeLikePids = pids.filter((pid) => ['node', 'nodemon'].includes(getCommandName(pid)));
  if (nodeLikePids.length !== pids.length) {
    throw new Error(`Port ${port} is already in use by a non-Node process. Free the port or change PORT in server/.env.`);
  }

  nodeLikePids.forEach((pid) => {
    try {
      process.kill(Number(pid), 'SIGTERM');
      console.info(`Stopped existing Node process on port ${port} (PID ${pid}).`);
    } catch (error) {
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }
  });

  await waitForPortToClear();
};

const startNodemon = () => {
  const nodemonBinary = path.resolve(__dirname, '..', 'node_modules', '.bin', 'nodemon');
  const child = spawn(nodemonBinary, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

stopExistingNodeServer()
  .then(startNodemon)
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
