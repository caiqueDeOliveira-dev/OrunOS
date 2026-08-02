let activeAgent: string | null = null;

export function setActiveAgentStore(agent: string | null) {
  activeAgent = agent;
}

export function getActiveAgentStore(): string | null {
  return activeAgent;
}
