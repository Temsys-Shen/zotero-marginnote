const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const lockDir = '/tmp/mn-zotero-live.lock';
const mnAppName = 'MarginNote 4';
const mnAppPath = '/Applications/MarginNote 4.app';
const watchPollMs = Number(process.env.MN_LIVE_POLL_MS || 1000);
const watchDebounceMs = Number(process.env.MN_LIVE_DEBOUNCE_MS || 2000);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options
  });

  if (result.error) {
    throw new Error(`Failed to execute ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function isLiveDeployProcess(pid) {
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return false;
  }

  const commandLine = (result.stdout || '').trim();
  return commandLine.includes('scripts/live-deploy.js');
}

function acquireLock() {
  if (fs.existsSync(lockDir)) {
    const pidPath = path.join(lockDir, 'pid');
    const lockPid = fs.existsSync(pidPath) ? fs.readFileSync(pidPath, 'utf8').trim() : '';
    const pid = Number(lockPid);

    if (Number.isInteger(pid) && pid > 0) {
      if (isLiveDeployProcess(pid)) {
        throw new Error(`已有部署任务在运行，PID: ${pid}`);
      }
    }

    fs.rmSync(lockDir, { recursive: true, force: true });
  }

  fs.mkdirSync(lockDir, { recursive: false });
  fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid));
}

function releaseLock() {
  if (fs.existsSync(lockDir)) {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

function getAddonId() {
  const addonConfigPath = path.join(projectRoot, 'src', 'mnaddon.json');
  const addonConfig = JSON.parse(fs.readFileSync(addonConfigPath, 'utf8'));

  if (!addonConfig.addonid) {
    throw new Error('src/mnaddon.json缺少addonid');
  }

  return addonConfig.addonid;
}

function getExtensionDir(addonId) {
  return path.join(
    os.homedir(),
    'Library',
    'Containers',
    'QReader.MarginStudy.easy',
    'Data',
    'Library',
    'MarginNote Extensions',
    addonId
  );
}

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.copyFileSync(src, dest);
}

function syncSourceToExtension(extensionDir) {
  const srcDir = path.join(projectRoot, 'src');
  console.log('[1/2] 开始同步src到插件目录');
  fs.mkdirSync(extensionDir, { recursive: true });

  for (const entry of fs.readdirSync(extensionDir)) {
    fs.rmSync(path.join(extensionDir, entry), { recursive: true, force: true });
  }

  copyRecursiveSync(srcDir, extensionDir);
}

function isProcessRunning() {
  const result = spawnSync('pgrep', ['-x', mnAppName], { stdio: 'ignore' });
  return result.status === 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(conditionFn, timeoutMs, intervalMs, timeoutMessage) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (conditionFn()) {
      return;
    }
    await delay(intervalMs);
  }

  throw new Error(timeoutMessage);
}

async function restartMarginNote() {
  console.log('[2/2] 开始重启MarginNote');

  run('osascript', ['-e', `tell application "${mnAppName}" to quit`], { stdio: 'ignore' });
  await delay(1000);

  if (isProcessRunning()) {
    run('killall', [mnAppName], { stdio: 'ignore' });
  }

  await waitUntil(() => !isProcessRunning(), 20000, 250, `等待${mnAppName}退出超时`);

  if (fs.existsSync(mnAppPath)) {
    run('open', ['-a', mnAppPath]);
  } else {
    run('open', ['-a', mnAppName]);
  }

  await waitUntil(() => isProcessRunning(), 20000, 250, `等待${mnAppName}启动超时`);
}

async function deployOnce(extensionDir) {
  syncSourceToExtension(extensionDir);
  console.log(`同步目录: ${extensionDir}`);

  await restartMarginNote();
  console.log('热部署完成');
}

function walkFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
      continue;
    }

    if (entry.isFile()) {
      if (fullPath.endsWith('.mnaddon')) {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

function calcWatchFingerprint() {
  const files = walkFiles(projectRoot).sort();
  const hash = crypto.createHash('sha1');

  for (const file of files) {
    const stat = fs.statSync(file);
    hash.update(file);
    hash.update(String(stat.mtimeMs));
    hash.update(String(stat.size));
  }

  return hash.digest('hex');
}

async function runWatchMode(extensionDir) {
  console.log(`进入live监听模式，轮询间隔${watchPollMs}ms，防抖${watchDebounceMs}ms`);
  await deployOnce(extensionDir);

  let lastFingerprint = calcWatchFingerprint();
  while (true) {
    await delay(watchPollMs);
    let nextFingerprint = calcWatchFingerprint();
    if (nextFingerprint !== lastFingerprint) {
      console.log(`检测到文件变更，等待${watchDebounceMs}ms防抖`);
      await delay(watchDebounceMs);
      nextFingerprint = calcWatchFingerprint();
      if (nextFingerprint !== lastFingerprint) {
        lastFingerprint = nextFingerprint;
        await deployOnce(extensionDir);
      }
    }
  }
}

async function main() {
  const modeArg = (process.argv[2] || 'once').toLowerCase();
  if (modeArg !== 'once' && modeArg !== 'watch') {
    throw new Error(`未知模式: ${modeArg}，仅支持once或watch`);
  }

  acquireLock();
  process.on('exit', releaseLock);
  process.on('SIGINT', () => {
    releaseLock();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    releaseLock();
    process.exit(143);
  });

  const addonId = getAddonId();
  const extensionDir = getExtensionDir(addonId);
  if (modeArg === 'watch') {
    await runWatchMode(extensionDir);
    return;
  }
  await deployOnce(extensionDir);
}

main().catch((error) => {
  console.error(`部署失败: ${error.message}`);
  process.exit(1);
});
