export function NoCharts({ agent, accent }: { agent: string; accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--muted-foreground)" }}>
      {agent === "System" && "Configure o sistema pelo chat ou painel de Configuracoes."}
      {agent === "Automation" && "Configure automacoes pelo chat ou painel de Automacao."}
      {agent === "Hampton" && "Converse com Hampton pelo chat."}
      {agent === "Personal Assistant" && "Converse com seu assistente pessoal pelo chat ou WhatsApp."}
    </div>
  );
}
