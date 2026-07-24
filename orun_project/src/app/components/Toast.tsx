import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface Toast { id: number; message: string; type: "error" | "success" | "info" | "warning" }

const ToastContext = createContext<{ show: (message: string, type?: Toast["type"]) => void }>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(p => p.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="px-4 py-2 rounded-xl text-xs pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
            style={{
              background: toast.type === "error" ? "rgba(231,76,60,0.9)" : toast.type === "success" ? "rgba(46,204,113,0.9)" : toast.type === "warning" ? "rgba(245,158,11,0.9)" : "rgba(30,30,30,0.95)",
              color: "#F5F5F5",
              fontFamily: "'Inter', sans-serif",
              border: `1px solid ${toast.type === "error" ? "rgba(231,76,60,0.4)" : toast.type === "success" ? "rgba(46,204,113,0.4)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
