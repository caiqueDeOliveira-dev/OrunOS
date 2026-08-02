import { describe, it, expect, beforeEach } from "vitest";
import { InventoryService } from "../app/services/inventoryService";
import type { RepairItem, Part, Tool } from "../app/services/inventoryService";

const mockRepair: Omit<RepairItem, "id"> = {
  productName: "Notebook Dell",
  problem: "Não liga",
  clientName: "João",
  clientPhone: "11999999999",
  entryDate: "2024-01-15",
  estimatedPrice: 350,
  status: "aguardando",
  partsUsed: [],
  notes: "Fonte queimada",
};

const mockPart: Omit<Part, "id"> = {
  name: "Resistor 10k",
  barcode: "",
  category: "resistores",
  quantity: 100,
  minQuantity: 20,
  unit: "un",
  location: "Gaveta 3",
  notes: "",
};

const mockPartLowStock: Omit<Part, "id"> = {
  name: "CI LM324",
  barcode: "",
  category: "cis",
  quantity: 2,
  minQuantity: 10,
  unit: "un",
  location: "Gaveta 7",
  notes: "",
};

const mockTool: Omit<Tool, "id"> = {
  name: "Multímetro Digital",
  category: "instrumentos_medicao",
  quantity: 1,
  status: "disponivel",
  location: "Bancada 1",
  notes: "",
};

describe("InventoryService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Repairs", () => {
    it("getRepairs returns empty array initially", () => {
      expect(InventoryService.getRepairs()).toEqual([]);
    });

    it("addRepair adds an item and it appears in getRepairs", () => {
      const added = InventoryService.addRepair(mockRepair);
      expect(added.id).toBeTruthy();
      expect(added.productName).toBe("Notebook Dell");

      const all = InventoryService.getRepairs();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(added.id);
    });

    it("updateRepair updates fields correctly", () => {
      const added = InventoryService.addRepair(mockRepair);
      const updated = InventoryService.updateRepair(added.id, {
        status: "concluido",
        estimatedPrice: 400,
      });
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("concluido");
      expect(updated!.estimatedPrice).toBe(400);
    });

    it("updateRepair returns null for non-existent id", () => {
      const result = InventoryService.updateRepair("non-existent", { status: "concluido" });
      expect(result).toBeNull();
    });

    it("deleteRepair removes the item", () => {
      const added = InventoryService.addRepair(mockRepair);
      expect(InventoryService.getRepairs()).toHaveLength(1);

      InventoryService.deleteRepair(added.id);
      expect(InventoryService.getRepairs()).toEqual([]);
    });
  });

  describe("Parts", () => {
    it("getParts returns empty array initially", () => {
      expect(InventoryService.getParts()).toEqual([]);
    });

    it("addPart works", () => {
      const added = InventoryService.addPart(mockPart);
      expect(added.id).toBeTruthy();
      expect(added.name).toBe("Resistor 10k");

      const all = InventoryService.getParts();
      expect(all).toHaveLength(1);
    });

    it("getLowStockParts returns parts where quantity < minQuantity", () => {
      InventoryService.addPart(mockPart);
      InventoryService.addPart(mockPartLowStock);

      const lowStock = InventoryService.getLowStockParts();
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].name).toBe("CI LM324");
    });

    it("getLowStockParts returns empty when no low stock", () => {
      InventoryService.addPart(mockPart);
      expect(InventoryService.getLowStockParts()).toEqual([]);
    });
  });

  describe("Tools", () => {
    it("getTools returns empty array initially", () => {
      expect(InventoryService.getTools()).toEqual([]);
    });

    it("addTool works", () => {
      const added = InventoryService.addTool(mockTool);
      expect(added.id).toBeTruthy();

      const all = InventoryService.getTools();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe("Multímetro Digital");
    });
  });

  describe("Stats", () => {
    it("getStats returns correct counts", () => {
      InventoryService.addRepair(mockRepair);
      InventoryService.addRepair({ ...mockRepair, productName: "PC Gamer", status: "entregue" });
      InventoryService.addPart(mockPart);
      InventoryService.addPart(mockPartLowStock);
      InventoryService.addTool(mockTool);
      InventoryService.addTool({ ...mockTool, name: "Alicate", status: "faltando" });

      const stats = InventoryService.getStats();
      expect(stats.totalRepairs).toBe(2);
      expect(stats.ongoing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.partsCount).toBe(2);
      expect(stats.lowStock).toBe(1);
      expect(stats.toolsCount).toBe(2);
      expect(stats.toolsMissing).toBe(1);
    });
  });

  describe("Export / Import", () => {
    it("exportData returns valid JSON string", () => {
      InventoryService.addRepair(mockRepair);
      const json = InventoryService.exportData();
      const parsed = JSON.parse(json);
      expect(parsed.repairs).toHaveLength(1);
      expect(parsed.version).toBe("2.0.0");
      expect(parsed.exportedAt).toBeTruthy();
    });

    it("importData restores data", () => {
      InventoryService.addRepair(mockRepair);
      InventoryService.addPart(mockPart);
      const json = InventoryService.exportData();

      localStorage.clear();
      expect(InventoryService.getRepairs()).toEqual([]);

      const result = InventoryService.importData(json);
      expect(result).toBe(true);
      expect(InventoryService.getRepairs()).toHaveLength(1);
      expect(InventoryService.getParts()).toHaveLength(1);
    });

    it("importData returns false for invalid JSON", () => {
      const result = InventoryService.importData("invalid json");
      expect(result).toBe(false);
    });

    it("importData returns false for missing required fields", () => {
      const result = InventoryService.importData(JSON.stringify({ foo: "bar" }));
      expect(result).toBe(false);
    });
  });
});
