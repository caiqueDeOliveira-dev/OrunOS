interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  className?: string;
  monospace?: boolean;
  type?: string;
}

export function WorkspaceInput({ value, onChange, placeholder, onKeyDown, autoFocus, className = "", monospace, type = "text" }: Props) {
  const cls = `ws-input ${monospace ? "font-mono" : ""} ${className}`;
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      className={cls}
    />
  );
}
