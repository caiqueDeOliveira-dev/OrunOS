const wav = require("node-wav");
const ffmpegUtils = require("../ffmpeg-utils.cjs");

function makeTone(freq, sec, volume = 0.5, sampleRate = 44100) {
  const n = Math.floor(sampleRate * sec);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    data[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * volume;
  }
  return wav.encode([data], { sampleRate, bitDepth: 16 });
}

describe("ffmpeg-utils", () => {
  const available = ffmpegUtils.isFfmpegAvailable();

  it("should report availability as a boolean", () => {
    expect(typeof available).toBe("boolean");
  });

  it("should probe duration of a generated wav", async () => {
    const buf = makeTone(440, 1);
    const dur = await ffmpegUtils.probeDuration(buf);
    expect(Math.abs(dur - 1)).toBeLessThan(0.1);
  });

  (available ? describe : describe.skip)("ffmpeg path", () => {
    it("should convert a buffer to wav", async () => {
      const tone = makeTone(440, 0.5);
      const out = await ffmpegUtils.convertToWav(tone, { sampleRate: 16000, channels: 1 });
      const header = out.slice(0, 4).toString();
      expect(header).toBe("RIFF");
      const dur = await ffmpegUtils.probeDuration(out);
      expect(Math.abs(dur - 0.5)).toBeLessThan(0.1);
    });

    it("should mix two tracks into a longer wav", async () => {
      const t1 = makeTone(440, 1).toString("base64");
      const t2 = makeTone(660, 1).toString("base64");
      const result = await ffmpegUtils.mixTracks({
        tracks: [
          { audioBase64: t1 },
          { audioBase64: t2, volume: 0.5 },
        ],
        sampleRate: 44100,
        channels: 2,
      });
      const buf = Buffer.from(result.audioBase64, "base64");
      expect(result.mime).toBe("audio/wav");
      const decoded = wav.decode(buf);
      expect(decoded.channelData.length).toBe(2);
      const dur = await ffmpegUtils.probeDuration(buf);
      expect(Math.abs(dur - 1)).toBeLessThan(0.1);
    });

    it("should apply gain to a wav", async () => {
      const tone = makeTone(440, 0.5).toString("base64");
      const result = await ffmpegUtils.applyGain({ audioBase64: tone, gain: 2 });
      expect(result.mime).toBe("audio/wav");
      const buf = Buffer.from(result.audioBase64, "base64");
      expect(buf.slice(0, 4).toString()).toBe("RIFF");
    });
  });

  it("should throw when mixing with no tracks", async () => {
    await expect(ffmpegUtils.mixTracks({ tracks: [] })).rejects.toThrow("No tracks");
  });
});
