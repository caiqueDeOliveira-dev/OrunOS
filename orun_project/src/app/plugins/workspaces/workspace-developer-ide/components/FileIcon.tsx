export function FileIcon({ name, size = 14 }: { name: string; size?: number }) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const color = getIconColor(ext);
  const s = size;

  switch (ext) {
    case "ts":
    case "tsx":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#3178C6"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">TS</text></svg>;
    case "js":
    case "jsx":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#F7DF1E"/><text x="12" y="16" textAnchor="middle" fill="#000" fontSize="11" fontWeight="bold" fontFamily="sans-serif">JS</text></svg>;
    case "py":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#3776AB"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Py</text></svg>;
    case "html":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#E34F26"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">H</text></svg>;
    case "css":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#1572B6"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">C</text></svg>;
    case "json":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#5C5C5C"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">{ }</text></svg>;
    case "md":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#083344"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">M</text></svg>;
    case "yml":
    case "yaml":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#6B4226"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">Y</text></svg>;
    case "sh":
    case "bash":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#4EAA25"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">$</text></svg>;
    case "sql":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#CC2927"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">S</text></svg>;
    case "go":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#00ADD8"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Go</text></svg>;
    case "rs":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#DEA584"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Rs</text></svg>;
    case "java":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#ED8B00"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">J</text></svg>;
    case "dockerfile":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#2496ED"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">D</text></svg>;
    case "gitignore":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" fill="#F05032"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">G</text></svg>;
    default:
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M3 8h18M3 12h18M3 16h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
  }
}

function getIconColor(ext: string): string {
  const colors: Record<string, string> = {
    ts: "#3178C6", tsx: "#3178C6", js: "#F7DF1E", jsx: "#F7DF1E",
    py: "#3776AB", html: "#E34F26", css: "#1572B6", json: "#5C5C5C",
    md: "#083344", yml: "#6B4226", yaml: "#6B4226", sh: "#4EAA25",
    bash: "#4EAA25", sql: "#CC2927", go: "#00ADD8", rs: "#DEA584",
    java: "#ED8B00", dockerfile: "#2496ED", gitignore: "#F05032",
  };
  return colors[ext] || "var(--muted-foreground)";
}
