export function NoCharts({ agent, accent }: { agent: string; accent: string }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,255,255,0.5)", border: `1px solid ${accent}20`, backdropFilter: "blur(10px)" }}>
      <div className="text-[11px]" style={{ color: "#718096" }}>
        {agent === "Automation" && "Configure workflows e automacoes pelo chat."}
        {agent === "System" && "Configure o sistema pelo chat ou painel de Configuracoes."}
        {agent === "Hampton" && "Converse diretamente com a inteligencia central."}
      </div>
    </div>
  );
}
