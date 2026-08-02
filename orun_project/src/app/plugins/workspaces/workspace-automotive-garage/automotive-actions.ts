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

const DETRAN_LINKS: Record<string, { uf: string; name: string; url: string }> = {
  AC: { uf: "AC", name: "Detran AC", url: "https://www.detran.ac.gov.br" },
  AL: { uf: "AL", name: "Detran AL", url: "https://www.detran.al.gov.br" },
  AM: { uf: "AM", name: "Detran AM", url: "https://www.detran.am.gov.br" },
  AP: { uf: "AP", name: "Detran AP", url: "https://www.detran.ap.gov.br" },
  BA: { uf: "BA", name: "Detran BA", url: "https://www.detran.ba.gov.br" },
  CE: { uf: "CE", name: "Detran CE", url: "https://www.detran.ce.gov.br" },
  DF: { uf: "DF", name: "Detran DF", url: "https://www.detran.df.gov.br" },
  ES: { uf: "ES", name: "Detran ES", url: "https://www.detran.es.gov.br" },
  GO: { uf: "GO", name: "Detran GO", url: "https://www.detran.go.gov.br" },
  MA: { uf: "MA", name: "Detran MA", url: "https://www.detran.ma.gov.br" },
  MG: { uf: "MG", name: "Detran MG", url: "https://www.detran.mg.gov.br" },
  MS: { uf: "MS", name: "Detran MS", url: "https://www.detran.ms.gov.br" },
  MT: { uf: "MT", name: "Detran MT", url: "https://www.detran.mt.gov.br" },
  PA: { uf: "PA", name: "Detran PA", url: "https://www.detran.pa.gov.br" },
  PB: { uf: "PB", name: "Detran PB", url: "https://www.detran.pb.gov.br" },
  PE: { uf: "PE", name: "Detran PE", url: "https://www.detran.pe.gov.br" },
  PI: { uf: "PI", name: "Detran PI", url: "https://www.detran.pi.gov.br" },
  PR: { uf: "PR", name: "Detran PR", url: "https://www.detran.pr.gov.br" },
  RJ: { uf: "RJ", name: "Detran RJ", url: "https://www.detran.rj.gov.br" },
  RN: { uf: "RN", name: "Detran RN", url: "https://www.detran.rn.gov.br" },
  RO: { uf: "RO", name: "Detran RO", url: "https://www.detran.ro.gov.br" },
  RR: { uf: "RR", name: "Detran RR", url: "https://www.detran.rr.gov.br" },
  RS: { uf: "RS", name: "Detran RS", url: "https://www.detran.rs.gov.br" },
  SC: { uf: "SC", name: "Detran SC", url: "https://www.detran.sc.gov.br" },
  SE: { uf: "SE", name: "Detran SE", url: "https://www.detran.se.gov.br" },
  SP: { uf: "SP", name: "Detran SP", url: "https://www.detran.sp.gov.br" },
  TO: { uf: "TO", name: "Detran TO", url: "https://www.detran.to.gov.br" },
};

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

  async check_debits(params: Record<string, unknown>) {
    const { plate, uf, renavam } = params as { plate?: string; uf?: string; renavam?: string };
    const detran = uf ? DETRAN_LINKS[uf.toUpperCase()] : null;
    return {
      success: true,
      data: {
        plate: plate || "",
        uf: uf || "",
        renavam: renavam || "",
        detran: detran || null,
        links: [
          { label: "Consultar IPVA", url: detran ? `${detran.url}/veiculos` : "https://www.ipva.fazenda.sp.gov.br" },
          { label: "Consultar Multas", url: detran ? `${detran.url}/infracoes` : "https://www.detran.sp.gov.br" },
          { label: "Licenciamento", url: detran ? `${detran.url}/licenciamento` : "https://www.detran.sp.gov.br" },
          { label: "Consulta Nacional", url: "https://portalservicos.denatran.serpro.gov.br" },
          { label: "Gringo App", url: "https://www.gringo.com.br" },
        ],
        apps: [
          { name: "Gringo", url: "https://www.gringo.com.br", description: "App completo para consulta de débitos, IPVA e multas" },
          { name: "Carteira Digital de Trânsito", url: "https://portalservicos.denatran.serpro.gov.br", description: "App oficial do DENATRAN" },
        ],
      },
    };
  },

  async search_parts(params: Record<string, unknown>) {
    const { query, vehicle, category } = params as { query?: string; vehicle?: string; category?: string };
    const searchTerm = [query, vehicle, category].filter(Boolean).join(" ");
    if (!searchTerm) return { success: false, error: "Informe o que deseja buscar" };
    return {
      success: true,
      data: {
        searchTerm,
        links: [
          { label: "Buscar no Mercado Livre", url: `https://lista.mercadolivre.com.br/${encodeURIComponent(searchTerm)}` },
          { label: "Buscar na Shopee", url: `https://shopee.com.br/search?keyword=${encodeURIComponent(searchTerm)}` },
          { label: "Buscar na OLX", url: `https://www.olx.com.br/autos-e-pecas/pecas-e-acessorios?q=${encodeURIComponent(searchTerm)}` },
          { label: "Buscar no Google Shopping", url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&tbm=shop` },
          { label: "Buscar na Web", url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}` },
        ],
      },
    };
  },

  async get_detran_links(params: Record<string, unknown>) {
    const { uf } = params as { uf?: string };
    if (uf) {
      const detran = DETRAN_LINKS[uf.toUpperCase()];
      return { success: true, data: detran || null };
    }
    return { success: true, data: Object.values(DETRAN_LINKS) };
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
