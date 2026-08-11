const { SILENT_MARKER, isSilentReply, silentPromptBlock } = require("../silent-mode.cjs");

describe("silent-mode", () => {
  describe("isSilentReply", () => {
    it("reconhece o marcador exato", () => {
      expect(isSilentReply(SILENT_MARKER)).toBe(true);
    });

    it("toleriza whitespace em volta", () => {
      expect(isSilentReply(`  ${SILENT_MARKER}  \n`)).toBe(true);
    });

    it("toleriza code fences ao redor", () => {
      expect(isSilentReply(`\`\`\`\n${SILENT_MARKER}\n\`\`\``)).toBe(true);
    });

    it("rejeita texto normal de resposta", () => {
      expect(isSilentReply("Pronto! Pulei a música para você. 🎵")).toBe(false);
    });

    it("rejeita resposta que apenas cita o marcador", () => {
      expect(isSilentReply(`Executei a ação ${SILENT_MARKER}`)).toBe(false);
    });

    it("rejeita valores vazios/null/undefined", () => {
      expect(isSilentReply("")).toBe(false);
      expect(isSilentReply(null)).toBe(false);
      expect(isSilentReply(undefined)).toBe(false);
    });
  });

  describe("silentPromptBlock", () => {
    it("gera um bloco com o marcador", () => {
      const block = silentPromptBlock();
      expect(block).toContain(SILENT_MARKER);
      expect(block).toContain("EXECUCAO SILENCIOSA");
      expect(block).toContain("NAO escreva texto de confirmacao");
    });
  });
});
