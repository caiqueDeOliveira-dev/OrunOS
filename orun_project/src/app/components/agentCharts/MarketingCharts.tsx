import { Megaphone } from "lucide-react";

export function MarketingCharts({ accent }: { accent: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FED7E2", backdropFilter: "blur(10px)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Megaphone size={14} style={{ color: accent }} />
        <div className="text-xs font-medium" style={{ color: accent }}>Marketing Digital</div>
      </div>
      <div className="text-[11px]" style={{ color: "#718096" }}>
        Use o chat para criar campanhas, posts e conteudo. Os dados serao registrados automaticamente.
      </div>
    </div>
  );
}
