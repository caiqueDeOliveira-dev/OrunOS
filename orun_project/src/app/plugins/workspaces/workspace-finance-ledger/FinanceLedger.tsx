// plugins/workspaces/workspace-finance-ledger/FinanceLedger.tsx
//
// Finance workspace — expense tracking, budgets, category breakdowns, and investment cards.

import { useState, useEffect } from "react";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerFinanceActions, unregisterFinanceActions, setFinanceStoreGetter } from "./finance-actions";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { P, PremiumRoot, ScrollArea, Card } from "../premium";

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
  "Alimentação": P.primary,
  "Transporte": P.info,
  "Lazer": P.alert,
  "Moradia": P.violet,
  "Saúde": P.success,
  "Renda": P.info,
};

// ── Main Workspace ──────────────────────────────────────────────────────

export function FinanceLedger({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Finance");
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const [activeView, setActiveView] = useState<"overview" | "transactions" | "investments">("overview");

  useEffect(() => {
    registerFinanceActions();
    setFinanceStoreGetter(() => useFinanceStore);
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
    <PremiumRoot className="relative">
      <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
        <span className="text-[11px] font-medium" style={{ color: P.sub }}>{greeting}, {userName}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(195,0,47,0.16)", color: P.primary }}>{avatarInitials}</div>
      </div>
      {/* View Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: P.border, background: P.bg }}>
        {(["overview", "transactions", "investments"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className="px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase transition-all hover:brightness-110"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === view ? 500 : 300,
              color: activeView === view ? P.text : P.sub,
              background: activeView === view ? "rgba(195,0,47,0.14)" : "transparent",
              border: `1px solid ${activeView === view ? "rgba(195,0,47,0.35)" : "transparent"}`,
            }}
          >
            {view === "overview" ? "Visão Geral" : view === "transactions" ? "Transações" : "Investimentos"}
          </button>
        ))}
      </div>

      <ScrollArea>
      {activeView === "overview" && (
        <div className="p-4 space-y-4">
          {/* Balance Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: P.dim }}>Saldo Disponível</span>
                <p className="text-2xl font-medium mt-1" style={{ fontFamily: "'Sora', sans-serif", color: balance >= 0 ? P.success : P.error }}>
                  {fmt(balance)}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px]" style={{ color: P.sub }}>Receitas</span>
                  <span className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: P.success }}>{fmt(totalIncome)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]" style={{ color: P.sub }}>Despesas</span>
                  <span className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: P.error }}>{fmt(totalExpense)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Spending by Category */}
          <Card className="p-3">
            <h3 className="text-[9px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: P.dim }}>
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
                  contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }}
                  formatter={(v: number) => [fmt(v), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {categoryData.map((c) => (
                <span key={c.name} className="text-[9px] flex items-center gap-1" style={{ color: P.sub }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.name] || "#666", boxShadow: `0 0 6px ${CATEGORY_COLORS[c.name] || "#666"}` }} />
                  {c.name}
                </span>
              ))}
            </div>
          </Card>

          {/* Daily Spending */}
          <Card className="p-3">
            <h3 className="text-[9px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: P.dim }}>
              Gastos por Dia
            </h3>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }} formatter={(v: number) => [fmt(v), ""]} />
                <Bar dataKey="valor" fill={P.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {activeView === "transactions" && (
        <div className="p-4 space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>
            Últimas Transações
          </h3>
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-[18px] transition-all hover:scale-[1.01]" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: `${CATEGORY_COLORS[t.category] || "#666"}15`,
              }}>
                <span className="text-[10px] font-semibold" style={{ color: CATEGORY_COLORS[t.category] || "#666" }}>
                  {t.category[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate" style={{ color: P.text }}>{t.description}</p>
                <p className="text-[9px]" style={{ color: P.sub }}>{t.date} · {t.category}</p>
              </div>
              <span className="text-[11px] font-medium" style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: t.type === "income" ? P.success : P.error,
              }}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeView === "investments" && (
        <div className="p-4 space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>
            Carteira de Investimentos
          </h3>
          {[
            { name: "CDB Banco X", type: "Renda Fixa", value: 15000, rate: 12.5, color: P.success },
            { name: "Tesouro IPCA+", type: "Renda Fixa", value: 22000, rate: 6.2, color: P.info },
            { name: "FII HGLG11", type: "FII", value: 8500, rate: 0.8, color: P.alert },
            { name: "Ações PETR4", type: "Ações", value: 4200, rate: -2.1, color: P.error },
            { name: "Nubank", type: "Ações", value: 3800, rate: 5.7, color: P.violet },
          ].map((inv, i) => (
            <Card key={i} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${inv.color}1A`, color: inv.color }}>
                  <span className="text-[10px] font-semibold">{inv.name[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>{inv.name}</p>
                  <p className="text-[9px]" style={{ color: P.sub }}>{inv.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: P.text }}>
                  {fmt(inv.value)}
                </p>
                <p className="text-[9px]" style={{ color: inv.rate >= 0 ? P.success : P.error }}>
                  {inv.rate >= 0 ? "+" : ""}{inv.rate}% mês
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
          <div className="p-4">
            <div className="rounded-[18px] p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <span className="text-xs font-medium mb-2 block" style={{ color: P.text }}>Notas Pessoais</span>
              <textarea
                value={notes}
                onChange={(e) => updateNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
                style={{ background: P.panel, color: P.text, border: `1px solid ${P.borderHi}`, minHeight: "60px" }}
                placeholder="Suas anotações financeiras..."
              />
            </div>
          </div>
      </ScrollArea>
          <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </PremiumRoot>
  );
}
