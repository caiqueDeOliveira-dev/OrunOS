// plugins/PluginErrorBoundary.tsx
//
// Error boundary that catches crashes in workspace plugins.
// Prevents a broken plugin from taking down the entire app.
// Shows a friendly error message with a "Restart Plugin" button.

import { Component, type ReactNode } from "react";
import { createPluginLogger } from "./lib/logger";

interface Props {
  pluginId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class PluginErrorBoundary extends Component<Props, State> {
  private log = createPluginLogger(this.props.pluginId);

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    this.log.error("workspace:crash", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo: errorInfo.componentStack ?? null });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.log.info("workspace:restart-after-crash");
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex-1 flex items-center justify-center p-8" style={{ background: "var(--background)" }}>
          <div className="text-center max-w-md space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "rgba(192,0,24,0.1)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C00018" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                Plugin travou
              </h3>
              <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)" }}>
                O plugin "{this.props.pluginId}" encontrou um erro e parou de funcionar.
              </p>
            </div>

            {this.state.error && (
              <div
                className="text-[10px] p-3 rounded-lg text-left overflow-auto max-h-32"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleRestart}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: "#C00018",
                color: "white",
              }}
            >
              Reiniciar Plugin
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
