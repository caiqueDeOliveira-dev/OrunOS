import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "automotive-garage";

let registered = false;

interface AutomotiveVehicle {
  id: string; name: string; year: number; model: string;
  plate: string; color: string; mileage: number; created_at: number;
}
interface AutomotiveServiceRecord {
  id: string; vehicleId: string; type: string; description: string;
  cost: number; mileage: number; shop: string; date: number;
}
interface AutomotiveExpense {
  id: string; vehicleId: string; category: string; description: string;
  amount: number; date: number;
}
interface AutomotiveState {
  vehicles: AutomotiveVehicle[];
  serviceRecords: AutomotiveServiceRecord[];
  expenses: AutomotiveExpense[];
}
interface AutomotiveStore {
  getState: () => AutomotiveState;
  addVehicle: (v: AutomotiveVehicle) => void;
  addServiceRecord: (r: AutomotiveServiceRecord) => void;
  addExpense: (e: AutomotiveExpense) => void;
}

let getStore: (() => AutomotiveStore) | null = null;

export function setAutomotiveStoreGetter(fn: () => AutomotiveStore) {
  getStore = fn;
}

const actions = {
  async add_vehicle(params: Record<string, unknown>) {
    const { name, year, model, plate, color, mileage } = params as { name: string; year: number; model: string; plate?: string; color?: string; mileage?: number };
    const store = getStore?.();
    if (!store) return { success: false, error: "Workspace not ready" };
    store.addVehicle({
      id: `veh_${Date.now()}`,
      name,
      year,
      model,
      plate: plate || "",
      color: color || "",
      mileage: mileage || 0,
      created_at: Date.now(),
    });
    return { success: true, message: `Veiculo ${name} adicionado` };
  },

  async add_service_record(params: Record<string, unknown>) {
    const { vehicleId, type, description, cost, mileage, shop } = params as { vehicleId: string; type: string; description: string; cost?: number; mileage?: number; shop?: string };
    const store = getStore?.();
    if (!store) return { success: false, error: "Workspace not ready" };
    store.addServiceRecord({
      id: `svc_${Date.now()}`,
      vehicleId,
      type,
      description,
      cost: cost || 0,
      mileage: mileage || 0,
      shop: shop || "",
      date: Date.now(),
    });
    return { success: true, message: `Registro de servico adicionado` };
  },

  async add_expense(params: Record<string, unknown>) {
    const { vehicleId, category, description, amount } = params as { vehicleId: string; category: string; description: string; amount: number };
    const store = getStore?.();
    if (!store) return { success: false, error: "Workspace not ready" };
    store.addExpense({
      id: `exp_${Date.now()}`,
      vehicleId,
      category,
      description,
      amount,
      date: Date.now(),
    });
    return { success: true, message: `Gasto de R$ ${amount} registrado` };
  },

  async get_fleet_summary() {
    const store = getStore?.();
    if (!store) return { success: false, error: "Workspace not ready" };
    const state = store.getState();
    return {
      success: true,
      data: {
        totalVehicles: state.vehicles.length,
        totalServiceRecords: state.serviceRecords.length,
        totalExpenses: state.expenses.reduce((sum: number, e: AutomotiveExpense) => sum + e.amount, 0),
        vehicles: state.vehicles.map((v: AutomotiveVehicle) => ({
          name: v.name,
          year: v.year,
          model: v.model,
          plate: v.plate,
          mileage: v.mileage,
        })),
      },
    };
  },

  async get_service_history(params: Record<string, unknown>) {
    const { vehicleId } = params as { vehicleId?: string };
    const store = getStore?.();
    if (!store) return { success: false, error: "Workspace not ready" };
    const state = store.getState();
    const records = vehicleId
      ? state.serviceRecords.filter((r: AutomotiveServiceRecord) => r.vehicleId === vehicleId)
      : state.serviceRecords;
    return { success: true, data: records };
  },

  async get_expenses(params: Record<string, unknown>) {
    const { vehicleId, category } = params as { vehicleId?: string; category?: string };
    const store = getStore?.();
    if (!store) return { success: false, error: "Workspace not ready" };
    const state = store.getState();
    let expenses = state.expenses;
    if (vehicleId) expenses = expenses.filter((e: AutomotiveExpense) => e.vehicleId === vehicleId);
    if (category) expenses = expenses.filter((e: AutomotiveExpense) => e.category === category);
    return { success: true, data: expenses };
  },
};

export function registerAutomotiveActions() {
  if (registered) return;
  registerWorkspaceActions(WORKSPACE_ID, actions);
  registered = true;
}

export function unregisterAutomotiveActions() {
  if (!registered) return;
  unregisterWorkspaceActions(WORKSPACE_ID);
  registered = false;
}
