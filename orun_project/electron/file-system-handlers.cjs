// electron/file-system-handlers.cjs
//
// IPC handlers for file system operations — evidence management.

const path = require("path");
const fs = require("fs");

function registerFileSystemHandlers(ipcMain, ctx) {
  const { app, log } = ctx;

  /** Returns the evidence root folder, creating it if needed. */
  function getEvidenceRoot() {
    const evidenceDir = path.join(app.getPath("userData"), "evidence");
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    return evidenceDir;
  }

  /**
   * Save a file (base64) to the evidence folder.
   * Auto-creates date-based subfolders (YYYY-MM-DD).
   */
  ipcMain.handle("evidence:save-file", async (_event, { fileName, base64, subfolder }) => {
    try {
      if (!fileName || typeof fileName !== "string") {
        return { ok: false, error: "Invalid file name" };
      }
      if (!base64 || typeof base64 !== "string") {
        return { ok: false, error: "Invalid file data" };
      }

      const evidenceRoot = getEvidenceRoot();

      // Determine target directory
      let targetDir = evidenceRoot;
      if (subfolder) {
        targetDir = path.join(evidenceRoot, subfolder);
      } else {
        // Auto-create date-based subfolder
        const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        targetDir = path.join(evidenceRoot, dateStr);
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Sanitize file name to prevent path traversal
      const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(targetDir, safeName);

      // Decode base64 and write
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync(filePath, buffer);

      log.info("[evidence:save-file] Saved:", filePath);

      return {
        ok: true,
        filePath,
      };
    } catch (err) {
      log.error("[evidence:save-file] Failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  /** Returns the evidence folder path. */
  ipcMain.handle("evidence:get-folder", async (_event, subfolder) => {
    try {
      const evidenceRoot = getEvidenceRoot();
      if (subfolder) {
        const fullPath = path.join(evidenceRoot, subfolder);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
      }
      return evidenceRoot;
    } catch (err) {
      log.error("[evidence:get-folder] Failed:", err.message);
      return "";
    }
  });

  /** Creates a subfolder inside the evidence directory. */
  ipcMain.handle("evidence:create-folder", async (_event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== "string") {
        return { ok: false, error: "Invalid folder path" };
      }

      const evidenceRoot = getEvidenceRoot();
      const fullPath = path.join(evidenceRoot, folderPath);

      // Security: ensure the path stays inside evidence root
      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(path.resolve(evidenceRoot))) {
        return { ok: false, error: "Path outside evidence directory" };
      }

      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }

      log.info("[evidence:create-folder] Created:", resolved);
      return { ok: true };
    } catch (err) {
      log.error("[evidence:create-folder] Failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  /** Lists files in a folder inside the evidence directory. */
  ipcMain.handle("evidence:list-files", async (_event, folderPath) => {
    try {
      const evidenceRoot = getEvidenceRoot();
      const targetPath = folderPath
        ? path.join(evidenceRoot, folderPath)
        : evidenceRoot;

      const resolved = path.resolve(targetPath);
      if (!resolved.startsWith(path.resolve(evidenceRoot))) {
        return [];
      }

      if (!fs.existsSync(resolved)) {
        return [];
      }

      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const fullPath = path.join(resolved, entry.name);
          const stat = fs.statSync(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            size: stat.size,
            isFile: true,
          };
        });
    } catch (err) {
      log.error("[evidence:list-files] Failed:", err.message);
      return [];
    }
  });
}

module.exports = { registerFileSystemHandlers };
