import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "finance";

let registered = false;

let getStore: (() => any) | null = null;
export function setFinanceStoreGetter(getter: () => any) { getStore = getter; }

function getFinanceState() {
  if (!getStore) throw new Error("Finance store not initialized");
  return getStore();
}

let txIdCounter = 0;
function nextTxId() { return `ft_${Date.now()}_${++txIdCounter}`; }

const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "#C00018",
  "Transporte": "#3B82F6",
  "Lazer": "#F59E0B",
  "Moradia": "#8B5CF6",
  "Saúde": "#22C55E",
  "Renda": "#06B6D4",
};

const actions = {
  async add_transaction(params: Record<string, unknown>) {
    const description = String(params.description || "");
    const amount = typeof params.amount === "number" ? params.amount : 0;
    const category = String(params.category || "Outros");
    const type = params.type as "income" | "expense";

    if (!description) return { success: false, error: "description is required" };
    if (amount <= 0) return { success: false, error: "amount must be positive" };
    if (type !== "income" && type !== "expense") return { success: false, error: "type must be \"income\" or \"expense\"" };

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}`;

    const newTx = {
      id: nextTxId(),
      date: dateStr,
      description,
      amount,
      category,
      type,
    };

    const store = getFinanceState();
    store.setState((s: any) => ({ transactions: [...s.transactions, newTx] }));

    return { success: true, data: newTx, message: `${type === "income" ? "Income" : "Expense"} added: ${description}` };
  },

  async delete_transaction(params: Record<string, unknown>) {
    const transactionId = String(params.transactionId || "");
    if (!transactionId) return { success: false, error: "transactionId is required" };

    const store = getFinanceState();
    const state = store.getState();
    const exists = state.transactions.some((t: any) => t.id === transactionId);
    if (!exists) return { success: false, error: `Transaction "${transactionId}" not found` };

    store.setState((s: any) => ({
      transactions: s.transactions.filter((t: any) => t.id !== transactionId),
    }));

    return { success: true, message: `Deleted transaction "${transactionId}"` };
  },

  async get_summary() {
    const store = getFinanceState();
    const state = store.getState();
    const txs = state.transactions;

    const totalIncome = txs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
    const totalExpense = txs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const categoryBreakdown: Record<string, number> = {};
    for (const tx of txs) {
      if (tx.type === "expense") {
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
      }
    }

    const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#6B7280",
    }));

    return {
      success: true,
      data: {
        totalIncome,
        totalExpense,
        balance,
        transactionCount: txs.length,
        categoryBreakdown: categoryData,
      },
    };
  },

  async get_transactions() {
    const store = getFinanceState();
    const state = store.getState();

    return {
      success: true,
      data: {
        transactions: state.transactions,
        count: state.transactions.length,
      },
    };
  },
};

export function registerFinanceActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterFinanceActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}
