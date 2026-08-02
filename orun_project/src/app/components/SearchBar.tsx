import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Pesquisar...",
  debounceMs = 300,
  onClear,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (localValue !== value) onChange(localValue);
    }, debounceMs);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [localValue, debounceMs]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleClear() {
    setLocalValue("");
    onChange("");
    onClear?.();
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors"
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
      }}
    >
      <Search size={12} style={{ color: "var(--muted-foreground)", opacity: 0.6 }} />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-xs outline-none"
        style={{
          fontFamily: "'Inter', sans-serif",
          color: "var(--foreground)",
        }}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="p-0.5 rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
