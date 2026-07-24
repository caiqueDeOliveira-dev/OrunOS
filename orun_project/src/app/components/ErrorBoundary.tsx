import React from "react";
import { I18nContext } from "../../i18n/I18nProvider";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "var(--background)" }}>
          <div className="text-center">
            <p className="text-sm mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "#C00018" }}>{this.context?.t?.("errorBoundaryMessage") ?? "Something went wrong"}</p>
            <p className="text-[10px] mb-4" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{this.state.error?.message}</p>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} className="px-4 py-2 rounded-lg text-xs" style={{ background: "#C00018", color: "#fff" }}>
              {this.context?.t?.("errorBoundaryReload") ?? "Reload"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
