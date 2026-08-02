const orun = (typeof window !== "undefined" ? window.orun : null) as Window["orun"] | null;

interface FileSystemBridge {
  saveFile: (payload: { fileName: string; base64: string; subfolder?: string }) => Promise<{ ok: boolean; filePath?: string; error?: string }>;
  getFolderPath: (subfolder?: string) => Promise<string>;
  createFolder: (folderPath: string) => Promise<{ ok: boolean; error?: string }>;
  listFiles: (folderPath: string) => Promise<{ name: string; path: string; size: number; isFile: boolean }[]>;
}

function getFS(): FileSystemBridge | null {
  if (orun && (orun as any).fileSystem) {
    return (orun as any).fileSystem as FileSystemBridge;
  }
  return null;
}

export const FileSystemService = {
  async saveToDisk(fileData: string, fileName: string, subfolder?: string): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    const fs = getFS();
    if (!fs) {
      return { ok: false, error: "File system bridge not available" };
    }
    return fs.saveFile({ fileName, base64: fileData, subfolder });
  },

  async getEvidenceFolder(): Promise<string> {
    const fs = getFS();
    if (!fs) return "";
    return fs.getFolderPath("evidence");
  },

  async createFolder(folderPath: string): Promise<{ ok: boolean; error?: string }> {
    const fs = getFS();
    if (!fs) {
      return { ok: false, error: "File system bridge not available" };
    }
    return fs.createFolder(folderPath);
  },

  async listFiles(folderPath: string): Promise<{ name: string; path: string; size: number; isFile: boolean }[]> {
    const fs = getFS();
    if (!fs) return [];
    return fs.listFiles(folderPath);
  },
};
