import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type AmbientSoundsModule = typeof import("../app/services/ambientSounds");

function createMockAudioContext() {
  return {
    createGain: vi.fn(() => ({
      gain: {
        value: 0.5,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: "",
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: "",
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn(() => ({
      getChannelData: vi.fn(() => new Float32Array(88200)),
      duration: 2,
      length: 88200,
      sampleRate: 44100,
      numberOfChannels: 1,
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: "running",
    resume: vi.fn(),
  } as unknown as AudioContext;
}

describe("ambientSounds", () => {
  let mod: AmbientSoundsModule;
  let mockAudioCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(async () => {
    vi.resetModules();
    mockAudioCtx = createMockAudioContext();
    vi.stubGlobal("AudioContext", vi.fn(() => mockAudioCtx));
    mod = await import("../app/services/ambientSounds");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("AMBIENT_SOUNDS", () => {
    it("contains all 6 sound types", () => {
      const sounds = mod.AMBIENT_SOUNDS;
      expect(sounds).toHaveLength(6);
      const ids = sounds.map((s) => s.id);
      expect(ids).toEqual([
        "rain",
        "forest",
        "ocean",
        "cafe",
        "fire",
        "white_noise",
      ]);
    });

    it("each sound type has a non-empty name", () => {
      for (const sound of mod.AMBIENT_SOUNDS) {
        expect(sound.name).toBeTruthy();
        expect(typeof sound.name).toBe("string");
      }
    });
  });

  describe("playback control", () => {
    it("getActiveSounds() returns empty before any sound is played", () => {
      expect(mod.getActiveSounds()).toEqual([]);
    });

    it("startSound('rain') creates an AudioContext and activates the sound", () => {
      mod.startSound("rain");
      expect(AudioContext).toHaveBeenCalledTimes(1);
      expect(mod.getActiveSounds()).toContain("rain");
    });

    it("stopSound('rain') stops the sound", () => {
      mod.startSound("rain");
      expect(mod.getActiveSounds()).toContain("rain");

      mod.stopSound("rain");
      expect(mod.getActiveSounds()).not.toContain("rain");
    });

    it("stopAll() stops all active sounds", () => {
      mod.startSound("rain");
      mod.startSound("ocean");
      expect(mod.getActiveSounds()).toHaveLength(2);

      mod.stopAll();
      expect(mod.getActiveSounds()).toEqual([]);
    });

    it("startSound('rain') twice is idempotent", () => {
      mod.startSound("rain");
      mod.startSound("rain");
      expect(AudioContext).toHaveBeenCalledTimes(1);
      expect(mod.getActiveSounds()).toEqual(["rain"]);
    });

    it("startSound with unknown type does nothing", () => {
      mod.startSound("unknown_type");
      expect(AudioContext).not.toHaveBeenCalled();
      expect(mod.getActiveSounds()).toEqual([]);
    });

    it("stopSound with non-active type does nothing", () => {
      expect(() => mod.stopSound("rain")).not.toThrow();
    });
  });

  describe("volume control", () => {
    it("setVolume creates master gain and updates volume", () => {
      mod.startSound("rain");
      const masterGain =
        (mockAudioCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value;

      mod.setVolume(0.5);
      expect(masterGain.gain.value).toBe(0.5);

      mod.setVolume(1);
      expect(masterGain.gain.value).toBe(1);

      mod.setVolume(0);
      expect(masterGain.gain.value).toBe(0);
    });

    it("setVolume clamps between 0 and 1", () => {
      mod.startSound("rain");
      const masterGain =
        (mockAudioCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value;

      mod.setVolume(1.5);
      expect(masterGain.gain.value).toBe(1);

      mod.setVolume(-0.5);
      expect(masterGain.gain.value).toBe(0);
    });
  });
});
