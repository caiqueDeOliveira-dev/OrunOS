// workspace-finance-real / FinanceRealWorkspace.tsx
// Real finance dashboard backed by Actual Budget integration.

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight, Wallet,
  TrendingUp, TrendingDown, AlertTriangle, Settings, type LucideIcon,
} from "lucide-react";
import { P, PremiumRoot, ScrollArea, Card, StatCard, SectionHeader, Badge, PrimaryButton, GhostButton } from "../premium";
import type { WorkspaceProps } from "../../types";
import type {
  OrunFinanceAccount,
  OrunFinanceTransaction,
  OrunFinanceBudgetMonth,
} from "../../../../types/orun";

// ── Helpers ──────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthLabel(): string {
  const d = new Date();
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

// ── Sub-components ───────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${P.border} transparent ${P.border} ${P.border}`, borderTopColor: "transparent" }} />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="p-3 rounded-xl text-[10px]"
      style={{ background: "rgba(255,75,75,0.1)", color: P.error, border: "1px solid rgba(255,75,75,0.25)" }}
    >
      {message}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="p-12 rounded-[18px] flex flex-col items-center gap-3" style={{ background: P.card, border: `1px dashed ${P.border}` }}>
      <Settings size={36} style={{ color: P.dim, opacity: 0.5 }} />
      <p className="text-xs font-medium" style={{ color: P.text }}>Actual Budget não configurado</p>
      <p className="text-[10px] text-center max-w-[280px]" style={{ color: P.sub }}>
        Configure em <strong>Settings → Integrações → Finance</strong> com os dados do seu servidor Actual Budget.
      </p>
    </div>
  );
}

function AccountCard({ account }: { account: OrunFinanceAccount }) {
  const isNegative = account.balance < 0;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${P.primary}1F`, color: P.primary }}>
          <Wallet size={16} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>{account.name}</p>
          <p className="text-[9px] mt-0.5" style={{ color: P.sub }}>{account.type}</p>
        </div>
        <span
          className="text-[12px] font-semibold tabular-nums shrink-0"
          style={{ color: isNegative ? P.error : P.success }}
        >
          {formatCurrency(account.balance)}
        </span>
      </div>
    </Card>
  );
}

function TransactionRow({ tx }: { tx: OrunFinanceTransaction }) {
  const isIncome = (tx.amount || 0) >= 0;
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: P.border }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: isIncome ? `${P.success}1a` : `${P.error}1a` }}>
        <Icon size={13} color={isIncome ? P.success : P.error} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>{tx.payee || "Sem descrição"}</p>
        <p className="text-[9px] mt-0.5" style={{ color: P.sub }}>
          {formatDate(tx.date)}{tx.category ? ` · ${tx.category}` : ""}
        </p>
      </div>
      <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: isIncome ? P.success : P.error }}>
        {isIncome ? "+" : ""}{formatCurrency(tx.amount)}
      </span>
    </div>
  );
}

function BudgetBar({ category, budgeted, spent }: { category: string; budgeted: number; spent: number }) {
  const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : spent > 0 ? 100 : 0;
  const overBudget = spent > budgeted && budgeted > 0;
  const barColor = overBudget ? P.error : pct > 80 ? P.alert : P.success;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium truncate" style={{ color: P.text }}>{category}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] tabular-nums" style={{ color: P.sub }}>{formatCurrency(spent)}</span>
          <span className="text-[9px] tabular-nums" style={{ color: P.dim }}>/ {formatCurrency(budgeted)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.card2 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function FinanceRealWorkspace(props: WorkspaceProps) {
  const finance = (window as any).orun?.finance;

  const [accounts, setAccounts] = useState<OrunFinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<OrunFinanceTransaction[]>([]);
  const [budget, setBudget] = useState<OrunFinanceBudgetMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const loadData = useCallback(async () => {
    if (!finance?.listAccounts) {
      setConfigured(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [accRes, catRes, budgetRes] = await Promise.all([
        finance.listAccounts(),
        finance.listTransactions(undefined, { limit: 20 }),
        finance.getBudgetMonth(currentMonth()),
      ]);

      if (!accRes.ok && accRes.error?.includes("not configured")) {
        setConfigured(false);
        setLoading(false);
        return;
      }

      if (accRes.ok && accRes.data) setAccounts(accRes.data);
      if (catRes.ok && catRes.data) setTransactions(catRes.data);
      if (budgetRes.ok && budgetRes.data) setBudget(budgetRes.data);

      if (!accRes.ok && !catRes.ok && !budgetRes.ok) {
        setError("Falha ao carregar dados financeiros. Verifique a configuração.");
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao conectar com Actual Budget");
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
      if (!res.ok) {
        setError(res.error || "Falha ao sincronizar");
      } else {
        await loadData();
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }, [finance, loadData]);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const budgetedTotal = budget?.totalBudgeted ?? 0;
  const spentTotal = budget?.totalSpent ?? 0;

  return (
    <PremiumRoot className="relative">
      <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${P.success}, ${P.primary})`,
              boxShadow: "0 0 16px rgba(0,210,106,0.15)",
            }}
          >
            <DollarSign size={18} color="#fff" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold truncate" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>
              Finance Real
            </h2>
            <p className="text-[10px]" style={{ color: P.sub }}>Conectado ao Actual Budget</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PrimaryButton onClick={handleSync} disabled={syncing || loading}>
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sync"}
          </PrimaryButton>
        </div>
      </div>

      <ScrollArea>
        <div className="px-6 pb-6 space-y-6">
          {error && <ErrorBanner message={error} />}

          {loading && <LoadingSpinner />}

          {!loading && !configured && <NotConfigured />}

          {!loading && configured && (
            <>
              {/* Accounts Grid */}
              <section>
                <SectionHeader icon={Wallet} title="Contas" />
                {accounts.length === 0 ? (
                  <p className="text-[10px]" style={{ color: P.dim }}>Nenhuma conta encontrada</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {accounts.map((acc) => (
                      <AccountCard key={acc.id} account={acc} />
                    ))}
                  </div>
                )}
                {accounts.length > 0 && (
                  <div className="mt-3">
                    <StatCard
                      icon={TrendingUp}
                      label="Saldo Total"
                      value={formatCurrency(totalBalance)}
                      status={totalBalance >= 0 ? "positivo" : "negativo"}
                      tone={totalBalance >= 0 ? "ok" : "err"}
                    />
                  </div>
                )}
              </section>

              {/* Recent Transactions */}
              <section>
                <SectionHeader icon={DollarSign} title="Últimas Transações" />
                <Card className="px-4 py-2">
                  {transactions.length === 0 ? (
                    <p className="text-[10px] py-4 text-center" style={{ color: P.dim }}>Nenhuma transação encontrada</p>
                  ) : (
                    transactions.slice(0, 15).map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))
                  )}
                </Card>
              </section>

              {/* Budget Summary */}
              <section>
                <SectionHeader
                  icon={TrendingDown}
                  title={`Orçamento — ${currentMonthLabel()}`}
                  right={
                    budget ? (
                      <Badge tone={spentTotal > budgetedTotal ? "err" : "ok"}>
                        {formatCurrency(spentTotal)} / {formatCurrency(budgetedTotal)}
                      </Badge>
                    ) : undefined
                  }
                />
                {!budget ? (
                  <p className="text-[10px]" style={{ color: P.dim }}>Orçamento não disponível para este mês</p>
                ) : budget.categories.length === 0 ? (
                  <p className="text-[10px]" style={{ color: P.dim }}>Nenhuma categoria de orçamento configurada</p>
                ) : (
                  <Card className="px-4 py-2">
                    {budget.categories.map((cat) => (
                      <BudgetBar
                        key={cat.categoryId}
                        category={cat.category}
                        budgeted={cat.budgeted}
                        spent={cat.spent}
                      />
                    ))}
                    <div className="flex items-center justify-between pt-3 mt-1 border-t" style={{ borderColor: P.border }}>
                      <span className="text-[10px] font-semibold" style={{ color: P.text }}>Total</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] tabular-nums" style={{ color: P.error }}>{formatCurrency(spentTotal)}</span>
                        <span className="text-[9px]" style={{ color: P.dim }}>/</span>
                        <span className="text-[10px] tabular-nums" style={{ color: P.sub }}>{formatCurrency(budgetedTotal)}</span>
                      </div>
                    </div>
                  </Card>
                )}
              </section>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Wallet} label="Contas" value={String(accounts.length)} tone="neutral" />
                <StatCard
                  icon={ArrowUpRight}
                  label="Receitas"
                  value={formatCurrency(budget?.categories.filter((c) => c.budgeted < 0).reduce((s, c) => s + Math.abs(c.spent), 0) ?? 0)}
                  tone="ok"
                />
                <StatCard
                  icon={ArrowDownRight}
                  label="Despesas"
                  value={formatCurrency(budget?.categories.filter((c) => c.budgeted >= 0).reduce((s, c) => s + c.spent, 0) ?? 0)}
                  tone="err"
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </PremiumRoot>
  );
}
