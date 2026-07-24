// plugins/workspaces/workspace-finance-ledger/FinanceLedger.tsx
//
// Finance workspace — expense tracking, budgets, category breakdowns, and investment cards.

import { useState, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerFinanceActions, unregisterFinanceActions } from "./finance-actions";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ── Store ───────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
}

interface FinanceState {
  [key: string]: unknown;
  transactions: Transaction[];
  budgets: Record<string, { limit: number; spent: number }>;
  selectedView: "overview" | "transactions" | "investments";
}

const useFinanceStore = createStore<FinanceState>({
  transactions: [],
  budgets: {},
  selectedView: "overview",
});

// ── Helpers ─────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "#C00018",
  "Transporte": "#3B82F6",
  "Lazer": "#F59E0B",
  "Moradia": "#8B5CF6",
  "Saúde": "#22C55E",
  "Renda": "#06B6D4",
};

// ── Main Workspace ──────────────────────────────────────────────────────

export function FinanceLedger({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const [activeView, setActiveView] = useState<"overview" | "transactions" | "investments">("overview");

  useEffect(() => {
    registerFinanceActions();
    return () => unregisterFinanceActions();
  }, []);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Category breakdown for pie
  const categoryData = Object.entries(
    transactions.filter((t) => t.type === "expense").reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Daily spending for bar chart
  const dailyData = [
    { day: "12", valor: 21.90 },
    { day: "13", valor: 709.90 },
    { day: "14", valor: 212.40 },
    { day: "15", valor: 129.80 },
    { day: "16", valor: 74.80 },
    { day: "17", valor: 287.50 },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* View Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {(["overview", "transactions", "investments"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === view ? 500 : 300,
              color: activeView === view ? "var(--foreground)" : "var(--muted-foreground)",
              background: activeView === view ? "rgba(192,0,24,0.08)" : "transparent",
            }}
          >
            {view === "overview" ? "Visão Geral" : view === "transactions" ? "Transações" : "Investimentos"}
          </button>
        ))}
      </div>

      {activeView === "overview" && (
        <div className="p-4 space-y-4">
          {/* Balance Card */}
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Saldo Disponível</span>
                <p className="text-2xl font-medium mt-1" style={{ fontFamily: "'Sora', sans-serif", color: balance >= 0 ? "#22C55E" : "#EF4444" }}>
                  {fmt(balance)}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Receitas</span>
                  <span className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#22C55E" }}>{fmt(totalIncome)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Despesas</span>
                  <span className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#EF4444" }}>{fmt(totalExpense)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spending by Category */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Despesas por Categoria
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#666"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }}
                  formatter={(v: number) => [fmt(v), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {categoryData.map((c) => (
                <span key={c.name} className="text-[9px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.name] || "#666" }} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Daily Spending */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Gastos por Dia
            </h3>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }} formatter={(v: number) => [fmt(v), ""]} />
                <Bar dataKey="valor" fill="#C00018" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeView === "transactions" && (
        <div className="p-4 space-y-2">
          <h3 className="text-[11px] font-medium mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Últimas Transações
          </h3>
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: `${CATEGORY_COLORS[t.category] || "#666"}15`,
              }}>
                <span className="text-[10px]" style={{ color: CATEGORY_COLORS[t.category] || "#666" }}>
                  {t.category[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate" style={{ color: "var(--foreground)" }}>{t.description}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t.date} · {t.category}</p>
              </div>
              <span className="text-[11px] font-medium" style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: t.type === "income" ? "#22C55E" : "#EF4444",
              }}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeView === "investments" && (
        <div className="p-4 space-y-3">
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Carteira de Investimentos
          </h3>
          {[
            { name: "CDB Banco X", type: "Renda Fixa", value: 15000, rate: 12.5, color: "#22C55E" },
            { name: "Tesouro IPCA+", type: "Renda Fixa", value: 22000, rate: 6.2, color: "#3B82F6" },
            { name: "FII HGLG11", type: "FII", value: 8500, rate: 0.8, color: "#F59E0B" },
            { name: "Ações PETR4", type: "Ações", value: 4200, rate: -2.1, color: "#EF4444" },
            { name: "Nubank", type: "Ações", value: 3800, rate: 5.7, color: "#8B5CF6" },
          ].map((inv, i) => (
            <div key={i} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{inv.name}</p>
                  <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{inv.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
                    {fmt(inv.value)}
                  </p>
                  <p className="text-[9px]" style={{ color: inv.rate >= 0 ? "#22C55E" : "#EF4444" }}>
                    {inv.rate >= 0 ? "+" : ""}{inv.rate}% mês
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
