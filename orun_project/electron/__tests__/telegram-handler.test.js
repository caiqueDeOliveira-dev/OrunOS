import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTelegramHandler } from "../telegram-handler.cjs";

describe("telegram-handler", () => {
  let handler;
  let mockDb;
  let mockAiRouter;
  let mockAgentProcessor;
  let mockBuildSystemPrompt;
  let mockResolveAISettings;
  let mockLog;
  let mockTelegram;

  beforeEach(() => {
    mockDb = {
      getSetting: vi.fn((key, def) => {
        if (key === "telegram") return { agentChats: { "123": "Health", "456": "Hampton" } };
        return def;
      }),
      setSetting: vi.fn(),
    };
    mockAiRouter = { routeChat: vi.fn(async () => ({ text: "AI response" })) };
    mockAgentProcessor = { processAgentReply: vi.fn((text) => ({ text })) };
    mockBuildSystemPrompt = vi.fn(() => "System prompt");
    mockResolveAISettings = vi.fn(() => ({ provider: "groq", model: "test-model" }));
    mockLog = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    mockTelegram = {
      sendMessage: vi.fn(async () => {}),
    };

    handler = createTelegramHandler({
      db: mockDb,
      aiRouter: mockAiRouter,
      agentProcessor: mockAgentProcessor,
      buildSystemPrompt: mockBuildSystemPrompt,
      resolveAISettings: mockResolveAISettings,
      log: mockLog,
    });
  });

  describe("resolveAgent", () => {
    it("returns agent name for mapped chat", () => {
      expect(handler.resolveAgent("123")).toBe("Health");
      expect(handler.resolveAgent("456")).toBe("Hampton");
    });

    it("returns null for unknown chat", () => {
      expect(handler.resolveAgent("999")).toBeNull();
    });

    it("returns null when no telegram config exists", () => {
      mockDb.getSetting.mockReturnValue({});
      expect(handler.resolveAgent("123")).toBeNull();
    });
  });

  describe("handleMessage", () => {
    it("sends help message when no agent is assigned", async () => {
      await handler.handleMessage({ chatId: "999", text: "hello" }, mockTelegram);
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "999",
        expect.stringContaining("Nenhum agente configurado")
      );
    });

    it("processes message through AI when agent is assigned", async () => {
      await handler.handleMessage({ chatId: "123", text: "Olá" }, mockTelegram);
      expect(mockAiRouter.routeChat).toHaveBeenCalled();
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith("123", "AI response");
    });

    it("sends error message when AI fails", async () => {
      mockAiRouter.routeChat.mockRejectedValue(new Error("API down"));
      await handler.handleMessage({ chatId: "123", text: "test" }, mockTelegram);
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "123",
        expect.stringContaining("Erro ao processar mensagem")
      );
    });

    it("ignores messages with no text and no image", async () => {
      await handler.handleMessage({ chatId: "123" }, mockTelegram);
      expect(mockAiRouter.routeChat).not.toHaveBeenCalled();
    });

    it("handles image messages for Health agent", async () => {
      await handler.handleMessage({ chatId: "123", text: null, imageFileId: "https://example.com/photo.jpg" }, mockTelegram);
      expect(mockAiRouter.routeChat).toHaveBeenCalled();
      const messages = mockAiRouter.routeChat.mock.calls[0][0];
      expect(messages[0].content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "text" }),
          expect.objectContaining({ type: "image_url" }),
        ])
      );
    });
  });

  describe("handleCommand (via handleMessage)", () => {
    it("handles /start command", async () => {
      await handler.handleMessage({ chatId: "123", text: "/start" }, mockTelegram);
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "123",
        expect.stringContaining("Orun OS")
      );
    });

    it("handles /agent without args (shows current)", async () => {
      await handler.handleMessage({ chatId: "123", text: "/agent" }, mockTelegram);
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "123",
        expect.stringContaining("Health")
      );
    });

    it("handles /agent with valid agent name", async () => {
      await handler.handleMessage({ chatId: "123", text: "/agent Finance" }, mockTelegram);
      expect(mockDb.setSetting).toHaveBeenCalledWith("telegram", expect.objectContaining({
        agentChats: expect.objectContaining({ "123": "Finance" }),
      }));
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "123",
        expect.stringContaining("Finance")
      );
    });

    it("handles /agent with invalid agent name", async () => {
      await handler.handleMessage({ chatId: "123", text: "/agent InvalidAgent" }, mockTelegram);
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "123",
        expect.stringContaining("Agentes disponíveis")
      );
    });

    it("handles /help command", async () => {
      await handler.handleMessage({ chatId: "123", text: "/help" }, mockTelegram);
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        "123",
        expect.stringContaining("Comandos")
      );
    });

    it("does not process AI for slash commands", async () => {
      await handler.handleMessage({ chatId: "123", text: "/start" }, mockTelegram);
      expect(mockAiRouter.routeChat).not.toHaveBeenCalled();
    });
  });
});
