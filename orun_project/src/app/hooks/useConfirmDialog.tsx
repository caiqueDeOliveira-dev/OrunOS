import { useState, useCallback } from "react";

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel?: () => void;
}

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmDialogOptions | null>(null);

  const confirm = useCallback((opts: ConfirmDialogOptions) => {
    setDialog(opts);
  }, []);

  const handleConfirm = useCallback(() => {
    dialog?.onConfirm();
    setDialog(null);
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog?.onCancel?.();
    setDialog(null);
  }, [dialog]);

  const dialogElement = dialog ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-6 space-y-4"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}
          >
            {dialog.title}
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)" }}
          >
            {dialog.message}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors hover:opacity-80"
            style={{
              fontFamily: "'Sora', sans-serif",
              background: "var(--background)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {dialog.cancelLabel || "Cancelar"}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors hover:opacity-90"
            style={{
              fontFamily: "'Sora', sans-serif",
              background:
                dialog.variant === "danger"
                  ? "#C00018"
                  : dialog.variant === "warning"
                  ? "#F59E0B"
                  : "#1E40AF",
              color: "#fff",
            }}
          >
            {dialog.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialogElement, handleCancel };
}
