// electron/__tests__/neural-handlers.test.cjs
const { extractLinks, buildSnapshot } = require("../ipc/neural-handlers.cjs");

describe("neural-handlers", () => {
  it("extractLinks extrai [[wikilinks]] com e sem alias", () => {
    expect(extractLinks("veja [[Nota A]] e [[Nota B|apelido]]")).toEqual(["Nota A", "Nota B"]);
    expect(extractLinks("sem links aqui")).toEqual([]);
    expect(extractLinks(null)).toEqual([]);
  });

  it("buildSnapshot cria nós, edges e resolve fantasmas", () => {
    const records = [
      { id: "n1", title: "Alpha", kind: "note", tags: ["x"], date: "2026-01-01", updated_at: 2, content: "liga com [[Beta]]" },
      { id: "n2", title: "Beta", kind: "note", tags: [], date: "2026-01-02", updated_at: 3, content: "volta pra [[alpha]]" },
      { id: "n3", title: "Gama", kind: "note", tags: [], date: "2026-01-03", updated_at: 1, content: "aponta para [[Inexistente]]" },
    ];
    const snap = buildSnapshot(records);
    expect(snap.nodes).toHaveLength(4); // Alpha, Beta, Gama + fantasma
    expect(snap.edges).toHaveLength(3);
    const ghost = snap.nodes.find((n) => n.ghost);
    expect(ghost.title).toBe("Inexistente");
    // Beta recebeu 1 link de Alpha; Alpha recebeu 1 de Beta
    expect(snap.nodes.find((n) => n.id === "n1").linkCount).toBe(1);
    expect(snap.nodes.find((n) => n.id === "n2").linkCount).toBe(1);
    expect(snap.stats.totalNotes).toBe(3);
    expect(snap.stats.ghosts).toBe(1);
    // ordenação: mais linkados primeiro, depois mais recentes
    expect(snap.nodes[0].linkCount).toBeGreaterThanOrEqual(snap.nodes[snap.nodes.length - 1].linkCount);
  });

  it("buildSnapshot ignora self-links e deduplica edges repetidas", () => {
    const records = [
      { id: "a", title: "A", kind: "note", tags: [], date: null, updated_at: 1, content: "[[A]] e [[B]] [[B]]" },
      { id: "b", title: "B", kind: "note", tags: [], date: null, updated_at: 1, content: "" },
    ];
    const snap = buildSnapshot(records);
    expect(snap.edges).toHaveLength(1);
    expect(snap.nodes.find((n) => n.id === "b").linkCount).toBe(1);
  });
});
