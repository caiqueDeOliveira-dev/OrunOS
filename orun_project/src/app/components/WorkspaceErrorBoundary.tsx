import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WorkspaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    this.props.onError?.(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex-1 flex items-center justify-center p-8"
          style={{ background: "var(--background)" }}
        >
          <div className="text-center max-w-md space-y-4">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(234,179,8,0.1)" }}
            >
              <AlertTriangle size={32} style={{ color: "#EAB308" }} />
            </div>

            <div className="space-y-1">
              <h3
                className="text-sm font-medium"
                style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}
              >
                Workspace Error
              </h3>
              <p
                className="text-xs"
                style={{ fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)" }}
              >
                This workspace encountered an unexpected error.
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
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: "#C00018",
                color: "white",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
