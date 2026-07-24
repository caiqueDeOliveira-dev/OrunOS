import { useState, useEffect } from "react";
import { createStore } from "../../lib/store";
import { Car, Wrench, DollarSign, FileText, Plus, Trash2, Gauge, Shield, X, ChevronDown } from "lucide-react";
import { registerAutomotiveActions, unregisterAutomotiveActions, setAutomotiveStoreGetter } from "./automotive-actions";
import type { WorkspaceProps } from "../../types";
import { useTranslation } from "../../../../i18n/I18nProvider";

interface Vehicle {
  id: string;
  name: string;
  year: number;
  model: string;
  plate: string;
  color: string;
  mileage: number;
  created_at: number;
}

interface ServiceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  cost: number;
  mileage: number;
  shop: string;
  date: number;
}

interface Expense {
  id: string;
  vehicleId: string;
  category: string;
  description: string;
  amount: number;
  date: number;
}

interface AutomotiveState {
  [key: string]: unknown;
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  expenses: Expense[];
}

const store = createStore<AutomotiveState>({
  vehicles: [],
  serviceRecords: [],
  expenses: [],
});

function getServiceTypes(t: (key: string) => string): string[] {
  return [
    t("automotive_service_type_oil_change"),
    t("automotive_service_type_general_revision"),
    t("automotive_service_type_brakes"),
    t("automotive_service_type_suspension"),
    t("automotive_service_type_engine"),
    t("automotive_service_type_transmission"),
    t("automotive_service_type_electrical"),
    t("automotive_service_type_air_conditioning"),
    t("automotive_service_type_tires"),
    t("automotive_service_type_alignment"),
    t("automotive_service_type_balancing"),
    t("automotive_service_type_other"),
  ];
}

function getExpenseCategories(t: (key: string) => string): string[] {
  return [
    t("automotive_expense_category_fuel"),
    t("automotive_expense_category_parking"),
    t("automotive_expense_category_toll"),
    t("automotive_expense_category_fine"),
    t("automotive_expense_category_insurance"),
    t("automotive_expense_category_ipva"),
    t("automotive_expense_category_registration"),
    t("automotive_expense_category_wash"),
    t("automotive_expense_category_accessories"),
    t("automotive_expense_category_other"),
  ];
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-[420px] max-h-[80vh] rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-[13px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[60vh]">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-[12px] outline-none transition-colors"
      style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-[12px] outline-none appearance-none"
        style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
    </div>
  );
}

export function AutomotiveGarage({ onSendMessage }: WorkspaceProps) {
  const { t } = useTranslation();
  const state = store();
  const [view, setView] = useState<"overview" | "vehicles" | "services" | "expenses">("overview");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const SERVICE_TYPES = getServiceTypes(t);
  const EXPENSE_CATEGORIES = getExpenseCategories(t);

  // Form states
  const [vName, setVName] = useState("");
  const [vYear, setVYear] = useState("");
  const [vModel, setVModel] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vColor, setVColor] = useState("");
  const [vMileage, setVMileage] = useState("");

  const [sType, setSType] = useState(SERVICE_TYPES[0]);
  const [sDesc, setSDesc] = useState("");
  const [sCost, setSCost] = useState("");
  const [sMileage, setSMileage] = useState("");
  const [sShop, setSShop] = useState("");
  const [sVehicle, setSVehicle] = useState("");

  const [eCategory, setECategory] = useState(EXPENSE_CATEGORIES[0]);
  const [eDesc, setEDesc] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eVehicle, setEVehicle] = useState("");

  useEffect(() => {
    registerAutomotiveActions();
    setAutomotiveStoreGetter(() => ({
      getState: () => store.getState(),
      addVehicle: (v: Vehicle) => store.setState(s => ({ vehicles: [...s.vehicles, v] })),
      addServiceRecord: (r: ServiceRecord) => store.setState(s => ({ serviceRecords: [...s.serviceRecords, r] })),
      addExpense: (e: Expense) => store.setState(s => ({ expenses: [...s.expenses, e] })),
    }));
    return () => unregisterAutomotiveActions();
  }, []);

  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalServiceCost = state.serviceRecords.reduce((sum, r) => sum + r.cost, 0);

  function resetVehicleForm() { setVName(""); setVYear(""); setVModel(""); setVPlate(""); setVColor(""); setVMileage(""); }
  function resetServiceForm() { setSType(SERVICE_TYPES[0]); setSDesc(""); setSCost(""); setSMileage(""); setSShop(""); setSVehicle(state.vehicles[0]?.id || ""); }
  function resetExpenseForm() { setECategory(EXPENSE_CATEGORIES[0]); setEDesc(""); setEAmount(""); setEVehicle(state.vehicles[0]?.id || ""); }

  function addVehicle() {
    if (!vName.trim() || !vYear.trim() || !vModel.trim()) return;
    store.setState(s => ({
      vehicles: [...s.vehicles, {
        id: `veh_${Date.now()}`,
        name: vName.trim(),
        year: parseInt(vYear) || 0,
        model: vModel.trim(),
        plate: vPlate.trim(),
        color: vColor.trim(),
        mileage: parseInt(vMileage) || 0,
        created_at: Date.now(),
      }],
    }));
    resetVehicleForm();
    setShowAddVehicle(false);
  }

  function addService() {
    if (!sDesc.trim() || !sVehicle) return;
    store.setState(s => ({
      serviceRecords: [...s.serviceRecords, {
        id: `svc_${Date.now()}`,
        vehicleId: sVehicle,
        type: sType,
        description: sDesc.trim(),
        cost: parseFloat(sCost) || 0,
        mileage: parseInt(sMileage) || 0,
        shop: sShop.trim(),
        date: Date.now(),
      }],
    }));
    resetServiceForm();
    setShowAddService(false);
  }

  function addExpense() {
    if (!eDesc.trim() || !eAmount.trim() || !eVehicle) return;
    store.setState(s => ({
      expenses: [...s.expenses, {
        id: `exp_${Date.now()}`,
        vehicleId: eVehicle,
        category: eCategory,
        description: eDesc.trim(),
        amount: parseFloat(eAmount) || 0,
        date: Date.now(),
      }],
    }));
    resetExpenseForm();
    setShowAddExpense(false);
  }

  function getVehicleName(id: string) {
    const v = state.vehicles.find(v => v.id === id);
    return v ? `${v.year} ${v.model}` : t("automotive_unknown_vehicle");
  }

  const filteredServices = selectedVehicle ? state.serviceRecords.filter(r => r.vehicleId === selectedVehicle) : state.serviceRecords;
  const filteredExpenses = selectedVehicle ? state.expenses.filter(e => e.vehicleId === selectedVehicle) : state.expenses;

  const navItems = [
    { id: "overview" as const, label: t("automotive_nav_overview"), icon: Gauge },
    { id: "vehicles" as const, label: t("automotive_nav_vehicles"), icon: Car },
    { id: "services" as const, label: t("automotive_nav_services"), icon: Wrench },
    { id: "expenses" as const, label: t("automotive_nav_expenses"), icon: DollarSign },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)" }}>
            <Car size={18} color="#FFF" />
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("automotive_header_title")}</h1>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("automotive_header_subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r flex flex-col py-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors mx-2 rounded-lg"
                style={{ background: isActive ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
              >
                <Icon size={15} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          })}
          {state.vehicles.length > 0 && (
            <div className="mt-4 px-4">
              <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>{t("automotive_filter_label")}</p>
              <button onClick={() => setSelectedVehicle(null)} className="w-full text-left px-2 py-1 rounded text-[10px] mb-1"
                style={{ color: !selectedVehicle ? "var(--primary)" : "var(--muted-foreground)" }}>{t("automotive_filter_all")}</button>
              {state.vehicles.map(v => (
                <button key={v.id} onClick={() => setSelectedVehicle(v.id)} className="w-full text-left px-2 py-1 rounded text-[10px] mb-1 truncate"
                  style={{ color: selectedVehicle === v.id ? "var(--primary)" : "var(--muted-foreground)" }}>{v.year} {v.model}</button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {view === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: t("automotive_overview_stat_vehicles"), value: String(state.vehicles.length), icon: Car, color: "#3B82F6" },
                  { label: t("automotive_overview_stat_services"), value: String(state.serviceRecords.length), icon: Wrench, color: "#F59E0B" },
                  { label: t("automotive_overview_stat_total_expenses"), value: `R$ ${totalExpenses.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#10B981" },
                  { label: t("automotive_overview_stat_total_services"), value: `R$ ${totalServiceCost.toLocaleString("pt-BR")}`, icon: Shield, color: "#8B5CF6" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="rounded-xl p-4 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                          <Icon size={14} color={stat.color} />
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{stat.label}</span>
                      </div>
                      <p className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { resetVehicleForm(); setShowAddVehicle(true); }}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02]"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#3B82F615" }}><Car size={16} color="#3B82F6" /></div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--foreground)" }}>{t("automotive_overview_new_vehicle_title")}</p>
                    <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("automotive_overview_new_vehicle_desc")}</p>
                  </div>
                </button>
                <button onClick={() => { resetServiceForm(); setShowAddService(true); }}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02]"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F59E0B15" }}><Wrench size={16} color="#F59E0B" /></div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--foreground)" }}>{t("automotive_overview_new_service_title")}</p>
                    <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("automotive_overview_new_service_desc")}</p>
                  </div>
                </button>
                <button onClick={() => { resetExpenseForm(); setShowAddExpense(true); }}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02]"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#10B98115" }}><DollarSign size={16} color="#10B981" /></div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--foreground)" }}>{t("automotive_overview_new_expense_title")}</p>
                    <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("automotive_overview_new_expense_desc")}</p>
                  </div>
                </button>
              </div>

              {/* Recent */}
              <div>
                <h3 className="text-xs font-semibold mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("automotive_overview_recent_activity")}</h3>
                {[...state.serviceRecords, ...state.expenses].length === 0 ? (
                  <div className="text-center py-8 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                    <Car size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} className="mx-auto mb-2" />
                    <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("automotive_overview_no_activity")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...state.serviceRecords.map(r => ({ ...r, _kind: "service" as const })), ...state.expenses.map(e => ({ ...e, _kind: "expense" as const }))]
                      .sort((a, b) => b.date - a.date)
                      .slice(0, 5)
                      .map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                          {item._kind === "service" ? <Wrench size={14} style={{ color: "#F59E0B" }} /> : <DollarSign size={14} style={{ color: "#10B981" }} />}
                          <div className="flex-1">
                            <p className="text-[11px]" style={{ color: "var(--foreground)" }}>{item.description}</p>
                            <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                              {"cost" in item ? `R$ ${item.cost}` : `R$ ${item.amount}`} · {new Date(item.date).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VEHICLES */}
          {view === "vehicles" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("automotive_vehicles_title")}</h3>
                <button onClick={() => { resetVehicleForm(); setShowAddVehicle(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}><Plus size={11} /> {t("automotive_vehicles_add_button")}</button>
              </div>
              {state.vehicles.length === 0 ? (
                <div className="text-center py-12 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <Car size={40} style={{ color: "var(--muted-foreground)", opacity: 0.2 }} className="mx-auto mb-3" />
                  <p className="text-[12px] font-medium mb-1" style={{ color: "var(--foreground)" }}>{t("automotive_vehicles_empty_title")}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("automotive_vehicles_empty_desc")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {state.vehicles.map(v => (
                    <div key={v.id} className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)" }}>
                            <Car size={18} color="#FFF" />
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>{v.name}</p>
                            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{v.year} · {v.model}</p>
                          </div>
                        </div>
                        <button onClick={() => store.setState(s => ({ vehicles: s.vehicles.filter(veh => veh.id !== v.id) }))}
                          className="p-1 rounded" style={{ color: "var(--muted-foreground)" }}><Trash2 size={12} /></button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        <span className="flex items-center gap-1"><Gauge size={10} /> {v.mileage.toLocaleString("pt-BR")} km</span>
                        {v.plate && <span className="flex items-center gap-1"><FileText size={10} /> {v.plate}</span>}
                        {v.color && <span>{v.color}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SERVICES */}
          {view === "services" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("automotive_services_title")}</h3>
                <button onClick={() => { resetServiceForm(); setShowAddService(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}><Plus size={11} /> {t("automotive_services_add_button")}</button>
              </div>
              {filteredServices.length === 0 ? (
                <div className="text-center py-12 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <Wrench size={40} style={{ color: "var(--muted-foreground)", opacity: 0.2 }} className="mx-auto mb-3" />
                  <p className="text-[12px] font-medium" style={{ color: "var(--foreground)" }}>{t("automotive_services_empty")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F59E0B20" }}><Wrench size={14} color="#F59E0B" /></div>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{r.description}</p>
                        <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                          {getVehicleName(r.vehicleId)} · {r.type} · {r.shop || t("automotive_services_no_shop")} · {new Date(r.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>R$ {r.cost.toLocaleString("pt-BR")}</p>
                        <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{r.mileage.toLocaleString("pt-BR")} km</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EXPENSES */}
          {view === "expenses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("automotive_expenses_title")}</h3>
                <button onClick={() => { resetExpenseForm(); setShowAddExpense(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}><Plus size={11} /> {t("automotive_expenses_add_button")}</button>
              </div>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <DollarSign size={40} style={{ color: "var(--muted-foreground)", opacity: 0.2 }} className="mx-auto mb-3" />
                  <p className="text-[12px] font-medium" style={{ color: "var(--foreground)" }}>{t("automotive_expenses_empty")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#10B98120" }}><DollarSign size={14} color="#10B981" /></div>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{e.description}</p>
                        <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                          {getVehicleName(e.vehicleId)} · {e.category} · {new Date(e.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>R$ {e.amount.toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD VEHICLE MODAL */}
      <Modal open={showAddVehicle} onClose={() => setShowAddVehicle(false)} title={t("automotive_modal_add_vehicle_title")}>
        <Field label={t("automotive_field_name")}>
          <Input value={vName} onChange={setVName} placeholder={t("automotive_field_name_placeholder")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("automotive_field_year")}>
            <Input value={vYear} onChange={setVYear} placeholder="2020" type="number" />
          </Field>
          <Field label={t("automotive_field_model")}>
            <Input value={vModel} onChange={setVModel} placeholder="Corolla" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("automotive_field_plate")}>
            <Input value={vPlate} onChange={setVPlate} placeholder="ABC-1234" />
          </Field>
          <Field label={t("automotive_field_color")}>
            <Input value={vColor} onChange={setVColor} placeholder={t("automotive_field_color_placeholder")} />
          </Field>
        </div>
        <Field label={t("automotive_field_mileage")}>
          <Input value={vMileage} onChange={setVMileage} placeholder="45000" type="number" />
        </Field>
        <button onClick={addVehicle} disabled={!vName.trim() || !vYear.trim() || !vModel.trim()}
          className="w-full mt-3 py-2.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          {t("automotive_modal_add_vehicle_button")}
        </button>
      </Modal>

      {/* ADD SERVICE MODAL */}
      <Modal open={showAddService} onClose={() => setShowAddService(false)} title={t("automotive_modal_add_service_title")}>
        {state.vehicles.length > 0 ? (
          <>
            <Field label={t("automotive_field_vehicle")}>
              <Select value={sVehicle} onChange={setSVehicle} options={state.vehicles.map(v => v.id)} />
            </Field>
            <Field label={t("automotive_field_service_type")}>
              <Select value={sType} onChange={setSType} options={SERVICE_TYPES} />
            </Field>
            <Field label={t("automotive_field_description")}>
              <Input value={sDesc} onChange={setSDesc} placeholder={t("automotive_field_description_placeholder")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("automotive_field_cost")}>
                <Input value={sCost} onChange={setSCost} placeholder="150" type="number" />
              </Field>
              <Field label={t("automotive_field_current_km")}>
                <Input value={sMileage} onChange={setSMileage} placeholder="45000" type="number" />
              </Field>
            </div>
            <Field label={t("automotive_field_shop")}>
              <Input value={sShop} onChange={setSShop} placeholder="Auto Center XYZ" />
            </Field>
            <button onClick={addService} disabled={!sDesc.trim() || !sVehicle}
              className="w-full mt-3 py-2.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              {t("automotive_modal_add_service_button")}
            </button>
          </>
        ) : (
          <p className="text-[12px] text-center py-4" style={{ color: "var(--muted-foreground)" }}>{t("automotive_add_vehicle_first")}</p>
        )}
      </Modal>

      {/* ADD EXPENSE MODAL */}
      <Modal open={showAddExpense} onClose={() => setShowAddExpense(false)} title={t("automotive_modal_add_expense_title")}>
        {state.vehicles.length > 0 ? (
          <>
            <Field label={t("automotive_field_vehicle")}>
              <Select value={eVehicle} onChange={setEVehicle} options={state.vehicles.map(v => v.id)} />
            </Field>
            <Field label={t("automotive_field_category")}>
              <Select value={eCategory} onChange={setECategory} options={EXPENSE_CATEGORIES} />
            </Field>
            <Field label={t("automotive_field_description")}>
              <Input value={eDesc} onChange={setEDesc} placeholder={t("automotive_field_expense_desc_placeholder")} />
            </Field>
            <Field label={t("automotive_field_amount")}>
              <Input value={eAmount} onChange={setEAmount} placeholder="250" type="number" />
            </Field>
            <button onClick={addExpense} disabled={!eDesc.trim() || !eAmount.trim() || !eVehicle}
              className="w-full mt-3 py-2.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              {t("automotive_modal_add_expense_button")}
            </button>
          </>
        ) : (
          <p className="text-[12px] text-center py-4" style={{ color: "var(--muted-foreground)" }}>{t("automotive_add_vehicle_first")}</p>
        )}
      </Modal>
    </div>
  );
}
