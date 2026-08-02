const STORAGE_KEY = "orun-inventory";

export interface RepairItem {
  id: string;
  productName: string;
  problem: string;
  clientName?: string;
  clientPhone?: string;
  entryDate: string;
  estimatedPrice?: number;
  status: "aguardando" | "diagnosticando" | "em_conserto" | "aguardando_peca" | "concluido" | "entregue";
  partsUsed: string[];
  notes: string;
}

export interface Part {
  id: string;
  name: string;
  barcode: string;
  category: "resistores" | "capacitores" | "transistores" | "diodos" | "cis" | "conectores" | "cabos" | "fontes" | "motores" | "outros";
  quantity: number;
  minQuantity: number;
  unit: string;
  location: string;
  supplier?: string;
  price?: number;
  notes: string;
}

export interface Tool {
  id: string;
  name: string;
  category: "ferramentas_manuais" | "ferramentas_eletricas" | "instrumentos_medicao" | "equipamentos" | "consumiveis";
  quantity: number;
  status: "disponivel" | "em_uso" | "em_manutencao" | "quebrado" | "faltando";
  location: string;
  notes: string;
}

interface InventoryStats {
  totalRepairs: number;
  ongoing: number;
  completed: number;
  partsCount: number;
  lowStock: number;
  toolsCount: number;
  toolsMissing: number;
}

function loadAllRaw<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const InventoryService = {
  getRepairs(): RepairItem[] {
    return loadAllRaw<RepairItem>(STORAGE_KEY + "-repairs");
  },

  addRepair(item: Omit<RepairItem, "id">): RepairItem {
    const data = loadAllRaw<RepairItem>(STORAGE_KEY + "-repairs");
    const newItem: RepairItem = { ...item, id: generateId() };
    data.unshift(newItem);
    saveAll(STORAGE_KEY + "-repairs", data);
    return newItem;
  },

  updateRepair(id: string, updates: Partial<RepairItem>): RepairItem | null {
    const data = loadAllRaw<RepairItem>(STORAGE_KEY + "-repairs");
    const idx = data.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates };
    saveAll(STORAGE_KEY + "-repairs", data);
    return data[idx];
  },

  deleteRepair(id: string): void {
    const data = loadAllRaw<RepairItem>(STORAGE_KEY + "-repairs");
    saveAll(STORAGE_KEY + "-repairs", data.filter((r) => r.id !== id));
  },

  getParts(): Part[] {
    return loadAllRaw<Part>(STORAGE_KEY + "-parts");
  },

  addPart(item: Omit<Part, "id">): Part {
    const data = loadAllRaw<Part>(STORAGE_KEY + "-parts");
    const newItem: Part = { ...item, id: generateId() };
    data.unshift(newItem);
    saveAll(STORAGE_KEY + "-parts", data);
    return newItem;
  },

  updatePart(id: string, updates: Partial<Part>): Part | null {
    const data = loadAllRaw<Part>(STORAGE_KEY + "-parts");
    const idx = data.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates };
    saveAll(STORAGE_KEY + "-parts", data);
    return data[idx];
  },

  deletePart(id: string): void {
    const data = loadAllRaw<Part>(STORAGE_KEY + "-parts");
    saveAll(STORAGE_KEY + "-parts", data.filter((p) => p.id !== id));
  },

  getLowStockParts(): Part[] {
    return loadAllRaw<Part>(STORAGE_KEY + "-parts").filter((p) => p.quantity < p.minQuantity);
  },

  getTools(): Tool[] {
    return loadAllRaw<Tool>(STORAGE_KEY + "-tools");
  },

  addTool(item: Omit<Tool, "id">): Tool {
    const data = loadAllRaw<Tool>(STORAGE_KEY + "-tools");
    const newItem: Tool = { ...item, id: generateId() };
    data.unshift(newItem);
    saveAll(STORAGE_KEY + "-tools", data);
    return newItem;
  },

  updateTool(id: string, updates: Partial<Tool>): Tool | null {
    const data = loadAllRaw<Tool>(STORAGE_KEY + "-tools");
    const idx = data.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates };
    saveAll(STORAGE_KEY + "-tools", data);
    return data[idx];
  },

  deleteTool(id: string): void {
    const data = loadAllRaw<Tool>(STORAGE_KEY + "-tools");
    saveAll(STORAGE_KEY + "-tools", data.filter((t) => t.id !== id));
  },

  getStats(): InventoryStats {
    const repairs = loadAllRaw<RepairItem>(STORAGE_KEY + "-repairs");
    const parts = loadAllRaw<Part>(STORAGE_KEY + "-parts");
    const tools = loadAllRaw<Tool>(STORAGE_KEY + "-tools");
    const todayStr = today();
    return {
      totalRepairs: repairs.length,
      ongoing: repairs.filter((r) => r.status !== "concluido" && r.status !== "entregue").length,
      completed: repairs.filter((r) => r.status === "concluido" || r.status === "entregue").length,
      partsCount: parts.length,
      lowStock: parts.filter((p) => p.quantity < p.minQuantity).length,
      toolsCount: tools.length,
      toolsMissing: tools.filter((t) => t.status === "faltando" || t.status === "quebrado" || t.status === "em_manutencao").length,
    };
  },

  exportData(): string {
    const payload = {
      repairs: loadAllRaw<RepairItem>(STORAGE_KEY + "-repairs"),
      parts: loadAllRaw<Part>(STORAGE_KEY + "-parts"),
      tools: loadAllRaw<Tool>(STORAGE_KEY + "-tools"),
      exportedAt: new Date().toISOString(),
      version: "2.0.0",
    };
    return JSON.stringify(payload, null, 2);
  },

  importData(json: string): boolean {
    try {
      const payload = JSON.parse(json);
      if (!payload.repairs || !payload.parts || !payload.tools) return false;
      saveAll(STORAGE_KEY + "-repairs", payload.repairs);
      saveAll(STORAGE_KEY + "-parts", payload.parts);
      saveAll(STORAGE_KEY + "-tools", payload.tools);
      return true;
    } catch {
      return false;
    }
  },
};
