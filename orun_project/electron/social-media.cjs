// electron/social-media.cjs
//
// Social media publishing. Supports two modes:
// 1. Direct Buffer API – send content straight to Buffer's GraphQL API.
// 2. n8n webhook – send to a local n8n workflow (legacy; kept for backward compat).
//
// To use Buffer directly, configure in Orun settings:
//   bufferApi: { token: "…", channels: { twitter: "…", instagram: "…", tiktok: "…" } }
// Otherwise, per-platform webhook URLs are used as before.

const n8n = require("./n8n.cjs");
const https = require("https");

const PLATFORMS = ["instagram", "tiktok", "twitter"];

// ── Helpers ────────────────────────────────────────────────────────────────

function getConfig(db) {
  return db.getSetting("socialMediaWebhooks", {});
}

function setConfig(db, cfg) {
  db.setSetting("socialMediaWebhooks", cfg);
}

function getBufferConfig(db) {
  return db.getSetting("bufferApi", {});
}

function setBufferConfig(db, cfg) {
  db.setSetting("bufferApi", cfg);
}

/**
 * Make a raw HTTPS request (reused for Buffer GraphQL calls).
 */
function httpsRequest(hostname, method, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
        timeout: 20000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
          } catch {
            resolve({ status: res.statusCode, body: { raw: data } });
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Build the GraphQL mutation string for a Buffer createPost call.
 */
function buildBufferMutation(platform, text, imageUrl, videoUrl) {
  const channelIds = {
    twitter: "6a56337980cc80cdcab127ba",
    instagram: "6a56336480cc80cdcab126c3",
    tiktok: "6a56339f80cc80cdcab12992",
  };
  const channelId = channelIds[platform];
  if (!channelId) return null;

  const escapedText = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  let assets = "";
  let metadata = "";

  if (platform === "instagram") {
    if (imageUrl) {
      assets = `, assets: [{ image: { url: "${imageUrl.replace(/"/g, '\\"')}" } }]`;
    }
    if (videoUrl) {
      assets = `, assets: [{ video: { url: "${videoUrl.replace(/"/g, '\\"')}" } }]`;
    }
    metadata = `, metadata: { instagram: { type: ${videoUrl ? "reels" : "post"}, shouldShareToFeed: true } }`;
  } else if (platform === "tiktok") {
    if (imageUrl) {
      assets = `, assets: [{ image: { url: "${imageUrl.replace(/"/g, '\\"')}" } }]`;
    }
    if (videoUrl) {
      assets = `, assets: [{ video: { url: "${videoUrl.replace(/"/g, '\\"')}" } }]`;
    }
  }

  return `mutation CreatePost { createPost(input: { text: "${escapedText}", channelId: "${channelId}", schedulingType: automatic, mode: addToQueue${assets}${metadata} }) { ... on PostActionSuccess { post { id text } } ... on MutationError { message } } }`;
}

// ── Buffer API publish ────────────────────────────────────────────────────

async function publishViaBuffer({ platform, text, imageUrl, videoUrl, token }) {
  const query = buildBufferMutation(platform, text, imageUrl, videoUrl);
  if (!query) {
    return { ok: false, error: `Unknown platform "${platform}" for Buffer API` };
  }

  try {
    const res = await httpsRequest("api.buffer.com", "POST", {
      Authorization: token,
    }, { query });

    if (res.body?.data?.createPost?.post) {
      return { ok: true, platform, postId: res.body.data.createPost.post.id };
    }

    const errMsg = res.body?.data?.createPost?.message
      || res.body?.error?.message
      || JSON.stringify(res.body);

    if (errMsg.includes("images") || errMsg.includes("media") || errMsg.includes("video")) {
      return {
        ok: false,
        platform,
        error: `${errMsg}. Instagram and TikTok require at least one image or video.`,
      };
    }

    return { ok: false, platform, error: errMsg };
  } catch (err) {
    return { ok: false, platform, error: err.message || String(err) };
  }
}

// ── n8n webhook publish (legacy) ──────────────────────────────────────────

async function publishViaWebhook({ platform, text, hook, hashtags, imageUrl, videoUrl, format }, config) {
  const platformCfg = config[platform];
  if (!platformCfg?.webhookUrl) return null;

  const payload = {
    body: {
      platform,
      format: format || "post",
      text: text || "",
      hook: hook || "",
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const result = await n8n.triggerWebhook({
      webhookUrl: platformCfg.webhookUrl,
      payload,
      headerName: platformCfg.headerName,
      headerValue: platformCfg.headerValue,
    });
    return { ok: true, platform, result };
  } catch (err) {
    return { ok: false, platform, error: err.message || String(err) };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

async function publish({ platform, text, hook, hashtags, imageUrl, videoUrl, format }, db) {
  if (!PLATFORMS.includes(platform)) {
    return { ok: false, error: `Unknown platform: "${platform}". Supported: ${PLATFORMS.join(", ")}` };
  }

  const fullText = [hook, text].filter(Boolean).join("\n\n");
  const hashtagStr = Array.isArray(hashtags) && hashtags.length
    ? "\n\n" + hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
    : "";
  const finalText = fullText + hashtagStr;

  // Try Buffer API first if configured
  const bufferCfg = getBufferConfig(db);
  if (bufferCfg?.token) {
    return publishViaBuffer({
      platform,
      text: finalText || text || "",
      imageUrl,
      videoUrl,
      token: bufferCfg.token,
    });
  }

  // Fall back to n8n webhook
  const config = getConfig(db);
  const result = await publishViaWebhook({ platform, text, hook, hashtags, imageUrl, videoUrl, format }, config);
  if (result) return result;

  return {
    ok: false,
    error: `No Buffer API token configured and no webhook configured for ${platform}. Go to Settings → Social Media to set up publishing.`,
  };
}

/**
 * Publish to multiple platforms at once.
 */
async function publishMulti({ platforms, text, hook, hashtags, imageUrl, videoUrl, format }, db) {
  const results = await Promise.allSettled(
    platforms.map((p) => publish({ platform: p, text, hook, hashtags, imageUrl, videoUrl, format }, db))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { ok: false, platform: platforms[i], error: r.reason?.message || String(r.reason) };
  });
}

/**
 * Test connectivity for all configured platforms.
 */
async function testPlatforms(db) {
  const bufferCfg = getBufferConfig(db);
  const webhookCfg = getConfig(db);
  const results = {};

  for (const platform of PLATFORMS) {
    if (bufferCfg?.token) {
      const needsMedia = platform === "instagram" || platform === "tiktok";
      const r = await publishViaBuffer({
        platform,
        text: "Orun OS connectivity test",
        imageUrl: needsMedia ? "https://picsum.photos/800/800" : undefined,
        token: bufferCfg.token,
      });
      results[platform] = { configured: true, ok: r.ok, error: r.error, mode: "buffer" };
    } else if (webhookCfg[platform]?.webhookUrl) {
      try {
        await n8n.triggerWebhook({
          webhookUrl: webhookCfg[platform].webhookUrl,
          payload: { body: { platform, text: "test", timestamp: new Date().toISOString() } },
          headerName: webhookCfg[platform].headerName,
          headerValue: webhookCfg[platform].headerValue,
        });
        results[platform] = { configured: true, ok: true, mode: "webhook" };
      } catch (err) {
        results[platform] = { configured: true, ok: false, error: err.message, mode: "webhook" };
      }
    } else {
      results[platform] = { configured: false };
    }
  }

  return results;
}

module.exports = { PLATFORMS, getConfig, setConfig, getBufferConfig, setBufferConfig, publish, publishMulti, testPlatforms };
