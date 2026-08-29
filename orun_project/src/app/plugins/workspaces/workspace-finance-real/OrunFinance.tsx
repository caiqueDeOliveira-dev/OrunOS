// workspace-finance-real / OrunFinance.tsx
// Orun Finance — Gestão financeira premium e completa.
// Backend: Actual Budget (real, via window.orun.finance) + estado local
// (metas, investimentos) persistido em localStorage.
// Provider-agnostic: a UI funciona com qualquer fonte; o Actual Budget é o
// provider atual (Manual + Actual). Pluggy/Belvo → futura integração opcional.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet, RefreshCw, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  LayoutDashboard, ReceiptText, PiggyBank, BarChart3, Calculator, ShoppingBag,
  Bot, Landmark, Target, Sparkles, Plus, Search, CheckCircle2, AlertTriangle,
  CreditCard, type LucideIcon,
} from "lucide-react";
import { P, PremiumRoot, ScrollArea, Card, StatCard, SectionHeader, PrimaryButton, GhostButton, Input, Badge, Toggle } from "../premium";
import type { WorkspaceProps } from "../../types";
import type {
  OrunFinanceAccount,
  OrunFinanceTransaction,
  OrunFinanceBudgetMonth,
  OrunFinanceCategory,
} from "../../../../types/orun";

// ── Tipos locais (metas / investimentos / persistência) ───────────────

interface FinanceGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
  emoji?: string;
}

interface FinanceInvestment {
  id: string;
  name: string;
  kind: "acao" | "fii" | "cdb" | "cripto" | "poupanca" | "outro";
  value: number;
  cost: number;
}

interface FinanceStore {
  goals: FinanceGoal[];
  investments: FinanceInvestment[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "orun.finance.personal.v1";

function loadStore(): FinanceStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { goals: [], investments: [] };
    const parsed = JSON.parse(raw);
    return {
      goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
      investments: Array.isArray(parsed?.investments) ? parsed.investments : [],
    };
  } catch {
    return { goals: [], investments: [] };
  }
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function fmt(centsOrReais: number, inReais = false): string {
  return (inReais ? centsOrReais : centsOrReais / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateLabel(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function aiLabelFor(category: string): string {
  const map: Record<string, string> = {
    food: "Alimentação", transport: "Transporte", housing: "Moradia",
    entertainment: "Lazer", health: "Saúde", education: "Educação",
    salary: "Salário", investment: "Investimento", other: "Outros",
  };
  return map[category] || category;
}

// ── Financial Health ──────────────────────────────────────────────────

function computeHealth(
  balance: number,
  budget: OrunFinanceBudgetMonth | null,
  goals: FinanceGoal[],
  investments: FinanceInvestment[]
): { score: number; label: string; breakdown: { label: string; pct: number; tone: "ok" | "warn" | "err" }[] } {
  let score = 50;
  const breakdown: { label: string; pct: number; tone: "ok" | "warn" | "err" }[] = [];

  // Reserva / saldo positivo
  const pos = balance >= 0 ? 15 : -10;
  score += pos;
  breakdown.push({ label: "Saldo positivo", pct: pos, tone: balance >= 0 ? "ok" : "err" });

  // No orçamento
  if (budget && budget.totalBudgeted > 0) {
    const pct = budget.totalSpent / budget.totalBudgeted;
    const inBudget = pct <= 1;
    const pts = inBudget ? Math.round((1 - pct) * 15) : -Math.round((pct - 1) * 15);
    score += Math.max(-12, Math.min(15, pts));
    breakdown.push({ label: "Dentro do orçamento", pct: inBudget ? pts : -pts, tone: inBudget ? "ok" : "err" });
  } else {
    breakdown.push({ label: "Orçamento definido", pct: 0, tone: "warn" });
  }

  // Metas em andamento
  if (goals.length > 0) {
    const avg = goals.reduce((s, g) => s + (g.target > 0 ? g.current / g.target : 0), 0) / goals.length;
    const pts = Math.round(avg * 10);
    score += pts;
    breakdown.push({ label: "Progresso em metas", pct: pts, tone: avg >= 0.5 ? "ok" : avg >= 0.25 ? "warn" : "err" });
  } else {
    breakdown.push({ label: "Metas criadas", pct: 0, tone: "warn" });
  }

  // Diversificação (investimentos > 0)
  const hasInvest = investments.length > 0;
  score += hasInvest ? 8 : 0;
  breakdown.push({ label: "Investindo", pct: hasInvest ? 8 : 0, tone: hasInvest ? "ok" : "warn" });

  const clamp = Math.max(0, Math.min(100, score));
  const label = clamp >= 80 ? "Excelente" : clamp >= 60 ? "Bom" : clamp >= 40 ? "Mediano" : clamp >= 20 ? "Precisa atenção" : "Crítico";
  return { score: clamp, label, breakdown };
}

// ── Pequenos componentes ──────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, onClick, badge }: {
  icon: LucideIcon; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[11px] font-medium transition-all"
      style={{
        background: active ? "rgba(195,0,47,0.14)" : "transparent",
        color: active ? P.text : P.sub,
        border: active ? "1px solid rgba(195,0,47,0.3)" : "1px solid transparent",
      }}
    >
      <Icon size={15} strokeWidth={1.7} color={active ? P.primary : P.dim} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: P.primary, color: "#fff" }}>{badge}</span>
      )}
    </button>
  );
}

function Ring({ score }: { score: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const color = score >= 80 ? P.success : score >= 50 ? P.alert : P.error;
  return (
    <div className="relative w-[120px] h-[120px] shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={P.card2} strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold tabular-nums" style={{ color: P.text }}>{score}</span>
        <span className="text-[8px] uppercase tracking-widest" style={{ color: P.dim }}>saúde</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "transactions"
  | "budget"
  | "goals"
  | "investments"
  | "simulator"
  | "buy"
  | "assistant";

const KINDS: Record<FinanceInvestment["kind"], string> = {
  acao: "Ações", fii: "FIIs", cdb: "CDB/Renda fixa", cripto: "Cripto", poupanca: "Poupança", outro: "Outro",
};

export function OrunFinance(props: WorkspaceProps) {
  const finance = (window as any).orun?.finance;
  const { onSendMessage } = props;

  const [section, setSection] = useState<Section>("overview");

  // dados do Actual Budget
  const [accounts, setAccounts] = useState<OrunFinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<OrunFinanceTransaction[]>([]);
  const [categories, setCategories] = useState<OrunFinanceCategory[]>([]);
  const [budget, setBudget] = useState<OrunFinanceBudgetMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dados locais
  const [store, setStore] = useState<FinanceStore>(loadStore);
  const persist = useCallback((s: FinanceStore) => {
    setStore(s);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, []);

  // inputs
  const [txSearch, setTxSearch] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [invName, setInvName] = useState("");
  const [invValue, setInvValue] = useState("");
  const [invCost, setInvCost] = useState("");
  const [simAmount, setSimAmount] = useState(5000);
  const [simMonthly, setSimMonthly] = useState(500);
  const [simYield, setSimYield] = useState(12);
  const [simYears, setSimYears] = useState(10);
  const [buyAmount, setBuyAmount] = useState(1000);
  const [assistantText, setAssistantText] = useState("");

  const loadData = useCallback(async () => {
    if (!finance?.listAccounts) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [accRes, txRes, catRes, budgetRes] = await Promise.all([
        finance.listAccounts(),
        finance.listTransactions(undefined, { limit: 200 }),
        finance.listCategories(),
        finance.getBudgetMonth(currentMonth()),
      ]);
      if (!accRes.ok && (accRes.error || "")?.includes("not configured")) {
        setConfigured(false);
        setLoading(false);
        return;
      }
      if (accRes.ok && accRes.data) setAccounts(accRes.data);
      if (txRes.ok && txRes.data) setTransactions(txRes.data);
      if (catRes.ok && catRes.data) setCategories(catRes.data);
      if (budgetRes.ok && budgetRes.data) setBudget(budgetRes.data);
      if (!accRes.ok && !txRes.ok && !budgetRes.ok) setError("Falha ao carregar dados financeiros.");
    } catch (e: any) {
      setError(e?.message || "Erro ao conectar com o livro-razão.");
    } finally {
      setLoading(false);
    }
  }, [finance]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = useCallback(async () => {
    if (!finance?.sync) return;
    setSyncing(true);
    try {
      const res = await finance.sync();
      if (!res.ok) setError(res.error || "Falha ao sincronizar");
      else await loadData();
    } catch (e: any) {
      setError(e?.message || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }, [finance, loadData]);

  // ── Derivados da visão geral ────────────────────────────────────────

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + (a.balance || 0), 0), [accounts]);
  const spentTotal = budget?.totalSpent ?? 0;
  const budgetedTotal = budget?.totalBudgeted ?? 0;

  const income = useMemo(
    () => budget ? budget.categories.filter((c) => c.budgeted < 0).reduce((s, c) => s + Math.abs(c.spent), 0) : 0,
    [budget]
  );
  const expenses = useMemo(
    () => budget ? budget.categories.filter((c) => c.budgeted >= 0).reduce((s, c) => s + c.spent, 0) : 0,
    [budget]
  );

  const health = useMemo(
    () => computeHealth(totalBalance, budget, store.goals, store.investments),
    [totalBalance, budget, store.goals, store.investments]
  );

  const filteredTx = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        (t.payee || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.notes || "").toLowerCase().includes(q)
    );
  }, [transactions, txSearch]);

  const investTotal = useMemo(() => store.investments.reduce((s, i) => s + i.value, 0), [store.investments]);
  const investCostTotal = useMemo(() => store.investments.reduce((s, i) => s + i.cost, 0), [store.investments]);
  const investGain = investTotal - investCostTotal;

  const simulation = useMemo(() => {
    if (simAmount <= 0 && simMonthly <= 0) return 0;
    const monthlyRate = simYield / 100 / 12;
    const months = simYears * 12;
    let v = simAmount;
    for (let m = 0; m < months; m++) {
      v = v * (1 + monthlyRate) + simMonthly;
    }
    return v;
  }, [simAmount, simMonthly, simYield, simYears]);

  const affordability = useMemo(() => {
    // regra simples: pode comprar se, após a compra, o saldo segue >= reserva mínima (ex: 30% do saldo ou R$ 1.000)
    const minReserve = Math.min(1000, totalBalance * 0.3);
    const after = totalBalance * 100 - buyAmount * 100;
    const ok = after >= minReserve * 100;
    return { ok, after, minReserve };
  }, [totalBalance, buyAmount]);

  const addGoal = () => {
    if (!goalName.trim() || !(parseFloat(goalTarget) > 0)) return;
    const g: FinanceGoal = {
      id: uid(), name: goalName.trim(),
      target: parseFloat(goalTarget), current: 0, emoji: "🎯",
    };
    persist({ ...store, goals: [...store.goals, g] });
    setGoalName(""); setGoalTarget("");
  };

  const addInvestment = () => {
    if (!invName.trim() || !(parseFloat(invValue) > 0)) return;
    const inv: FinanceInvestment = {
      id: uid(), name: invName.trim(), kind: "outro",
      value: parseFloat(invValue), cost: parseFloat(invCost) || parseFloat(invValue),
    };
    persist({ ...store, investments: [...store.investments, inv] });
    setInvName(""); setInvValue(""); setInvCost("");
  };

  const say = (msg: string) => {
    if (onSendMessage) onSendMessage(msg);
  };

  const askAssistant = () => {
    const q = assistantText.trim();
    if (!q) return;
    say(q);
    setAssistantText("");
  };

  // ── Render ──────────────────────────────────────────────────────────

  const CATEGORY_TONE = (isIncome: boolean) => (isIncome ? P.success : P.error);
  const isIncomeTx = (t: OrunFinanceTransaction) => (t.amount || 0) >= 0;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Health + balance hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex items-center gap-5 lg:col-span-1">
          <Ring score={health.score} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Saúde financeira</p>
            <p className="text-[16px] font-bold mt-1" style={{ color: P.text }}>{health.label}</p>
            <p className="text-[10px] mt-1 text-left" style={{ color: P.sub }}>
              {health.breakdown.filter((b) => b.pct < 0).length > 0
                ? `${health.breakdown.filter((b) => b.pct < 0).length} ponto(s) de atenção`
                : "Sem pontos críticos"}
            </p>
          </div>
        </Card>
        <Card className="p-6 flex flex-col justify-center lg:col-span-1" style={{ background: `linear-gradient(135deg, ${P.card}, rgba(195,0,47,0.12))`, border: `1px solid rgba(195,0,47,0.25)` }}>
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Saldo total</p>
          <p className="text-[28px] font-bold tabular-nums mt-1" style={{ color: P.text }}>
            {fmt(totalBalance)}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: P.success }}>
              <ArrowUpRight size={12} /> {fmt(income, true)}
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: P.error }}>
              <ArrowDownRight size={12} /> {fmt(expenses, true)}
            </span>
          </div>
        </Card>
        <Card className="p-6 flex flex-col justify-center gap-3 lg:col-span-1">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Investimentos</p>
            <p className="text-[20px] font-bold tabular-nums mt-1" style={{ color: P.text }}>
              {fmt(investTotal, true)}
            </p>
            <p className="text-[10px] mt-1" style={{ color: investGain >= 0 ? P.success : P.error }}>
              {investGain >= 0 ? "▲" : "▼"} {fmt(Math.abs(investGain), true)} ({investCostTotal > 0 ? Math.round((investGain / investCostTotal) * 100) : 0}%)
            </p>
          </div>
          <PrimaryButton onClick={() => setSection("investments")}>
            <BarChart3 size={13} /> Ver carteira
          </PrimaryButton>
        </Card>
      </div>

      {/* Health breakdown */}
      <Card className="p-5">
        <SectionHeader icon={Sparkles} title="Fatores do score" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {health.breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px]" style={{ color: P.sub }}>{b.label}</span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: b.tone === "ok" ? P.success : b.tone === "err" ? P.error : P.alert }}>
                  {b.pct >= 0 ? "+" : ""}{b.pct}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.card2 }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.abs(b.pct))}%`, background: b.tone === "ok" ? P.success : b.tone === "err" ? P.error : P.alert }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Landmark} label="Contas" value={String(accounts.length)} tone="neutral" />
        <StatCard icon={PiggyBank} label="Metas" value={String(store.goals.length)} tone="neutral" onClick={() => setSection("goals")} />
        <StatCard icon={ReceiptText} label="Transações (mês)" value={String(budget?.categories.reduce((s, c) => s + c.spent, 0) !== 0 ? transactions.length : transactions.length)} tone="neutral" />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Calculator, label: "Simulador de projeção", s: "simulator" as Section },
          { icon: ShoppingBag, label: "Posso comprar?", s: "buy" as Section },
          { icon: Target, label: "Criar meta", s: "goals" as Section },
          { icon: Bot, label: "Perguntar ao Hampton", s: "assistant" as Section },
        ].map((a) => (
          <Card key={a.s} hover onClick={() => setSection(a.s)} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgba(195,0,47,0.14)`, color: P.primary }}>
              <a.icon size={16} strokeWidth={1.7} />
            </div>
            <span className="text-[11px] font-medium" style={{ color: P.text }}>{a.label}</span>
          </Card>
        ))}
      </div>

      {/* Últimas transações */}
      <section>
        <SectionHeader icon={ReceiptText} title="Últimas transações" right={
          <GhostButton onClick={() => setSection("transactions")}>Ver todas</GhostButton>
        } />
        <Card className="px-4 py-2">
          {transactions.length === 0 ? (
            <p className="text-[10px] py-6 text-center" style={{ color: P.dim }}>Nenhuma transação ainda</p>
          ) : (
            transactions.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: P.border }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: isIncomeTx(t) ? `${P.success}1a` : `${P.error}1a` }}>
                  {isIncomeTx(t) ? <ArrowUpRight size={13} color={P.success} /> : <ArrowDownRight size={13} color={P.error} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>{t.payee || "Sem descrição"}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: P.sub }}>{dateLabel(t.date)}{t.category ? ` · ${aiLabelFor(t.category)}` : ""}</p>
                </div>
                <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: CATEGORY_TONE(isIncomeTx(t)) }}>
                  {isIncomeTx(t) ? "+" : ""}{fmt(t.amount)}
                </span>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <SectionHeader icon={ReceiptText} title={`Transações — ${transactions.length}`} />
      <Input value={txSearch} onChange={setTxSearch} placeholder="Buscar por estabelecimento, categoria..." />
      <Card className="px-4 py-2">
        {filteredTx.length === 0 ? (
          <p className="text-[10px] py-6 text-center" style={{ color: P.dim }}>Nenhuma transação encontrada</p>
        ) : (
          filteredTx.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: P.border }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: isIncomeTx(t) ? `${P.success}1a` : `${P.error}1a` }}>
                {isIncomeTx(t) ? <ArrowUpRight size={13} color={P.success} /> : <ArrowDownRight size={13} color={P.error} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>{t.payee || "Sem descrição"}</p>
                <p className="text-[9px] mt-0.5" style={{ color: P.sub }}>
                  {dateLabel(t.date)}
                  {t.category ? ` · ${aiLabelFor(t.category)}` : ""}
                  {t.account ? ` · conta ${String(t.account).slice(0, 8)}` : ""}
                </p>
              </div>
              <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: CATEGORY_TONE(isIncomeTx(t)) }}>
                {isIncomeTx(t) ? "+" : ""}{fmt(t.amount)}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );

  const renderBudget = () => {
    const cats = budget?.categories ?? [];
    return (
      <div className="space-y-6">
        <SectionHeader icon={TrendingDown} title={`Orçamento — ${currentMonthLabel()}`} right={
          budget ? <Badge tone={spentTotal > budgetedTotal ? "err" : "ok"}>{fmt(spentTotal, true)} / {fmt(budgetedTotal, true)}</Badge> : undefined
        } />
        {!budget ? (
          <Card className="p-8 text-center">
            <AlertTriangle size={28} className="mx-auto" style={{ color: P.alert }} />
            <p className="text-xs mt-3" style={{ color: P.sub }}>Orçamento não disponível para este mês.</p>
          </Card>
        ) : cats.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-xs" style={{ color: P.dim }}>Nenhuma categoria de orçamento configurada no livro-razão.</p>
          </Card>
        ) : (
          <Card className="px-5 py-4 space-y-1">
            {[...cats].sort((a, b) => b.spent - a.spent).map((cat) => {
              const pct = cat.budgeted > 0 ? Math.min((cat.spent / cat.budgeted) * 100, 100) : cat.spent > 0 ? 100 : 0;
              const over = cat.spent > cat.budgeted && cat.budgeted > 0;
              const bar = over ? P.error : pct > 80 ? P.alert : P.success;
              return (
                <div key={cat.categoryId} className="py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium truncate" style={{ color: P.text }}>{aiLabelFor(cat.category)}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] tabular-nums" style={{ color: P.sub }}>{fmt(cat.spent, true)}</span>
                      <span className="text-[9px] tabular-nums" style={{ color: P.dim }}>/ {fmt(cat.budgeted, true)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.card2 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: bar }} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-3 mt-1 border-t" style={{ borderColor: P.border }}>
              <span className="text-[11px] font-semibold" style={{ color: P.text }}>Total</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tabular-nums" style={{ color: spentTotal > budgetedTotal ? P.error : P.success }}>
                  {fmt(spentTotal, true)}
                </span>
                <span className="text-[9px]" style={{ color: P.dim }}>/ {fmt(budgetedTotal, true)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderGoals = () => (
    <div className="space-y-6">
      <SectionHeader icon={Target} title="Metas de economia" />
      {/* add form */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: P.dim }}>Nova meta</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={goalName} onChange={setGoalName} placeholder="Nome (ex.: reserva, PS5, viagem)" />
          <Input value={goalTarget} onChange={setGoalTarget} placeholder="Valor alvo (R$)" type="number" />
          <PrimaryButton onClick={addGoal} disabled={!goalName.trim() || !(parseFloat(goalTarget) > 0)}>
            <Plus size={13} /> Criar meta
          </PrimaryButton>
        </div>
      </Card>
      {/* list */}
      {store.goals.length === 0 ? (
        <Card className="p-8 text-center">
          <PiggyBank size={28} className="mx-auto" style={{ color: P.dim }} />
          <p className="text-xs mt-3" style={{ color: P.sub }}>Crie sua primeira meta. Metas são a base de uma boa saúde financeira.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {store.goals.map((g) => {
            const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold" style={{ color: P.text }}>{g.emoji} {g.name}</span>
                  {pct >= 100 && <Badge tone="ok">Concluída</Badge>}
                </div>
                <div className="flex items-center justify-between mb-1.5 text-[10px]">
                  <span className="tabular-nums" style={{ color: P.sub }}>{fmt(g.current, true)}</span>
                  <span className="tabular-nums" style={{ color: P.dim }}>de {fmt(g.target, true)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: P.card2 }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? P.success : P.primary }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: pct >= 100 ? P.success : P.primary }}>
                    {Math.round(pct)}%
                  </span>
                  <div className="flex items-center gap-2">
                    <GhostButton className="!px-3 !py-1.5 !text-[10px]" onClick={() => {
                      persist({ ...store, goals: store.goals.map((x) => x.id === g.id ? { ...x, current: x.current + Math.min(x.target, x.current + 100) } : x) });
                    }}>+R$100</GhostButton>
                    <button className="text-[9px]" style={{ color: P.dim }} onClick={() => persist({ ...store, goals: store.goals.filter((x) => x.id !== g.id) })}>remover</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderInvestments = () => (
    <div className="space-y-6">
      <SectionHeader icon={BarChart3} title="Investimentos" right={
        <Badge tone={investGain >= 0 ? "ok" : "err"}>{investGain >= 0 ? "▲" : "▼"} {fmt(Math.abs(investGain), true)}</Badge>
      } />
      {/* add */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: P.dim }}>Registrar posição (manual)</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input value={invName} onChange={setInvName} placeholder="Nome (ex.: TESOURO SELIC)" />
          <Input value={invValue} onChange={setInvValue} placeholder="Valor atual (R$)" type="number" />
          <Input value={invCost} onChange={setInvCost} placeholder="Custo (R$) — opcional" type="number" />
          <PrimaryButton onClick={addInvestment} disabled={!invName.trim() || !(parseFloat(invValue) > 0)}>
            <Plus size={13} /> Adicionar
          </PrimaryButton>
        </div>
      </Card>
      {store.investments.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 size={28} className="mx-auto" style={{ color: P.dim }} />
          <p className="text-xs mt-3" style={{ color: P.sub }}>Sem posições registradas. Adicione seus investimentos para acompanhar.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Landmark} label="Valor atual" value={fmt(investTotal, true)} tone="neutral" />
            <StatCard icon={CreditCard} label="Custo total" value={fmt(investCostTotal, true)} tone="neutral" />
            <StatCard icon={TrendingUp} label="Resultado" value={`${investGain >= 0 ? "+" : ""}${fmt(investGain, true)}`} tone={investGain >= 0 ? "ok" : "err"} />
          </div>
          <Card className="px-5 py-3">
            {store.investments.map((i) => {
              const gain = i.value - i.cost;
              const pct = i.cost > 0 ? (gain / i.cost) * 100 : 0;
              return (
                <div key={i.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: P.border }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>{i.name}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: P.sub }}>{KINDS[i.kind]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-semibold tabular-nums" style={{ color: P.text }}>{fmt(i.value, true)}</p>
                    <p className="text-[9px] tabular-nums" style={{ color: gain >= 0 ? P.success : P.error }}>
                      {gain >= 0 ? "+" : ""}{pct.toFixed(1)}%
                    </p>
                  </div>
                  <button className="text-[9px] shrink-0" style={{ color: P.dim }} onClick={() => persist({ ...store, investments: store.investments.filter((x) => x.id !== i.id) })}>remover</button>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );

  const renderSimulator = () => (
    <div className="space-y-6">
      <SectionHeader icon={Calculator} title="Simulador de projeção" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Valor inicial</label>
            <input type="range" min={0} max={100000} step={1000} value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))} className="w-full mt-2 accent-[#C3002F]" />
            <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: P.text }}>{fmt(simAmount, true)}</p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Aporte mensal</label>
            <input type="range" min={0} max={20000} step={100} value={simMonthly} onChange={(e) => setSimMonthly(Number(e.target.value))} className="w-full mt-2 accent-[#C3002F]" />
            <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: P.text }}>{fmt(simMonthly, true)}/mês</p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Rendimento anual (% a.a.)</label>
            <input type="range" min={0} max={30} step={0.5} value={simYield} onChange={(e) => setSimYield(Number(e.target.value))} className="w-full mt-2 accent-[#C3002F]" />
            <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: P.text }}>{simYield}%</p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Horizonte (anos)</label>
            <input type="range" min={1} max={40} step={1} value={simYears} onChange={(e) => setSimYears(Number(e.target.value))} className="w-full mt-2 accent-[#C3002F]" />
            <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: P.text }}>{simYears} anos</p>
          </div>
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center text-center" style={{ background: `linear-gradient(135deg, ${P.card}, rgba(195,0,47,0.14))` }}>
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Projeção em {simYears} anos</p>
          <p className="text-[40px] font-bold tabular-nums mt-2" style={{ color: P.text }}>{fmt(simulation, true)}</p>
          <p className="text-[11px] mt-3" style={{ color: P.sub }}>
            Com {fmt(simAmount, true)} iniciais + {fmt(simMonthly, true)}/mês a {simYield}% a.a.
          </p>
          <Badge tone="ok" >Juros compostos ativos</Badge>
        </Card>
      </div>
      <Card className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkles size={16} style={{ color: P.primary }} />
          <p className="text-[11px]" style={{ color: P.sub }}>Quer um plano de aportes personalizado com base nos seus dados?</p>
        </div>
        <PrimaryButton onClick={() => setSection("assistant")}>Perguntar ao Hampton</PrimaryButton>
      </Card>
    </div>
  );

  const renderBuy = () => {
    const { ok, after, minReserve } = affordability;
    return (
      <div className="space-y-6">
        <SectionHeader icon={ShoppingBag} title="Posso comprar?" />
        <Card className="p-6">
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Valor da compra</p>
          <div className="flex items-center gap-3 mt-3">
            <input
              type="number"
              value={buyAmount}
              min={0}
              onChange={(e) => setBuyAmount(Number(e.target.value))}
              className="flex-1 !w-auto"
              style={{ padding: "13px 15px", borderRadius: 12, fontSize: 16, fontWeight: 700, background: P.panel, color: P.text, border: `1px solid ${P.borderHi}`, outline: "none" }}
            />
            <PrimaryButton disabled={totalBalance <= 0} onClick={() => setSection("assistant")}>
              Analisar com IA
            </PrimaryButton>
          </div>
        </Card>
        <Card
          className="p-8 flex flex-col items-center text-center"
          style={{ borderColor: ok ? `${P.success}55` : `${P.error}55`, background: ok ? `${P.success}0d` : `${P.error}0d` }}
        >
          {ok ? <CheckCircle2 size={40} style={{ color: P.success }} /> : <AlertTriangle size={40} style={{ color: P.error }} />}
          <p className="text-[18px] font-bold mt-3" style={{ color: P.text }}>
            {ok ? "Pode comprar" : "Melhor segurar a mão"}
          </p>
          <p className="text-[11px] mt-2 max-w-[340px]" style={{ color: P.sub }}>
            Saldo atual: <strong>{fmt(totalBalance)}</strong>. Após a compra sobraria <strong>{fmt(after)}</strong>.
            {ok
              ? ` Você mantém ${fmt(minReserve, true)} de reserva mínima.`
              : ` Você ficaria abaixo da reserva mínima de ${fmt(minReserve, true)}.`}
          </p>
          <div className="flex items-center gap-4 mt-4 text-[10px]">
            <span className="tabular-nums" style={{ color: P.dim }}>Saldo: {fmt(totalBalance)}</span>
            <span className="tabular-nums" style={{ color: P.dim }}>Reserva mínima: {fmt(minReserve, true)}</span>
            <span className="tabular-nums" style={{ color: ok ? P.success : P.error }}>Depois: {fmt(after)}</span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: P.dim }}>Por que essa regra?</p>
          <p className="text-[10px] leading-relaxed" style={{ color: P.sub }}>
            Usamos uma regra simples: compras avulsas não devem zerar (ou comprometer) sua reserva de segurança.
            Mantenha ao menos <strong>R$ 1.000</strong> ou <strong>30% do saldo</strong> (o que for menor) após qualquer compra não essencial.
            Para uma análise completa (orçamento, metas e histórico), use <strong>Analisar com IA</strong>.
          </p>
        </Card>
      </div>
    );
  };

  const renderAssistant = () => (
    <div className="space-y-6">
      <SectionHeader icon={Bot} title="Assistant Financeiro (Hampton)" />
      <Card className="p-6">
        <p className="text-[11px] leading-relaxed" style={{ color: P.sub }}>
          Fale com o agente Finance para registrar lançamentos, tirar dúvidas sobre orçamento,
          saldo ou metas. Você também pode lançar direto pelo <strong>WhatsApp</strong> ou por <strong>voz</strong>.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          "Quanto gastei com alimentação este mês?",
          "Reserve R$ 500 para a meta de emergência",
          "Devo comprar um notebook de R$ 4.000 agora?",
        ].map((q) => (
          <Card key={q} hover onClick={() => say(q)} className="p-4">
            <p className="text-[11px]" style={{ color: P.text }}>{q}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: P.dim }}>Faça uma pergunta</p>
        <div className="flex items-center gap-3">
          <Input value={assistantText} onChange={setAssistantText} placeholder="Ex.: registrar almoço de R$ 35 no Pão de Açúcar..." />
          <PrimaryButton onClick={askAssistant} disabled={!assistantText.trim()}>
            <Sparkles size={13} /> Enviar
          </PrimaryButton>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[9px]" style={{ color: P.dim }}>
          <span className="flex items-center gap-1.5"><RefreshCw size={11} /> WhatsApp</span>
          <span className="flex items-center gap-1.5"><RefreshCw size={11} /> Voz</span>
          <span className="flex items-center gap-1.5"><RefreshCw size={11} /> Foto de recibo</span>
          <span className="flex items-center gap-1.5">— entradas configuradas no Orun</span>
        </div>
      </Card>
    </div>
  );

  return (
    <PremiumRoot className="relative">
      <div className="flex h-full">
        {/* Sidebar */}
        <div
          className="w-[188px] shrink-0 flex flex-col border-r"
          style={{ background: P.panel, borderColor: P.border }}
        >
          <div className="flex items-center gap-2.5 px-4 py-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#E50914,#C3002F)", boxShadow: "0 0 14px rgba(229,9,20,0.35)" }}>
              <Wallet size={15} color="#fff" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-none" style={{ color: P.text, fontFamily: "'Sora', sans-serif" }}>Orun Finance</p>
              <p className="text-[8px] mt-1 uppercase tracking-widest" style={{ color: P.dim }}>Controle total</p>
            </div>
          </div>
          <div className="flex-1 px-2 py-2 space-y-1 hs-scroll overflow-y-auto">
            <NavItem icon={LayoutDashboard} label="Visão geral" active={section === "overview"} onClick={() => setSection("overview")} />
            <NavItem icon={ReceiptText} label="Transações" active={section === "transactions"} onClick={() => setSection("transactions")} badge={filteredTx.length} />
            <NavItem icon={TrendingDown} label="Orçamento" active={section === "budget"} onClick={() => setSection("budget")} />
            <NavItem icon={Target} label="Metas" active={section === "goals"} onClick={() => setSection("goals")} badge={store.goals.length} />
            <NavItem icon={BarChart3} label="Investimentos" active={section === "investments"} onClick={() => setSection("investments")} />
            <NavItem icon={Calculator} label="Simulador" active={section === "simulator"} onClick={() => setSection("simulator")} />
            <NavItem icon={ShoppingBag} label="Posso comprar?" active={section === "buy"} onClick={() => setSection("buy")} />
            <NavItem icon={Bot} label="Assistant" active={section === "assistant"} onClick={() => setSection("assistant")} />
          </div>
          <div className="px-4 py-3 border-t" style={{ borderColor: P.border }}>
            <p className="text-[8px] uppercase tracking-widest" style={{ color: P.dim }}>Fonte</p>
            <p className="text-[10px] font-medium mt-1 flex items-center gap-1.5" style={{ color: P.sub }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: configured ? P.success : P.error, boxShadow: `0 0 6px ${configured ? P.success : P.error}` }} />
              {configured ? "Actual Budget" : "Não configurado"}
            </p>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 shrink-0">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold truncate" style={{ color: P.text, fontFamily: "'Sora', sans-serif" }}>
                {section === "overview" ? "Visão geral" :
                 section === "transactions" ? "Transações" :
                 section === "budget" ? `Orçamento — ${currentMonthLabel()}` :
                 section === "goals" ? "Metas" :
                 section === "investments" ? "Investimentos" :
                 section === "simulator" ? "Simulador" :
                 section === "buy" ? "Posso comprar?" : "Assistant Financeiro"}
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: P.sub }}>Suas finanças em um só lugar</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PrimaryButton onClick={handleSync} disabled={syncing || loading || !configured}>
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </PrimaryButton>
            </div>
          </div>

          <ScrollArea>
            <div className="px-6 pb-8">
              {error && (
                <div className="p-3 rounded-xl text-[10px] mb-4" style={{ background: "rgba(255,75,75,0.1)", color: P.error, border: "1px solid rgba(255,75,75,0.25)" }}>
                  {error}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: `${P.border} transparent ${P.border} ${P.border}`, borderTopColor: "transparent" }} />
                </div>
              ) : !configured ? (
                <Card className="p-12 flex flex-col items-center gap-3" style={{ border: "1px dashed " + P.border }}>
                  <Wallet size={36} style={{ color: P.dim, opacity: 0.5 }} />
                  <p className="text-xs font-medium" style={{ color: P.text }}>Livro-razão não configurado</p>
                  <p className="text-[10px] text-center max-w-[300px]" style={{ color: P.sub }}>
                    Configure em <strong>Settings → Integrações → Finance</strong> com os dados do seu Actual Budget
                    para ativar o backend. As seções de metas, investimentos, simulador e análise continuam funcionando.
                  </p>
                </Card>
              ) : (
                <div className={section === "overview" ? "" : ""}>
                  {section === "overview" && renderOverview()}
                  {section === "transactions" && renderTransactions()}
                  {section === "budget" && renderBudget()}
                  {section === "goals" && renderGoals()}
                  {section === "investments" && renderInvestments()}
                  {section === "simulator" && renderSimulator()}
                  {section === "buy" && renderBuy()}
                  {section === "assistant" && renderAssistant()}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </PremiumRoot>
  );
}
