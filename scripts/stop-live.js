const fs = require('fs');
const path = require('path');

const lockDir = '/tmp/mn-zotero-live.lock';
const pidPath = path.join(lockDir, 'pid');

function readLockPid() {
  if (!fs.existsSync(pidPath)) {
    return null;
  }
  const text = fs.readFileSync(pidPath, 'utf8').trim();
  const pid = Number(text);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`锁文件中的PID无效: ${text}`);
  }
  return pid;
}

function tryKill(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    if (error && error.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

function removeLockDir() {
  if (fs.existsSync(lockDir)) {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

function main() {
  const pid = readLockPid();

  if (!pid) {
    removeLockDir();
    console.log('未发现live锁，已完成清理');
    return;
  }

  const sentTerm = tryKill(pid, 'SIGTERM');
  if (sentTerm) {
    console.log(`已发送SIGTERM到PID:${pid}`);
  } else {
    console.log(`PID:${pid}不存在，按僵尸锁处理`);
  }

  removeLockDir();
  console.log('已清理live锁');
}

try {
  main();
} catch (error) {
  console.error(`停止live失败: ${error.message}`);
  process.exit(1);
}
