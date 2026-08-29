// electron/__tests__/neural-autocapture.test.cjs
const {
  buildCuratorMessages,
  parseCuratorNotes,
  buildTranscript,
  createAutoCapturer,
} = require("../neural-autocapture.cjs");

describe("buildCuratorMessages", () => {
  it("inclui transcrição e títulos existentes", () => {
    const msgs = buildCuratorMessages("Usuário: oi\n\nAssistente: olá", ["Decisão X", "Ideia Y"]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].content).toContain("Decisão X");
    expect(msgs[1].content).toContain("Ideia Y");
    expect(msgs[1].content).toContain("Usuário: oi");
  });

  it("funciona sem notas existentes", () => {
    const msgs = buildCuratorMessages("conteúdo", []);
    expect(msgs[1].content).toContain("(nenhuma ainda)");
  });
});

describe("parseCuratorNotes", () => {
  it("extrai array JSON simples", () => {
    const notes = parseCuratorNotes('[{"title":"Padrão Repository","content":"Usamos repository pattern no projeto para isolar acesso a dados.","tags":["arquitetura"]}]');
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("Padrão Repository");
    expect(notes[0].tags).toEqual(["arquitetura"]);
  });

  it("extrai JSON dentro de code fence", () => {
    const notes = parseCuratorNotes('```json\n[{"title":"Ferramenta ABC","content":"Ferramenta XYZ serve para automação de builds diários."}]\n```');
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("Ferramenta ABC");
  });

  it("tolera texto ao redor do JSON", () => {
    const notes = parseCuratorNotes('Claro! Aqui estão:\n[{"title":"Nota Válida","content":"Conteúdo suficientemente longo para passar na validação."}]\nQualquer coisa.');
    expect(notes).toHaveLength(1);
  });

  it("retorna [] para conversa trivial", () => {
    expect(parseCuratorNotes("[]")).toEqual([]);
  });

  it("retorna null quando não há JSON de array", () => {
    expect(parseCuratorNotes("nada digno de registro")).toBeNull();
    expect(parseCuratorNotes('{"title": "objeto solto"}')).toBeNull();
    expect(parseCuratorNotes(null)).toBeNull();
  });

  it("filtra notas inválidas (título curto / conteúdo curto)", () => {
    const notes = parseCuratorNotes('[{"title":"ok","content":"curto demais"},{"title":"Boa Nota","content":"conteúdo válido e longo o bastante para passar."}]');
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("Boa Nota");
  });

  it("limita a 5 notas", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `Nota ${i}`, content: "conteúdo suficientemente longo para validação." }));
    expect(parseCuratorNotes(JSON.stringify(many))).toHaveLength(5);
  });

  it("normaliza tags e descarta não-strings", () => {
    const notes = parseCuratorNotes('[{"title":"Com Tags","content":"conteúdo válido e longo o suficiente aqui.","tags":["Dev","  ",42,"api"]}]');
    expect(notes[0].tags).toEqual(["dev", "api"]);
  });
});

describe("buildTranscript", () => {
  it("mapeia hampton→Assistente e user→Usuário", () => {
    const t = buildTranscript([
      { role: "user", content: "oi" },
      { role: "hampton", content: "olá" },
      { role: "system", content: "ignorado" },
    ]);
    expect(t).toContain("Usuário: oi");
    expect(t).toContain("Assistente: olá");
    expect(t).not.toContain("ignorado");
  });

  it("trunca transcrições gigantes", () => {
    const big = Array.from({ length: 2000 }, (_, i) => ({ role: "user", content: `linha ${i} com texto razoável` }));
    expect(buildTranscript(big).length).toBeLessThanOrEqual(12000 + 2000 * 8);
  });
});

function makeDeps(replyText, existingTitles = []) {
  const saved = [];
  return {
    deps: {
      routeChat: async () => ({ text: replyText }),
      getSettings: () => ({ provider: "groq", model: "openai/gpt-oss-120b" }),
      readApiKey: () => "key",
      saveNote: async (note) => { saved.push(note); },
      listNoteTitles: async () => existingTitles,
      log: () => {},
    },
    saved,
  };
}

describe("createAutoCapturer.handle", () => {
  const convoPayload = {
    conversationId: "c1",
    transcript: Array.from({ length: 6 }, (_, i) => `Mensagem ${i} com conteúdo relevante sobre o projeto`).join("\n\n"),
  };

  it("salva notas da resposta do LLM", async () => {
    const { deps, saved } = makeDeps('[{"title":"Escolha de Banco","content":"Decidimos usar SQLite local com sync Supabase eventual.","tags":["decisão"]}]');
    const cap = createAutoCapturer(deps);
    const res = await cap.handle(convoPayload);
    expect(res.ok).toBe(true);
    expect(res.saved).toBe(1);
    expect(saved[0].title).toBe("Escolha de Banco");
  });

  it("não duplica nota com título existente", async () => {
    const { deps } = makeDeps('[{"title":"Escolha de Banco","content":"Tentativa duplicada que não deve gerar segunda nota."}]', ["escolha de banco"]);
    const cap = createAutoCapturer(deps);
    const res = await cap.handle(convoPayload);
    expect(res.saved).toBe(0);
  });

  it("conversa trivial → 0 notas salvas", async () => {
    const { deps } = makeDeps("[]");
    const cap = createAutoCapturer(deps);
    const res = await cap.handle(convoPayload);
    expect(res.saved).toBe(0);
  });

  it("resposta ilegível → parseError true, nada salvo", async () => {
    const { deps } = makeDeps("sem json aqui");
    const cap = createAutoCapturer(deps);
    const res = await cap.handle(convoPayload);
    expect(res.parseError).toBe(true);
    expect(res.saved).toBe(0);
  });

  it("sem api key → skipped", async () => {
    const { deps } = makeDeps("[]");
    deps.readApiKey = () => null;
    const cap = createAutoCapturer(deps);
    const res = await cap.handle(convoPayload);
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe("no-api-key");
  });
});

describe("shouldAttempt (gate)", () => {
  it("rejeita sem conversationId", () => {
    const cap = createAutoCapturer({ routeChat: async () => ({}), getSettings: () => ({}), readApiKey: () => "k", saveNote: async () => {}, listNoteTitles: async () => [], log: () => {} });
    expect(cap.shouldAttempt({ conversationId: null, transcript: "x".repeat(500) }).reason).toBe("no-conversation");
  });

  it("rejeita transcript curto", () => {
    const cap = createAutoCapturer({ routeChat: async () => ({}), getSettings: () => ({}), readApiKey: () => "k", saveNote: async () => {}, listNoteTitles: async () => [], log: () => {} });
    expect(cap.shouldAttempt({ conversationId: "c", transcript: "muito curto" }).reason).toBe("transcript-too-short");
  });

  it("aplica throttle por conversa", () => {
    const cap = createAutoCapturer({ routeChat: async () => ({}), getSettings: () => ({}), readApiKey: () => "k", saveNote: async () => {}, listNoteTitles: async () => [], log: () => {} });
    const now = Date.now();
    const payload = { conversationId: "c2", transcript: "x".repeat(500) };
    expect(cap.shouldAttempt(payload, now).ok).toBe(true);
    expect(cap.shouldAttempt(payload, now + 60_000).reason).toBe("throttled");
    expect(cap.shouldAttempt(payload, now + 11 * 60_000).ok).toBe(true);
  });
});
