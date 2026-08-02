import { useEffect } from "react";
import { useIDEStore } from "../developer-store";
import { GitBranch, CheckCircle, Github } from "lucide-react";

export function GitPanel() {
  const gitStatus = useIDEStore((s) => s.gitStatus);

  useEffect(() => {
    const loadGit = async () => {
      try {
        const result = await (window as any).orun?.developer?.["git-status"]?.();
        if (result?.branch) {
          useIDEStore.setState({
            gitStatus: {
              branch: result.branch,
              changes: (result.files || []).filter((f: any) => f.status !== " ").length,
              staged: (result.files || []).filter((f: any) => f.status === "M" || f.status === "A").length,
              files: result.files || [],
            },
          });
        }
      } catch {}
    };
    loadGit();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Source Control
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide py-1">
        {gitStatus ? (
          <div className="px-3 space-y-1">
            <div className="flex items-center gap-2 py-2">
              <GitBranch size={12} style={{ color: "#C00018" }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{gitStatus.branch}</span>
            </div>
            <div className="flex gap-3 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              <span style={{ color: "#22C55E" }}>+{gitStatus.staged} staged</span>
              <span style={{ color: "#F59E0B" }}>~{gitStatus.changes - gitStatus.staged} modified</span>
            </div>
            {gitStatus.files.length > 0 ? (
              <div className="mt-2 space-y-0.5">
                {gitStatus.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-[10px]">
                    <span className="w-4 text-center font-bold" style={{
                      color: f.status === "M" ? "#F59E0B" : f.status === "A" ? "#22C55E" : f.status === "D" ? "#EF4444" : "#8B5CF6",
                    }}>{f.status}</span>
                    <span className="truncate" style={{ color: "var(--foreground)" }}>{f.path}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
                <CheckCircle size={12} className="inline mr-1" style={{ color: "#22C55E" }} />
                No changes
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12">
            <Github size={24} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>No repository</p>
          </div>
        )}
      </div>
    </div>
  );
}
