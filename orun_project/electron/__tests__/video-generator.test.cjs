// electron/__tests__/video-generator.test.cjs
const http = require("http");
const videoGen = require("../video-generator.cjs");

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

describe("video-generator.cjs (MiniMax-H3)", () => {
  it("rejeita sem chave de API", async () => {
    await expect(videoGen.generateVideo({ prompt: "test" }, "")).rejects.toThrow(/API key/i);
  });

  it("rejeita prompt vazio", async () => {
    await expect(videoGen.generateVideo({}, "sk-test")).rejects.toThrow(/prompt/i);
  });

  it("rejeita mistura de first/last frame com referências", async () => {
    await expect(
      videoGen.generateVideo({ prompt: "x", firstFrameUrl: "http://a/img.jpg", referenceImageUrls: ["http://b/img.jpg"] }, "sk-test")
    ).rejects.toThrow(/mutually exclusive/i);
  });

  it("cria task t2va com ratio concreto e retorna task_id", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        expect(req.method).toBe("POST");
        expect(req.url).toBe("/v2/video_generation");
        expect(req.headers.authorization).toBe("Bearer sk-test");
        const parsed = JSON.parse(body);
        expect(parsed.model).toBe("MiniMax-H3");
        expect(parsed.content[0].type).toBe("text");
        expect(parsed.content[0].text).toBe("a dog running");
        expect(parsed.ratio).toBe("16:9");
        expect(parsed.resolution).toBe("2K");
        expect(parsed.duration).toBe(5);
        res.end(JSON.stringify({ task_id: "424010985738629" }));
      });
    });
    try {
      const res = await videoGen.generateVideo({ prompt: "a dog running", resolution: "2K", duration: 5, ratio: "16:9" }, "sk-test", base);
      expect(res.taskId).toBe("424010985738629");
      expect(res.model).toBe("MiniMax-H3");
    } finally {
      server.close();
    }
  });

  it("monta content multimodal com referências (r2va) e ratio adaptive", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body);
        expect(parsed.ratio).toBe("adaptive");
        const types = parsed.content.map((c) => c.type);
        expect(types).toEqual(["text", "image_url", "video_url", "audio_url"]);
        expect(parsed.content[1].role).toBe("reference_image");
        expect(parsed.content[2].role).toBe("reference_video");
        expect(parsed.content[3].role).toBe("reference_audio");
        res.end(JSON.stringify({ task_id: "1" }));
      });
    });
    try {
      const res = await videoGen.generateVideo(
        { prompt: "say hello", referenceImageUrls: ["http://a/1.jpg"], referenceVideoUrls: ["http://a/2.mp4"], referenceAudioUrls: ["http://a/3.mp3"] },
        "sk-test", base
      );
      expect(res.taskId).toBe("1");
    } finally {
      server.close();
    }
  });

  it("imagem-to-video usa first/last frame com ratio adaptive", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body);
        expect(parsed.ratio).toBe("adaptive");
        expect(parsed.content).toHaveLength(3);
        expect(parsed.content[1].role).toBe("first_frame");
        expect(parsed.content[2].role).toBe("last_frame");
        res.end(JSON.stringify({ task_id: "2" }));
      });
    });
    try {
      const res = await videoGen.generateVideo(
        { prompt: "move", firstFrameUrl: "http://a/start.jpg", lastFrameUrl: "http://a/end.jpg", ratio: "9:16" },
        "sk-test", base
      );
      expect(res.taskId).toBe("2");
    } finally {
      server.close();
    }
  });

  it("waitForVideo retorna URL quando succeeded", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      expect(req.url).toBe("/v2/query/video_generation/task1");
      res.end(JSON.stringify({
        task: {
          id: "task1", model: "MiniMax-H3", status: "succeeded",
          content: { url: "https://cdn.example.com/out.mp4" },
          resolution: "2K", duration: 5, ratio: "16:9", task_type: "generation", modality: "video",
        },
      }));
    });
    try {
      const res = await videoGen.waitForVideo("task1", "sk-test", { pollMs: 5, timeoutMs: 1000, baseUrl: base });
      expect(res.ok).toBe(true);
      expect(res.videoUrl).toBe("https://cdn.example.com/out.mp4");
    } finally {
      server.close();
    }
  });

  it("waitForVideo reporta erro quando failed", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        task: { id: "t", status: "failed", error: { code: "1026", message: "video description contains sensitive content" } },
      }));
    });
    try {
      const res = await videoGen.waitForVideo("t", "sk-test", { pollMs: 5, timeoutMs: 1000, baseUrl: base });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("failed");
      expect(res.error).toContain("sensitive");
    } finally {
      server.close();
    }
  });

  it("waitForVideo faz timeout gracioso quando fica queued", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ task: { id: "t", status: "queued" } }));
    });
    try {
      const res = await videoGen.waitForVideo("t", "sk-test", { pollMs: 5, timeoutMs: 30, baseUrl: base });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("timed out");
    } finally {
      server.close();
    }
  });

  it("propaga 401 com mensagem de erro da API", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "error",
        error: { type: "authorized_error", message: "login fail: Please carry the API secret key (1004)", http_code: "401" },
      }));
    });
    try {
      await expect(videoGen.generateVideo({ prompt: "x" }, "bad-key", base)).rejects.toThrow(/401/);
    } finally {
      server.close();
    }
  });

  it("testConnection valida chave (401 = inválida)", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({}));
    });
    try {
      const res = await videoGen.testConnection("bad", base);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Invalid");
    } finally {
      server.close();
    }
  });

  it("generateVideoAndWait faz create + poll e retorna URL", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.method === "POST") {
        res.end(JSON.stringify({ task_id: "abc123" }));
      } else {
        res.end(JSON.stringify({ task: { id: "abc123", status: "succeeded", content: { url: "https://cdn.example.com/final.mp4" } } }));
      }
    });
    try {
      const res = await videoGen.generateVideoAndWait({ prompt: "boom", duration: 4 }, "sk-test", { pollMs: 5, timeoutMs: 1000, baseUrl: base });
      expect(res.ok).toBe(true);
      expect(res.videoUrl).toBe("https://cdn.example.com/final.mp4");
      expect(res.taskId).toBe("abc123");
    } finally {
      server.close();
    }
  });

  it("expõe constantes de modelo/resolução", () => {
    expect(videoGen.MINIMAX_VIDEO_MODELS[0].id).toBe("MiniMax-H3");
    expect(videoGen.H3_RESOLUTIONS).toContain("2K");
    expect(videoGen.H3_DURATIONS).toContain(15);
    expect(videoGen.H3_RATIOS).toContain("adaptive");
    expect(videoGen.DEFAULT_MINIMAX_URL).toBe("https://api.minimax.io");
  });
});
