// plugins/workspaces/workspace-orun-code/components/GitHubPanel.tsx
// GitHub Control Center — Fase 1. Token nunca transita pelo renderer além do
// momento do login (é enviado uma única vez ao main, que o guarda no keychain).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Github,
  Unplug,
  RefreshCw,
  Search,
  Trash2,
  Lock,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Share,
  AlertTriangle,
  Star,
  GitFork,
  Globe,
  Check,
  Activity,
  Archive,
  ArchiveRestore,
  ListFilter,
} from "lucide-react";
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";
import type { GitHubRepo } from "../types";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3572A5",
  Java: "#B07219",
  Go: "#00ADD8",
  Rust: "#DEA584",
  "C++": "#F34B7D",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB",
  HTML: "#E34C26",
  CSS: "#563D7C",
  Shell: "#89E051",
  Lua: "#000080",
};

const SEV_COLOR: Record<string, string> = { high: OC.error, medium: OC.alert, low: OC.info, info: OC.dim };

function langColor(lang: string | null): string {
  if (!lang) return OC.dim;
  return LANG_COLORS[lang] || OC.info;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Avatar({ url, login, size = 18 }: { url: string | null; login: string; size?: number }) {
  if (!url) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-semibold"
        style={{ width: size, height: size, background: OC.card3, color: OC.sub, fontSize: size * 0.5 }}
      >
        {login.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={login}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
    />
  );
}

export function GitHubPanel() {
  const setState = useOrunCodeStore.setState;
  const auth = useOrunCodeStore((s) => s.githubAuth);
  const repos = useOrunCodeStore((s) => s.githubRepos);
  const reposLoading = useOrunCodeStore((s) => s.githubReposLoading);
  const filter = useOrunCodeStore((s) => s.githubReposFilter);
  const error = useOrunCodeStore((s) => s.githubError);
  const deleteTarget = useOrunCodeStore((s) => s.githubDeleteTarget);
  const notice = useOrunCodeStore((s) => s.githubNotice);
  const gitBusy = useOrunCodeStore((s) => s.githubGitBusy);
  const gitResult = useOrunCodeStore((s) => s.githubGitResult);
  const gitBranch = useOrunCodeStore((s) => s.githubGitBranch);
  const doctorTab = useOrunCodeStore((s) => s.githubDoctorTab);
  const doctorReport = useOrunCodeStore((s) => s.githubDoctorReport);
  const doctorStaleDays = useOrunCodeStore((s) => s.githubDoctorStaleDays);
  const doctorLoading = useOrunCodeStore((s) => s.githubDoctorLoading);

  const connected = !!auth?.connected;

  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [workspaceHasGit, setWorkspaceHasGit] = useState(false);
  const [cloneRepo, setCloneRepo] = useState<GitHubRepo | null>(null);
  const [pendingArchiveFull, setPendingArchiveFull] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const cur = useOrunCodeStore.getState().githubAuth;
    setState({ githubAuth: { checking: true, connected: cur?.connected ?? false, user: cur?.user ?? null } });
    try {
      const res = await window.orun.github.status();
      setState({ githubAuth: { checking: false, connected: res.connected, user: res.user || null }, githubError: res.error || null });
    } catch {
      setState({ githubAuth: { checking: false, connected: false, user: null } });
    }
  }, [setState]);

  const loadRepos = useCallback(async () => {
    setState({ githubReposLoading: true });
    try {
      const res = await window.orun.github.listRepos({ sort: "pushed", perPage: 100 });
      if (res.ok) {
        setState({ githubRepos: res.repos || [], githubReposLoading: false, githubError: null });
      } else {
        setState({ githubReposLoading: false, githubError: res.error || "Falha ao carregar repositórios." });
      }
    } catch {
      setState({ githubReposLoading: false, githubError: "Falha ao carregar repositórios." });
    }
  }, [setState]);

  useEffect(() => {
    checkAuth();
    (async () => {
      try {
        const ws = await window.orun?.developer?.getWorkspace?.();
        setWorkspacePath(ws || "");
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connected) loadRepos();
  }, [connected, loadRepos]);

  useEffect(() => {
    if (!workspacePath) { setWorkspaceHasGit(false); return; }
    window.orun.developer.gitStatus(workspacePath).then((s) => {
      const inner = s.status as { ok?: boolean } | undefined;
      setWorkspaceHasGit(!!s && !!s.ok && inner?.ok === true);
    }).catch(() => setWorkspaceHasGit(false));
  }, [workspacePath]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.language || "").toLowerCase().includes(q)
    );
  }, [repos, filter]);

  const user = auth?.user || null;

  const runDoctor = useCallback(async (days?: number) => {
    const d = days ?? useOrunCodeStore.getState().githubDoctorStaleDays;
    setState({ githubDoctorLoading: true, githubDoctorStaleDays: d, githubError: null });
    try {
      const res = await window.orun.github.doctor(d);
      if (res.ok && res.counts && res.rows) {
        setState({ githubDoctorReport: {
          generatedAt: res.generatedAt || new Date().toISOString(),
          staleDays: res.staleDays ?? d,
          rows: res.rows,
          counts: res.counts,
          empty: res.empty || [],
          stale: res.stale || [],
          attention: res.attention || [],
          archived: res.archived || [],
        }, githubDoctorLoading: false });
      } else {
        setState({ githubDoctorLoading: false, githubError: res.error || "Falha no diagnóstico." });
      }
    } catch {
      setState({ githubDoctorLoading: false, githubError: "Falha no diagnóstico." });
    }
  }, [setState]);

  useEffect(() => {
    if (connected && doctorTab === "doctor" && !doctorReport) runDoctor();
  }, [connected, doctorTab, doctorReport, runDoctor]);

  const handleArchive = async (repo: GitHubRepo, archived: boolean) => {
    setBusy(true);
    setState({ githubError: null, githubNotice: null });
    const res = await window.orun.github.updateRepo(repo.owner || "", repo.name, { archived });
    setBusy(false);
    if (res.ok) {
      setState({ githubNotice: archived ? `${repo.fullName} arquivado.` : `${repo.fullName} reativado.` });
      runDoctor();
      loadRepos();
    } else {
      setState({ githubError: res.error || "Não foi possível atualizar o repositório." });
    }
  };

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setBusy(true);
    setState({ githubError: null });
    try {
      const res = await window.orun.github.connect(tokenInput.trim());
      if (res.ok && res.user) {
        setState({ githubAuth: { checking: false, connected: true, user: res.user } });
        setTokenInput("");
        loadRepos();
      } else {
        setState({ githubError: res.error || "Não foi possível conectar." });
      }
    } catch {
      setState({ githubError: "Não foi possível conectar." });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    await window.orun.github.disconnect();
    setState({ githubAuth: { checking: false, connected: false, user: null }, githubRepos: [] });
  };

  const beginDelete = (repo: GitHubRepo) => {
    setConfirmValue("");
    setState({ githubDeleteTarget: repo, githubError: null });
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setState({ githubError: null, githubNotice: null });
    const res = await window.orun.github.deleteRepo(deleteTarget.owner || "", deleteTarget.name, confirmValue);
    setBusy(false);
    if (res.ok) {
      const full = deleteTarget.fullName;
      const empties = useOrunCodeStore.getState().githubDoctorReport?.empty?.slice() || [];
      const idx = empties.findIndex((r) => r.repo.fullName === full);
      const next = empties[idx + 1];
      setState({
        githubDeleteTarget: null,
        githubRepos: useOrunCodeStore.getState().githubRepos.filter((r) => r.fullName !== full),
        githubNotice: `Repositório ${full} excluído com sucesso.`,
      });
      if (next) {
        setTimeout(() => beginDelete(next.repo), 80);
      } else {
        runDoctor();
      }
    } else {
      setState({ githubError: res.error || "Não foi possível excluir o repositório." });
    }
    setConfirmValue("");
  };

  const runGit = async (op: "fetch" | "pull" | "push") => {
    if (!workspacePath) return;
    setState({ githubGitBusy: true, githubGitResult: null, githubNotice: null });
    try {
      const res =
        op === "fetch" ? await window.orun.github.fetch(workspacePath) :
        op === "pull" ? await window.orun.github.pull(workspacePath, gitBranch || undefined) :
        await window.orun.github.push(workspacePath, gitBranch || undefined);
      const detail = (res as { message?: string; output?: string }).message || (res as { output?: string }).output || "";
      setState({ githubGitBusy: false, githubGitResult: res.ok ? `ok — ${detail || (op.charAt(0).toUpperCase() + op.slice(1)) + " concluído."}` : `erro — ${res.error}` });
    } catch {
      setState({ githubGitBusy: false, githubGitResult: "erro — falha inesperada" });
    }
  };

  const performClone = async () => {
    if (!cloneRepo || !workspacePath) return;
    setState({ githubGitBusy: true, githubGitResult: null });
    const dest = workspacePath + "\\" + cloneRepo.name;
    try {
      const res = await window.orun.github.clone(cloneRepo.htmlUrl || cloneRepo.fullName, dest);
      setState({
        githubGitBusy: false,
        githubGitResult: res.ok ? `ok — clonado em ${dest}` : `erro — ${res.error}`,
        githubNotice: res.ok ? `Clonado ${cloneRepo.fullName}` : null,
      });
      if (res.ok) setCloneRepo(null);
    } catch {
      setState({ githubGitBusy: false, githubGitResult: "erro — falha inesperada" });
    }
  };

  const canNotice = notice && !error;

  return (
    <div className="relative flex flex-col h-full">
      {/* ── Cabeçalho ── */}
      <div className="px-3 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: OC.border }}>
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: OC.dim }}>
          GitHub Control Center
        </span>
        {connected && (
          <button
            onClick={handleDisconnect}
            title="Desconectar"
            className="p-1 rounded-md"
            style={{ color: OC.sub }}
          >
            <Unplug size={12} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto oc-scroll px-3 py-2.5 space-y-2.5">
        {canNotice && (
          <div className="px-2.5 py-1.5 rounded-lg text-[10px]" style={{ background: `${OC.success}1A`, color: OC.success, border: `1px solid ${OC.success}40` }}>
            {notice}
          </div>
        )}
        {error && (
          <div className="px-2.5 py-1.5 rounded-lg text-[10px] leading-relaxed" style={{ background: `${OC.error}1A`, color: OC.error, border: `1px solid ${OC.error}40` }}>
            {error}
          </div>
        )}

        {/* ── Conexão ── */}
        {!connected ? (
          <div className="p-3 rounded-xl space-y-2.5" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
            <div className="flex items-start gap-2">
              <Github size={14} style={{ color: OC.text }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold" style={{ color: OC.text }}>Conectar ao GitHub</p>
                <p className="text-[9.5px] leading-relaxed mt-1" style={{ color: OC.dim }}>
                  Use um <b style={{ color: OC.sub }}>token com escopo minimal</b> (
                  <code style={{ color: OC.info }}>repo</code> para listar/excluir seus repositórios; <code style={{ color: OC.info }}>public_repo</code> basta para repositórios públicos). O token fica no keychain do sistema — nada destrutivo acontece sem sua confirmação digitando o nome do repositório.
                </p>
              </div>
            </div>
            <div className="flex items-stretch gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Lock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: OC.dim }} />
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  placeholder="github_pat_… ou ghp_…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-md outline-none text-[10px] font-mono pr-2 pl-8 py-1.5"
                  style={{ background: OC.card2, border: `1px solid ${OC.borderHi}`, color: OC.text }}
                />
              </div>
              <button
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "Ocultar token" : "Ver token"}
                className="px-2 rounded-md text-[9px] font-medium"
                style={{ background: OC.card2, color: OC.dim, border: `1px solid ${OC.borderHi}` }}
              >
                {showToken ? "Ocultar" : "Ver"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={busy || !tokenInput.trim()}
                className="flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1"
                style={{ background: OC.primary, color: "#fff", opacity: busy || !tokenInput.trim() ? 0.5 : 1 }}
              >
                <Github size={11} /> {busy ? "Conectando…" : "Conectar"}
              </button>
              <a
                href="https://github.com/settings/tokens/new?description=Orun+Code&scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-[10px] font-medium"
                style={{ background: OC.card2, color: OC.info, border: `1px solid ${OC.borderHi}` }}
              >
                Criar token
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
            <Avatar url={user?.avatarUrl || null} login={user?.login || "?"} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold truncate" style={{ color: OC.text }}>
                {user?.name || user?.login || "Conectado"}
              </p>
              <p className="text-[9px] font-mono" style={{ color: OC.dim }}>@{user?.login}</p>
            </div>
            <button
              onClick={loadRepos}
              disabled={reposLoading}
              title="Atualizar repositórios"
              className="p-1.5 rounded-md"
              style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}
            >
              <RefreshCw size={11} className={reposLoading ? "animate-spin" : ""} />
            </button>
          </div>
        )}

        {/* ── Abas ── */}
        {connected && (
          <div className="flex gap-1">
            {(["repos", "doctor"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setState({ githubDoctorTab: tab, githubError: null })}
                className="flex-1 px-2 py-1.5 rounded-md text-[9px] uppercase tracking-[0.12em] font-semibold"
                style={
                  doctorTab === tab
                    ? { background: `${OC.primary}1A`, color: OC.primaryBright, border: `1px solid ${OC.primary}40` }
                    : { background: OC.card, color: OC.dim, border: `1px solid ${OC.border}` }
                }
              >
                {tab === "repos" ? "Repos" : "Repo Doctor"}
              </button>
            ))}
          </div>
        )}

        {/* ── Lista de repositórios ── */}
        {connected && doctorTab === "repos" && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: OC.dim }} />
                <input
                  value={filter}
                  onChange={(e) => setState({ githubReposFilter: e.target.value })}
                  placeholder="Filtrar repos…"
                  spellCheck={false}
                  className="w-full rounded-md outline-none text-[10px] pl-7 pr-2 py-1.5"
                  style={{ background: OC.card2, border: `1px solid ${OC.borderHi}`, color: OC.text }}
                />
              </div>
              <span className="text-[9px] font-mono shrink-0" style={{ color: OC.dim }}>{filtered.length}/{repos.length}</span>
            </div>

            {reposLoading ? (
              <div className="py-6 text-center text-[10px]" style={{ color: OC.dim }}>Carregando repositórios…</div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-[10px] space-y-1" style={{ color: OC.dim }}>
                <Github size={16} className="mx-auto mb-1 opacity-50" />
                <p>{repos.length === 0 ? "Nenhum repositório neste usuário." : "Nenhum repositório corresponde ao filtro."}</p>
                <p className="text-[9px]">A lista cobre apenas o que o token tem permissão de ver.</p>
              </div>
            ) : (
              filtered.map((repo) => (
                <div
                  key={repo.fullName}
                  className="p-2 rounded-lg space-y-1.5 group"
                  style={{ background: OC.card, border: `1px solid ${OC.border}` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10.5px] font-mono font-semibold truncate" style={{ color: OC.text }}>{repo.fullName}</span>
                    <span className="flex items-center gap-1 ml-auto shrink-0 opacity-70 group-hover:opacity-100">
                      {repo.empty && (
                        <button
                          onClick={() => beginDelete(repo)}
                          title="Excluir (repositório vazio)"
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5"
                          style={{ background: `${OC.alert}1A`, color: OC.alert, border: `1px solid ${OC.alert}40` }}
                        >
                          <Trash2 size={8} /> VAZIO
                        </button>
                      )}
                      {!repo.empty && repo.archived && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: `${OC.card3}`, color: OC.dim }}>ARQUIVADO</span>
                      )}
                    </span>
                  </div>

                  {repo.description && (
                    <p className="text-[9.5px] leading-relaxed" style={{ color: OC.sub }}>{repo.description}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap text-[8.5px]">
                    <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: `${langColor(repo.language)}1A`, color: langColor(repo.language) }}>
                      {repo.language || "—"}
                    </span>
                    {repo.privateRepo && (
                      <span className="flex items-center gap-0.5" style={{ color: OC.dim }}><Lock size={8} /> privado</span>
                    )}
                    {repo.fork && (
                      <span className="flex items-center gap-0.5" style={{ color: OC.dim }}><GitFork size={8} /> fork</span>
                    )}
                    {repo.stars > 0 && (
                      <span className="flex items-center gap-0.5" style={{ color: OC.alert }}><Star size={8} /> {repo.stars}</span>
                    )}
                    <span style={{ color: OC.dim }}>{timeAgo(repo.pushedAt)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => beginDelete(repo)}
                      title={`Excluir ${repo.fullName} (irreversível)`}
                      className="flex-1 px-2 py-1 rounded-md text-[8.5px] font-medium"
                      style={{ background: `${OC.error}14`, color: OC.error, border: `1px solid ${OC.error}30` }}
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setCloneRepo(cloneRepo?.fullName === repo.fullName ? null : repo)}
                      className="flex-1 px-2 py-1 rounded-md text-[8.5px] font-medium"
                      style={{ background: OC.card2, color: OC.info, border: `1px solid ${OC.borderHi}` }}
                    >
                      Clonar
                    </button>
                    {repo.htmlUrl && (
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir no GitHub"
                        className="p-1.5 rounded-md"
                        style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}
                      >
                        <Globe size={10} />
                      </a>
                    )}
                  </div>

                  {cloneRepo?.fullName === repo.fullName && workspaceHasGit && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <input
                        value={workspacePath + "\\" + repo.name}
                        disabled
                        spellCheck={false}
                        className="flex-1 min-w-0 rounded-md text-[8.5px] font-mono px-2 py-1 outline-none"
                        style={{ background: OC.card2, border: `1px solid ${OC.border}`, color: OC.dim }}
                      />
                      <button
                        onClick={performClone}
                        disabled={gitBusy}
                        className="px-2 py-1 rounded-md text-[8.5px] font-semibold flex items-center gap-1"
                        style={{ background: OC.primary, color: "#fff", opacity: gitBusy ? 0.5 : 1 }}
                      >
                        <Download size={9} /> Clonar
                      </button>
                    </div>
                  )}
                  {cloneRepo?.fullName === repo.fullName && !workspaceHasGit && (
                    <p className="text-[8.5px]" style={{ color: OC.dim }}>
                      Desative o Orun Code ou não há workspace configurado para receber o clone.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Repo Doctor ── */}
        {connected && doctorTab === "doctor" && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl space-y-2" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
              <div className="flex items-center gap-2">
                <Activity size={13} style={{ color: doctorReport && (doctorReport.counts.empty > 0 || doctorReport.counts.stale > 0) ? OC.alert : OC.success }} />
                <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: OC.dim }}>Saúde dos repositórios</span>
                <button
                  onClick={() => runDoctor(doctorStaleDays)}
                  disabled={doctorLoading}
                  className="ml-auto px-2 py-1 rounded-md text-[8.5px] font-semibold"
                  style={{ background: OC.primary, color: "#fff", opacity: doctorLoading ? 0.5 : 1 }}
                >
                  {doctorLoading ? "Analisando…" : "Reanalisar"}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8.5px]" style={{ color: OC.dim }}>Inativo há</span>
                <input
                  type="number"
                  min={1}
                  max={1095}
                  value={doctorStaleDays || ""}
                  onChange={(e) => runDoctor(Number(e.target.value))}
                  disabled={doctorLoading}
                  spellCheck={false}
                  className="w-14 rounded-md text-[9.5px] font-mono px-1.5 py-0.5 outline-none text-center"
                  style={{ background: OC.card2, border: `1px solid ${OC.borderHi}`, color: OC.text }}
                />
                <span className="text-[8.5px]" style={{ color: OC.dim }}>dias → arquivar</span>
              </div>

              {doctorReport && !doctorLoading && (
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: "Vazios", n: doctorReport.counts.empty, color: OC.error },
                    { label: "Arquiváveis", n: doctorReport.counts.stale, color: OC.alert },
                    { label: "Atenção", n: doctorReport.counts.attention, color: OC.info },
                    { label: "Arquivados", n: doctorReport.counts.archived, color: OC.dim },
                    { label: "Verificados", n: doctorReport.counts.checked, color: OC.success },
                  ].map((c) => (
                    <span key={c.label} className="px-1.5 py-0.5 rounded text-[8px] font-mono" style={{ background: `${c.color}1A`, color: c.color }}>
                      {c.n} {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {doctorLoading ? (
              <div className="py-4 text-center text-[9.5px]" style={{ color: OC.dim }}>Consultando branches em paralelo…</div>
            ) : !doctorReport ? (
              <div className="py-4 text-center text-[9.5px] space-y-1" style={{ color: OC.dim }}>
                <Activity size={15} className="mx-auto mb-1 opacity-50" />
                <p>Clique em <b style={{ color: OC.sub }}>Reanalisar</b> para diagnosticar seus repositórios.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {doctorReport.counts.empty === 0 && doctorReport.counts.stale === 0 && doctorReport.counts.attention === 0 && (
                  <div className="p-2.5 rounded-lg text-[10px]" style={{ background: `${OC.success}14`, color: OC.success, border: `1px solid ${OC.success}30` }}>
                    Todos os {doctorReport.counts.checked} repositórios estão saudáveis.
                  </div>
                )}

                {doctorReport.empty.map((row) => (
                  <div key={row.repo.fullName} className="p-2 rounded-lg space-y-1.5" style={{ background: OC.card, border: `1px solid ${OC.error}40` }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono font-semibold truncate" style={{ color: OC.text }}>{row.repo.fullName}</span>
                      <span className="ml-auto shrink-0 px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: `${OC.error}1A`, color: OC.error }}>EXCLUIR</span>
                    </div>
                    {row.issues.map((i) => (
                      <p key={i.code} className="text-[9px] leading-relaxed" style={{ color: SEV_COLOR[i.severity] }}>• {i.label}</p>
                    ))}
                    <button
                      onClick={() => beginDelete(row.repo)}
                      className="w-full px-2 py-1 rounded-md text-[8.5px] font-semibold flex items-center justify-center gap-1"
                      style={{ background: `${OC.error}18`, color: OC.error, border: `1px solid ${OC.error}40` }}
                    >
                      <Trash2 size={9} /> Excluir vazio
                    </button>
                  </div>
                ))}

                {doctorReport.stale.map((row) => (
                  <div key={row.repo.fullName} className="p-2 rounded-lg space-y-1.5" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono font-semibold truncate" style={{ color: OC.text }}>{row.repo.fullName}</span>
                      <span className="ml-auto shrink-0 px-1 py-0.5 rounded text-[8px]" style={{ background: `${OC.alert}14`, color: OC.alert }}>OBSOLETO</span>
                    </div>
                    {row.issues.map((i) => (
                      <p key={i.code} className="text-[9px] flex items-center gap-1" style={{ color: SEV_COLOR[i.severity] }}>
                        <ListFilter size={8} /> {i.label}
                      </p>
                    ))}
                    {pendingArchiveFull === row.repo.fullName ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleArchive(row.repo, true)}
                          disabled={busy}
                          className="flex-1 px-2 py-1 rounded-md text-[8.5px] font-semibold"
                          style={{ background: OC.primary, color: "#fff", opacity: busy ? 0.5 : 1 }}
                        >
                          Confirmar arquivar
                        </button>
                        <button
                          onClick={() => setPendingArchiveFull(null)}
                          className="flex-1 px-2 py-1 rounded-md text-[8.5px] font-medium"
                          style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPendingArchiveFull(row.repo.fullName)}
                        className="w-full px-2 py-1 rounded-md text-[8.5px] font-semibold flex items-center justify-center gap-1"
                        style={{ background: `${OC.alert}14`, color: OC.alert, border: `1px solid ${OC.alert}40` }}
                      >
                        <Archive size={9} /> Arquivar (read-only)
                      </button>
                    )}
                  </div>
                ))}

                {doctorReport.attention.map((row) => (
                  <div key={row.repo.fullName} className="p-2 rounded-lg space-y-1" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono font-semibold truncate" style={{ color: OC.text }}>{row.repo.fullName}</span>
                      <span className="ml-auto shrink-0 px-1 py-0.5 rounded text-[8px]" style={{ background: `${OC.info}14`, color: OC.info }}>ATENÇÃO</span>
                    </div>
                    {row.issues.map((i) => (
                      <p key={i.code} className="text-[9px]" style={{ color: SEV_COLOR[i.severity] }}>• {i.label}</p>
                    ))}
                  </div>
                ))}

                {doctorReport.archived.map((row) => (
                  <div key={row.repo.fullName} className="p-2 rounded-lg space-y-1" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono truncate" style={{ color: OC.dim }}>{row.repo.fullName}</span>
                      <button
                        onClick={() => handleArchive(row.repo, false)}
                        disabled={busy}
                        className="ml-auto shrink-0 px-2 py-0.5 rounded-md text-[8px] font-medium flex items-center gap-1"
                        style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}`, opacity: busy ? 0.5 : 1 }}
                      >
                        <ArchiveRestore size={8} /> Reativar
                      </button>
                    </div>
                    <p className="text-[8.5px]" style={{ color: OC.dim }}>Arquivado — read-only. Reative se voltar a usá-lo.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Git operations (push/fetch/pull) ── */}
        {connected && workspacePath && (
          <div className="p-2.5 rounded-xl space-y-1.5" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
            <div className="flex items-center gap-1.5">
              <Share size={11} style={{ color: OC.info }} />
              <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: OC.dim }}>Git remoto</span>
            </div>
            <p className="text-[8.5px] font-mono truncate" title={workspacePath} style={{ color: OC.dim }}>{workspacePath}</p>
            <div className="flex items-center gap-1.5">
              <input
                value={gitBranch}
                onChange={(e) => setState({ githubGitBranch: e.target.value })}
                placeholder="branch (ex.: main)"
                spellCheck={false}
                className="flex-1 min-w-0 rounded-md text-[9.5px] font-mono px-2 py-1.5 outline-none"
                style={{ background: OC.card2, border: `1px solid ${OC.borderHi}`, color: OC.text }}
              />
              <button
                onClick={() => runGit("fetch")}
                disabled={gitBusy}
                title="git fetch (com token injetado no ambiente)"
                className="px-2 py-1.5 rounded-md flex items-center gap-1 text-[8.5px] font-medium"
                style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}`, opacity: gitBusy ? 0.5 : 1 }}
              >
                <RefreshCw size={9} /> Fetch
              </button>
              <button
                onClick={() => runGit("pull")}
                disabled={gitBusy}
                title="git pull --ff-only"
                className="px-2 py-1.5 rounded-md flex items-center gap-1 text-[8.5px] font-medium"
                style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}`, opacity: gitBusy ? 0.5 : 1 }}
              >
                <ArrowDownCircle size={9} /> Pull
              </button>
              <button
                onClick={() => runGit("push")}
                disabled={gitBusy}
                title="git push (requer sua ação; nunca automático)"
                className="px-2 py-1.5 rounded-md flex items-center gap-1 text-[8.5px] font-semibold"
                style={{ background: `${OC.success}1A`, color: OC.success, border: `1px solid ${OC.success}40`, opacity: gitBusy ? 0.5 : 1 }}
              >
                <ArrowUpCircle size={9} /> Push
              </button>
            </div>
            {gitResult && (
              <p className="text-[8.5px] font-mono leading-relaxed break-words" style={{ color: gitResult.startsWith("ok") ? OC.success : OC.error }}>
                {gitResult}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Confirmação de exclusão (BLOCK — exige digitar o nome exato) ── */}
      {deleteTarget && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: "rgba(5,6,8,0.82)" }}
        >
          <div className="w-[320px] max-w-[90%] p-4 rounded-xl space-y-3" style={{ background: OC.card, border: `1px solid ${OC.error}60`, boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} style={{ color: OC.error }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-[11.5px] font-semibold" style={{ color: OC.text }}>Excluir repositório</p>
                <p className="text-[9.5px] leading-relaxed mt-0.5" style={{ color: OC.sub }}>
                  Isso é <b style={{ color: OC.error }}>irreversível</b>. Para confirmar, digite exatamente{" "}
                  <code style={{ color: OC.text, fontFamily: OC.mono }}>{deleteTarget.fullName}</code>.
                </p>
              </div>
            </div>
            <input
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmValue === deleteTarget.fullName && performDelete()}
              placeholder={deleteTarget.fullName}
              spellCheck={false}
              autoFocus
              className="w-full rounded-md text-[10px] font-mono px-2.5 py-1.5 outline-none"
              style={{ background: OC.card2, border: `1px solid ${confirmValue === deleteTarget.fullName ? OC.error : OC.borderHi}`, color: OC.text }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setState({ githubDeleteTarget: null })}
                className="flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium"
                style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}
              >
                Cancelar
              </button>
              <button
                onClick={performDelete}
                disabled={confirmValue !== deleteTarget.fullName || busy}
                className="flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1"
                style={{ background: OC.error, color: "#fff", opacity: confirmValue !== deleteTarget.fullName || busy ? 0.45 : 1 }}
              >
                {busy ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                Excluir {deleteTarget.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}