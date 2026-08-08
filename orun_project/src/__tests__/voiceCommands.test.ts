import { describe, it, expect } from "vitest";
import {
  detectVoiceCommand,
  extractOpenTarget,
  stripCommand,
} from "../app/voice/voice-commands";

describe("voice-commands", () => {
  describe("detectVoiceCommand", () => {
    it("detects an open command with app destination", () => {
      const match = detectVoiceCommand("abrir o telegram");
      expect(match).not.toBeNull();
      expect(match!.command.action).toBe("open");
    });

    it("does not treat a plain sentence with 'abra' as an open command", () => {
      const match = detectVoiceCommand("eu quero abrir uma garrafa de água por favor");
      expect(match).toBeNull();
    });

    it("detects stop", () => {
      const match = detectVoiceCommand("pode parar agora");
      expect(match?.command.action).toBe("stop");
    });

    it("detects clear", () => {
      const match = detectVoiceCommand("limpar a conversa");
      expect(match?.command.action).toBe("clear");
    });
  });

  describe("extractOpenTarget", () => {
    it("maps whatsapp keywords", () => {
      expect(extractOpenTarget("abrir o whatsapp")).toBe("whatsapp");
      expect(extractOpenTarget("abre o zap")).toBe("whatsapp");
    });

    it("maps settings keywords", () => {
      expect(extractOpenTarget("abrir configurações")).toBe("settings");
      expect(extractOpenTarget("open settings")).toBe("settings");
    });

    it("maps agents", () => {
      expect(extractOpenTarget("abrir painel de agentes")).toBe("agents");
    });

    it("maps planner, agent hub and analytics", () => {
      expect(extractOpenTarget("abrir o planner")).toBe("planner");
      expect(extractOpenTarget("abre o agent hub")).toBe("agentHub");
      expect(extractOpenTarget("abrir dashboard")).toBe("analytics");
      expect(extractOpenTarget("abrir as métricas")).toBe("analytics");
    });

    it("returns null when no destination is mentioned", () => {
      expect(extractOpenTarget("abrir")).toBeNull();
      expect(extractOpenTarget("oi")).toBeNull();
    });
  });

  describe("stripCommand", () => {
    it("removes the matched command from the text", () => {
      const match = detectVoiceCommand("limpar a conversa");
      expect(match).not.toBeNull();
      expect(stripCommand("limpar a conversa", match!).trim()).toBe("a conversa");
    });
  });
});
