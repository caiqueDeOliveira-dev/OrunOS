const orun = (typeof window !== "undefined" ? window.orun : null) as Window["orun"] | null;

const STORAGE_KEYS = ["orun-achievements", "orun-error-guard", "orun-inventory", "orun-evidence"];
const BACKUP_FOLDER = "backups";
const MAX_BACKUPS = 10;

interface BackupInfo {
  lastBackup: string | null;
  nextBackup: string | null;
  totalBackups: number;
  storageUsed: number;
}

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _lastBackup: string | null = null;
let _nextBackup: string | null = null;
let _cacheHits = 0;
let _cacheMisses = 0;

function getBackupDir(): string {
  return BACKUP_FOLDER;
}

async function listExistingBackups(): Promise<string[]> {
  if (!orun) return [];
  const files = await orun.fileSystem.listFiles(getBackupDir());
  return files
    .filter((f) => f.name.startsWith("orun-backup-") && f.name.endsWith(".json"))
    .map((f) => f.name)
    .sort()
    .reverse();
}

async function pruneOldBackups(): Promise<void> {
  if (!orun) return;
  const files = await listExistingBackups();
  if (files.length > MAX_BACKUPS) {
    const toRemove = files.slice(MAX_BACKUPS);
    for (const name of toRemove) {
      try {
        const filePath = `${getBackupDir()}/${name}`;
        await orun.fileSystem.listFiles(getBackupDir());
      } catch {}
    }
  }
}

async function performBackup(): Promise<boolean> {
  try {
    const data: Record<string, string | null> = {};
    for (const key of STORAGE_KEYS) {
      try {
        data[key] = localStorage.getItem(key);
      } catch {
        data[key] = null;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `orun-backup-${timestamp}.json`;
    const jsonStr = JSON.stringify({ timestamp, data }, null, 2);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));

    if (orun) {
      const result = await orun.fileSystem.saveFile({
        fileName,
        base64,
        subfolder: getBackupDir(),
      });
      if (!result.ok) return false;
    }

    _lastBackup = new Date().toISOString();
    await pruneOldBackups();
    return true;
  } catch {
    return false;
  }
}

export const AutoBackup = {
  init(intervalMinutes = 60) {
    performBackup();
    const ms = intervalMinutes * 60 * 1000;
    _nextBackup = new Date(Date.now() + ms).toISOString();
    if (_intervalId) clearInterval(_intervalId);
    _intervalId = setInterval(() => {
      performBackup();
      _nextBackup = new Date(Date.now() + ms).toISOString();
    }, ms);
  },

  stop() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  },

  async manualBackup(): Promise<boolean> {
    const ok = await performBackup();
    if (_intervalId) {
      const ms = 60 * 60 * 1000;
      _nextBackup = new Date(Date.now() + ms).toISOString();
    }
    return ok;
  },

  async getBackupInfo(): Promise<BackupInfo> {
    let totalBackups = 0;
    let storageUsed = 0;
    if (orun) {
      const files = await listExistingBackups();
      totalBackups = files.length;
    }
    return {
      lastBackup: _lastBackup,
      nextBackup: _nextBackup,
      totalBackups,
      storageUsed,
    };
  },

  async listBackups(): Promise<{ name: string; path: string; size: number; date: string }[]> {
    if (!orun) return [];
    const files = await orun.fileSystem.listFiles(getBackupDir());
    return files
      .filter((f) => f.name.startsWith("orun-backup-") && f.name.endsWith(".json"))
      .map((f) => ({
        name: f.name,
        path: f.path,
        size: f.size,
        date: f.name.replace("orun-backup-", "").replace(".json", "").replace(/---/g, "T").replace(/--/g, ":"),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
};
