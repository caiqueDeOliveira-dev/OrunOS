const STORAGE_KEY = "orun-evidence";

export interface EvidenceEntry {
  id: string;
  type: "foto" | "video" | "audio" | "documento";
  fileName: string;
  originalName: string;
  filePath: string;
  dateReceived: string;
  caseRef?: string;
  description?: string;
  tags: string[];
  size: number;
}

interface EvidenceStats {
  total: number;
  fotos: number;
  videos: number;
  documentos: number;
  totalSize: number;
}

function loadAllRaw(): EvidenceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(data: EvidenceEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const EvidenceService = {
  loadAll(): EvidenceEntry[] {
    return loadAllRaw();
  },

  addEntry(entry: Omit<EvidenceEntry, "id">): EvidenceEntry {
    const data = loadAllRaw();
    const newEntry: EvidenceEntry = { ...entry, id: generateId() };
    data.unshift(newEntry);
    saveAll(data);
    return newEntry;
  },

  removeEntry(id: string): void {
    const data = loadAllRaw();
    const filtered = data.filter((e) => e.id !== id);
    saveAll(filtered);
  },

  getByDateRange(start: string, end: string): EvidenceEntry[] {
    return loadAllRaw().filter((e) => {
      return e.dateReceived >= start && e.dateReceived <= end;
    });
  },

  getByCase(caseRef: string): EvidenceEntry[] {
    return loadAllRaw().filter((e) => e.caseRef === caseRef);
  },

  updateEntry(id: string, updates: Partial<EvidenceEntry>): EvidenceEntry | null {
    const data = loadAllRaw();
    const idx = data.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates };
    saveAll(data);
    return data[idx];
  },

  exportCatalog(): string {
    return JSON.stringify(loadAllRaw(), null, 2);
  },

  getStats(): EvidenceStats {
    const data = loadAllRaw();
    const stats: EvidenceStats = {
      total: data.length,
      fotos: 0,
      videos: 0,
      documentos: 0,
      totalSize: 0,
    };
    for (const e of data) {
      if (e.type === "foto") stats.fotos++;
      else if (e.type === "video") stats.videos++;
      else if (e.type === "documento" || e.type === "audio") stats.documentos++;
      stats.totalSize += e.size;
    }
    return stats;
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
