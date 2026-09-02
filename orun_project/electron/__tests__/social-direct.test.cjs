// electron/__tests__/social-direct.test.cjs
// Covers the native "Direct" publishing additions:
//   - OAuth 1.0a (X/Twitter) header/signature (RFC 5849 canonical vector)
//   - TikTok Content Posting API body builders (photo + video)
//   - publish() routing: direct preferred, fallback to Buffer/webhook preserved

const social = require("../social-media.cjs");
const { buildOAuth1Authorization, buildTwitterMediaForm, buildTikTokPhotoPost, buildTikTokVideoPost, getTwitterDirectConfig, getTikTokDirectConfig } = social._helpers;

// Minimal db double: getSetting returns fixtures.
function makeDb(integrations = {}, buffer = {}, webhooks = {}) {
  return {
    getSetting(key, fallback) {
      if (key === "integrations") return integrations;
      if (key === "bufferApi") return buffer;
      if (key === "socialMediaWebhooks") return webhooks;
      return fallback;
    },
    setSetting() {},
  };
}

describe("OAuth 1.0a (X) — buildOAuth1Authorization", () => {
  it("matches the canonical RFC 5849 §3.4.1.2 signature", () => {
    const header = buildOAuth1Authorization({
      method: "GET",
      url: "http://photos.example.net/photos",
      params: { file: "vacation.jpg", size: "original" },
      consumerKey: "dpf43f3p2l4k3l03",
      consumerSecret: "kd94hf93k423kf44",
      token: "nnch734d00sl2jdk",
      tokenSecret: "pfkkdhi9sl3r4s00",
      nonce: "kllo9940pd9333jh",
      now: 1191242096,
    });

    expect(header).toContain(`oauth_signature="tR3%2BTy81lMeYAr%2FFid0kMTYa%2FWM%3D"`);
  });

  it("includes the standard OAuth fields in the header", () => {
    const header = buildOAuth1Authorization({
      method: "POST",
      url: "https://api.x.com/2/tweets",
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "tk",
      tokenSecret: "ts",
      nonce: "deadbeef",
      now: 1700000000,
    });

    expect(header.startsWith("OAuth ")).toBe(true);
    expect(header).toContain('oauth_consumer_key="ck"');
    expect(header).toContain('oauth_token="tk"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_version="1.0"');
    expect(header).toContain('oauth_timestamp="1700000000"');
    expect(header).toContain('oauth_nonce="deadbeef"');
  });

  it("produces different signatures for different timestamps (anti-replay nonce)", () => {
    const opts = {
      method: "POST",
      url: "https://api.x.com/2/tweets",
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "tk",
      tokenSecret: "ts",
      nonce: "n1",
    };
    const a = buildOAuth1Authorization({ ...opts, now: 1 });
    const b = buildOAuth1Authorization({ ...opts, now: 2 });
    expect(a).not.toBe(b);
  });
});

describe("buildTwitterMediaForm", () => {
  it("builds a multipart body with media_category and binary media", () => {
    const { body, contentType } = buildTwitterMediaForm(Buffer.from("fake-jpeg-bytes"));
    expect(contentType.startsWith("multipart/form-data; boundary=----OrunForm")).toBe(true);
    expect(body.toString("utf8")).toContain('name="media_category"');
    expect(body.toString("utf8")).toContain("tweet_image");
    expect(body.toString("utf8")).toContain("fake-jpeg-bytes");
  });
});

describe("TikTok Content Posting API builders", () => {
  it("builds a photo post body for /v2/post/publish/content/init/", () => {
    const body = buildTikTokPhotoPost({
      text: "Uma história que TODO brasileiro deveria saber #historia",
      imageUrl: "https://exemplo.com/foto.jpg",
    });
    expect(body.media_type).toBe("PHOTO");
    expect(body.post_mode).toBe("DIRECT_POST");
    expect(body.post_info.title.length).toBeLessThanOrEqual(90);
    expect(body.source_info.source).toBe("PULL_FROM_URL");
    expect(body.source_info.photo_images).toEqual(["https://exemplo.com/foto.jpg"]);
    expect(body.source_info.photo_cover_index).toBe(0);
  });

  it("builds a video post body for /v2/post/publish/video/init/", () => {
    const body = buildTikTokVideoPost({
      text: "Meu primeiro Reel com API",
      videoUrl: "https://exemplo.com/video.mp4",
      privacyLevel: "PUBLIC_TO_EVERYONE",
    });
    expect(body.post_info.privacy_level).toBe("PUBLIC_TO_EVERYONE");
    expect(body.source_info.source).toBe("PULL_FROM_URL");
    expect(body.source_info.video_url).toBe("https://exemplo.com/video.mp4");
  });
});

describe("social-media.publish routing (Direct vs fallback)", () => {
  it("prefers X Direct when enabled, and errors locally when lacking secrets (no network)", async () => {
    const db = makeDb({
      twitterDirect: { enabled: true, apiKey: "ck", apiSecret: "", accessToken: "tk", accessTokenSecret: "ts" },
    });
    const r = await social.publish({ platform: "twitter", text: "ola" }, db);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("X Direct");
  });

  it("prefers TikTok Direct when enabled but missing access token (no network)", async () => {
    const db = makeDb({ tiktokDirect: { enabled: true, accessToken: "" } });
    const r = await social.publish({ platform: "tiktok", text: "ola", imageUrl: "https://x/f.jpg" }, db);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("TikTok Direct");
  });

  it("falls back to Buffer/webhook when Direct is not enabled", async () => {
    const db = makeDb({ twitterDirect: { enabled: false } });
    const r = await social.publish({ platform: "twitter", text: "ola" }, db);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/No Buffer API token configured and no webhook configured/);
  });

  it("reads the direct configs correctly", () => {
    const db = makeDb({
      twitterDirect: { enabled: true, apiKey: "a", apiSecret: "b", accessToken: "c", accessTokenSecret: "d" },
      tiktokDirect: { enabled: true, accessToken: "t" },
    });
    expect(getTwitterDirectConfig(db)).toEqual({ enabled: true, apiKey: "a", apiSecret: "b", accessToken: "c", accessTokenSecret: "d" });
    expect(getTikTokDirectConfig(db)).toEqual({ enabled: true, accessToken: "t" });
  });
});