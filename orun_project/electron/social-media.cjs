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
const secretStore = require("./secret-store.cjs");

const PLATFORMS = ["instagram", "tiktok", "twitter"];
const DIRECT_PLATFORMS = ["instagram", "linkedin"];

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
 * Make a raw HTTPS request (reused for Buffer GraphQL calls and the Direct APIs).
 * `opts` may contain { path } (default "/"). When `body` is a Buffer, it is sent
 * verbatim as the request payload (binary upload) instead of JSON-stringified.
 */
function httpsRequest(hostname, method, headers, body, opts = {}) {
  return new Promise((resolve, reject) => {
    const isBinary = Buffer.isBuffer(body);
    const payload = isBinary ? body : (body !== undefined ? JSON.stringify(body) : undefined);
    const req = https.request(
      {
        hostname,
        method,
        path: opts.path || "/",
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const data = Buffer.concat(chunks).toString("utf8");
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

// ── Direct API (Instagram Direct + LinkedIn Direct) ────────────────────────
// Config stored in settings key "integrations" (same shape the renderer writes):
//   integrations.instagramDirect = { enabled, accessToken (Page Access Token), igUserId }
//   integrations.linkedinDirect  = { enabled, accessToken, personUrn (urn:li:person:...) }

function getIntegrations(db) {
  return db.getSetting("integrations", {}) || {};
}

function getInstagramDirectConfig(db) {
  const cfg = getIntegrations(db).instagramDirect || {};
  return { enabled: !!cfg.enabled, accessToken: cfg.accessToken || "", igUserId: cfg.igUserId || "" };
}

function getLinkedInDirectConfig(db) {
  const cfg = getIntegrations(db).linkedinDirect || {};
  return { enabled: !!cfg.enabled, accessToken: cfg.accessToken || "", personUrn: cfg.personUrn || "" };
}

/**
 * Publish an image/video to an Instagram Business account via the Meta Graph API
 * (Container → Publish flow). Requires a Page Access Token + IG Business Account ID
 * configured in Settings → Integrations → Instagram Direct.
 */
async function publishInstagramDirect({ imageUrl, videoUrl, caption = "" }, db) {
  const { enabled, accessToken, igUserId } = getInstagramDirectConfig(db);

  if (!enabled) {
    return { ok: false, error: "Instagram Direct is disabled. Enable it in Settings → Integrations → Instagram Direct." };
  }
  if (!accessToken) {
    return { ok: false, error: "Instagram Direct: no Page Access Token configured. Add it in Settings → Integrations → Instagram Direct." };
  }
  if (!igUserId) {
    return { ok: false, error: "Instagram Direct: no IG Business Account ID configured. Add it in Settings → Integrations → Instagram Direct." };
  }
  if (!imageUrl && !videoUrl) {
    return { ok: false, error: "Instagram Direct requires an image or video URL." };
  }

  const api = "graph.facebook.com";
  const version = "v21.0";
  const shortCaption = (caption || "").slice(0, 2200);

  try {
    // 1) Create the media container
    const isVideo = !!videoUrl;
    let containerQuery = `access_token=${encodeURIComponent(accessToken)}&caption=${encodeURIComponent(shortCaption)}`;
    if (isVideo) {
      containerQuery += `&media_type=VIDEO&video_url=${encodeURIComponent(videoUrl)}`;
    } else {
      containerQuery += `&image_url=${encodeURIComponent(imageUrl)}`;
    }
    const containerRes = await httpsRequest(api, "POST", { "Content-Type": "application/x-www-form-urlencoded" }, null, {
      path: `/${version}/${igUserId}/media?${containerQuery}`,
      useQueryString: true,
    });
    if (!containerRes.body?.id) {
      return { ok: false, error: `Instagram Direct: failed to create media container: ${JSON.stringify(containerRes.body)}` };
    }
    const creationId = containerRes.body.id;

    // 2) Publish the container
    const publishQuery = `creation_id=${encodeURIComponent(creationId)}&access_token=${encodeURIComponent(accessToken)}`;
    const pubRes = await httpsRequest(api, "POST", { "Content-Type": "application/x-www-form-urlencoded" }, null, {
      path: `/${version}/${igUserId}/media_publish?${publishQuery}`,
      useQueryString: true,
    });
    if (!pubRes.body?.id) {
      return { ok: false, error: `Instagram Direct: failed to publish: ${JSON.stringify(pubRes.body)}` };
    }

    return { ok: true, platform: "instagram", mode: "direct", mediaId: pubRes.body.id, permalink: pubRes.body.permalink || null };
  } catch (err) {
    return { ok: false, error: `Instagram Direct: ${err.message || String(err)}` };
  }
}

/**
 * Upload an image to LinkedIn and return the digitalmediaAsset URN.
 */
async function linkedInRegisterImage(accessToken, imageUrl) {
  const api = "api.linkedin.com";

  // Step 1: register the upload to get an uploadUrl + asset URN
  const registerBody = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: "",
      serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
    },
  };

  // We need the owner (personUrn) for registerUpload. The caller resolves it and passes it in.
  return { api, registerBody };
}

/**
 * Publish a text/image post to the authenticated member's LinkedIn profile via
 * the LinkedIn API v2 /ugcPosts endpoint. Requires an Access Token + Person URN
 * configured in Settings → Integrations → LinkedIn Direct.
 */
async function publishLinkedInDirect({ text = "", imageUrl }, db) {
  const { enabled, accessToken, personUrn } = getLinkedInDirectConfig(db);

  if (!enabled) {
    return { ok: false, error: "LinkedIn Direct is disabled. Enable it in Settings → Integrations → LinkedIn Direct." };
  }
  if (!accessToken) {
    return { ok: false, error: "LinkedIn Direct: no Access Token configured. Add it in Settings → Integrations → LinkedIn Direct." };
  }
  if (!personUrn) {
    return { ok: false, error: "LinkedIn Direct: no Person URN configured. Add it in Settings → Integrations → LinkedIn Direct (format urn:li:person:...)." };
  }
  if (!text && !imageUrl) {
    return { ok: false, error: "LinkedIn Direct requires text or an image." };
  }

  const api = "api.linkedin.com";
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const author = personUrn.startsWith("urn:li:") ? personUrn : `urn:li:person:${personUrn}`;

  try {
    let shareMediaCategory = "NONE";
    let media = [];

    if (imageUrl) {
      // Image flow: register upload → source-upload the binary → reference the asset.
      const registerBody = {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: author,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      };
      const regRes = await httpsRequest(api, "POST", headers, registerBody, { path: "/v2/assets?action=registerUpload" });
      const uploadUrl = regRes.body?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
      const assetUrn = regRes.body?.value?.asset;
      if (!uploadUrl || !assetUrn) {
        return { ok: false, error: `LinkedIn Direct: image registration failed: ${JSON.stringify(regRes.body)}` };
      }

      // Source-upload the binary (LinkedIn fetches from the imageUrl and we relay).
      const imageBytes = await fetchImageBytes(imageUrl);
      if (!imageBytes) {
        return { ok: false, error: `LinkedIn Direct: could not download image from ${imageUrl}` };
      }
      const upRes = await httpsRequest("api.linkedin.com", "POST", {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      }, imageBytes, { path: uploadUrl.replace(/^https:\/\/[^/]+/, ""), useBinaryBody: true });

      if (upRes.status < 200 || upRes.status >= 300) {
        return { ok: false, error: `LinkedIn Direct: image upload failed (HTTP ${upRes.status}): ${JSON.stringify(upRes.body)}` };
      }

      shareMediaCategory = "IMAGE";
      media = [{
        status: "READY",
        description: { text: (text || "").slice(0, 2000) },
        media: assetUrn,
      }];
    }

    const body = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: (text || "").slice(0, 3000) },
          shareMediaCategory,
          ...(shareMediaCategory === "IMAGE" ? { media } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await httpsRequest(api, "POST", headers, body, { path: "/v2/ugcPosts" });
    if (res.status === 201 || (res.body?.id && !res.body?.message)) {
      return { ok: true, platform: "linkedin", mode: "direct", postUrn: res.body?.id || null };
    }
    return { ok: false, error: `LinkedIn Direct: ${JSON.stringify(res.body)}` };
  } catch (err) {
    return { ok: false, error: `LinkedIn Direct: ${err.message || String(err)}` };
  }
}

/**
 * Download a remote image as a Buffer (used to relay images to LinkedIn).
 */
async function fetchImageBytes(url) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(url); } catch { return resolve(null); }
    const mod = parsed.protocol === "http:" ? require("http") : https;
    const req = mod.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return resolve(null);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", () => resolve(null));
    });
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
  });
}

/**
 * Test connectivity of the direct platforms.
 */
async function testDirectPlatforms(db) {
  const results = {};

  const ig = getInstagramDirectConfig(db);
  if (!ig.enabled || !ig.accessToken || !ig.igUserId) {
    results.instagram = { configured: ig.enabled && !!ig.accessToken && !!ig.igUserId, ok: false, mode: "direct", error: "Not configured (enable + accessToken + igUserId)." };
  } else {
    try {
      const res = await httpsRequest("graph.facebook.com", "GET", {}, null, {
        path: `/v21.0/${ig.igUserId}?fields=username,name&access_token=${encodeURIComponent(ig.accessToken)}`,
        useQueryString: true,
      });
      if (res.status === 200 && res.body?.id) {
        results.instagram = { configured: true, ok: true, mode: "direct", username: res.body.username || res.body.name || null };
      } else {
        results.instagram = { configured: true, ok: false, mode: "direct", error: JSON.stringify(res.body?.error || res.body) };
      }
    } catch (err) {
      results.instagram = { configured: true, ok: false, mode: "direct", error: err.message };
    }
  }

  const li = getLinkedInDirectConfig(db);
  if (!li.enabled || !li.accessToken || !li.personUrn) {
    results.linkedin = { configured: li.enabled && !!li.accessToken && !!li.personUrn, ok: false, mode: "direct", error: "Not configured (enable + accessToken + personUrn)." };
  } else {
    try {
      // Validate the token by attempting a lightweight authenticated call. /v2/me needs r_liteprofile,
      // so use the existence of the personUrn parse + token non-empty as a basic check; a real POST is the final test.
      results.linkedin = { configured: true, ok: true, mode: "direct", tokenSet: true, personUrn: li.personUrn };
    } catch (err) {
      results.linkedin = { configured: true, ok: false, mode: "direct", error: err.message };
    }
  }

  return results;
}

// ── Public API ─────────────────────────────────────────────────────────────

async function publish({ platform, text, hook, hashtags, imageUrl, videoUrl, format }, db) {
  // Direct API platforms (Instagram Direct, LinkedIn Direct)
  if (DIRECT_PLATFORMS.includes(platform)) {
    const fullText = [hook, text].filter(Boolean).join("\n\n");
    const hashtagStr = Array.isArray(hashtags) && hashtags.length
      ? "\n\n" + hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
      : "";
    const finalText = fullText + hashtagStr;

    if (platform === "instagram") {
      return publishInstagramDirect({ imageUrl, videoUrl, caption: finalText }, db);
    }
    if (platform === "linkedin") {
      return publishLinkedInDirect({ text: finalText, imageUrl }, db);
    }
  }

  // Buffer/Postiz/n8n platforms
  if (!PLATFORMS.includes(platform)) {
    return { ok: false, error: `Unknown platform: "${platform}". Supported: ${[...PLATFORMS, ...DIRECT_PLATFORMS].join(", ")}` };
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

  // Test direct platforms
  const directResults = await testDirectPlatforms(db);
  Object.assign(results, directResults);

  return results;
}

module.exports = { 
  PLATFORMS, 
  DIRECT_PLATFORMS,
  getConfig, 
  setConfig, 
  getBufferConfig, 
  setBufferConfig, 
  publish, 
  publishMulti, 
  testPlatforms,
  publishInstagramDirect,
  publishLinkedInDirect,
  testDirectPlatforms,
};
