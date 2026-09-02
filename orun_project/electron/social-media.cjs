// electron/social-media.cjs
//
// Social media publishing. Supports two modes:
// 1. Direct Buffer API – send content straight to Buffer's GraphQL API.
// 2. n8n webhook – send to a local n8n workflow (legacy; kept for backward compat).
//
// To use Buffer directly, configure in Orun settings:
//   bufferApi: { token: "…", channels: { twitter: "…", instagram: "…", tiktok: "…" } }
// Otherwise, per-platform webhook URLs are used as before.

const crypto = require("crypto");
const n8n = require("./n8n.cjs");
const https = require("https");
const secretStore = require("./secret-store.cjs");

const PLATFORMS = ["instagram", "tiktok", "twitter"];
const DIRECT_PLATFORMS = ["instagram", "linkedin", "twitter", "tiktok"];

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

// ── OAuth 1.0a (X/Twitter) ──────────────────────────────────────────────────

/**
 * Percent-encode per RFC 5849 §3.6 (encodeURIComponent leaves !, ', (, ) unencoded).
 */
function percentEncode(str) {
  return encodeURIComponent(String(str)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Build an `Authorization: OAuth ...` header (HMAC-SHA1). RFC 5849 test vector
 * (nonce `kllo9940pd9333jh`, timestamp `1191242096`) is covered in tests.
 * Optional `now`/`nonce` make the signature deterministic for tests.
 */
function buildOAuth1Authorization({ method, url, params = {}, consumerKey, consumerSecret, token, tokenSecret, now, nonce }) {
  const oauth = {
    oauth_consumer_key: String(consumerKey),
    oauth_nonce: nonce || crypto.randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(now || Math.floor(Date.now() / 1000)),
    oauth_token: String(token),
    oauth_version: "1.0",
  };

  const signatureBaseParams = {};
  for (const [k, v] of Object.entries(params)) signatureBaseParams[k] = v;
  for (const [k, v] of Object.entries(oauth)) signatureBaseParams[k] = v;

  const paramString = Object.keys(signatureBaseParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(String(signatureBaseParams[k]))}`)
    .join("&");

  const signatureBaseString = [String(method).toUpperCase(), percentEncode(url), percentEncode(paramString)].join("&");
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret || "")}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(signatureBaseString).digest("base64");

  return "OAuth " + Object.entries(oauth)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(String(v))}"`)
    .join(", ");
}

/**
 * Build a `multipart/form-data` body for the X v1.1 media upload endpoint
 * (field `media` with the binary + `media_category` — usually `tweet_image`).
 * OAuth 1.0a signatures never include multipart body fields, so `params` is {}.
 */
function buildTwitterMediaForm(buffer, mediaCategory = "tweet_image") {
  const boundary = "----OrunForm" + crypto.randomBytes(12).toString("hex");
  const parts = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media_category"\r\n\r\n${mediaCategory}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media"\r\nContent-Type: application/octet-stream\r\n\r\n`));
  parts.push(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
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

/**
 * Configuração por conta roteável. Conta "default" = integração legada
 * (instagramDirect). Contas adicionais vivem em integrations.instagramAccounts =
 * { "<label>": { enabled, accessToken, igUserId, pageId } } — ex.: label "brand"
 * para a marca Orun ST (tecnologia).
 */
function getInstagramAccountConfig(db, account = "default") {
  const intg = getIntegrations(db);
  if (account && account !== "default") {
    const ac = (intg.instagramAccounts || {})[account] || {};
    return { enabled: !!ac.enabled, accessToken: ac.accessToken || "", igUserId: ac.igUserId || "", pageId: ac.pageId || "" };
  }
  const def = intg.instagramDirect || {};
  return { enabled: !!def.enabled, accessToken: def.accessToken || "", igUserId: def.igUserId || "", pageId: def.pageId || "" };
}

function getInstagramAccounts(db) {
  const intg = getIntegrations(db);
  const accounts = [];
  const def = intg.instagramDirect || {};
  if (def.enabled && def.igUserId) accounts.push({ label: "default", igUserId: def.igUserId, pageId: def.pageId || "" });
  const extras = intg.instagramAccounts || {};
  for (const [label, ac] of Object.entries(extras)) {
    if (ac && ac.enabled && ac.igUserId) accounts.push({ label, igUserId: ac.igUserId, pageId: ac.pageId || "" });
  }
  return accounts;
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
async function publishInstagramDirect({ imageUrl, videoUrl, caption = "", account = "default" }, db) {
  const { enabled, accessToken, igUserId } = getInstagramAccountConfig(db, account);

  if (!enabled) {
    return { ok: false, error: `Instagram Direct (${account}) is disabled. Enable it in Settings → Integrations.` };
  }
  if (!accessToken) {
    return { ok: false, error: `Instagram Direct (${account}): no Page Access Token configured. Add it in Settings → Integrations.` };
  }
  if (!igUserId) {
    return { ok: false, error: `Instagram Direct (${account}): no IG Business Account ID configured. Add it in Settings → Integrations.` };
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

// ── Direct API (X/Twitter + TikTok) ────────────────────────────────────────
// Config stored in settings key "integrations" (same shape as Instagram/LinkedIn):
//   integrations.twitterDirect = { enabled, apiKey, apiSecret, accessToken, accessTokenSecret }
//   integrations.tiktokDirect  = { enabled, accessToken }

function getTwitterDirectConfig(db) {
  const cfg = getIntegrations(db).twitterDirect || {};
  return {
    enabled: !!cfg.enabled,
    apiKey: cfg.apiKey || "",
    apiSecret: cfg.apiSecret || "",
    accessToken: cfg.accessToken || "",
    accessTokenSecret: cfg.accessTokenSecret || "",
  };
}

function getTikTokDirectConfig(db) {
  const cfg = getIntegrations(db).tiktokDirect || {};
  return { enabled: !!cfg.enabled, accessToken: cfg.accessToken || "" };
}

/**
 * Build the JSON body for a TikTok photo post (Content Posting API — `/v2/post/publish/content/init/`).
 * `media_type` MUST be PHOTO here and `source_info.source` is PULL_FROM_URL.
 */
function buildTikTokPhotoPost({ text = "", imageUrl, privacyLevel }) {
  return {
    media_type: "PHOTO",
    post_mode: "DIRECT_POST",
    post_info: {
      title: String(text || "").slice(0, 90),
      description: String(text || "").slice(0, 4000),
      auto_add_music: false,
      ...(privacyLevel ? { privacy_level: privacyLevel } : {}),
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_cover_index: 0,
      photo_images: [imageUrl],
    },
  };
}

/**
 * Build the JSON body for a TikTok video post (`/v2/post/publish/video/init/`).
 */
function buildTikTokVideoPost({ text = "", videoUrl, privacyLevel }) {
  return {
    post_info: {
      title: String(text || "").slice(0, 32),
      description: String(text || "").slice(0, 2200),
      disable_comment: false,
      is_aigc: false,
      ...(privacyLevel ? { privacy_level: privacyLevel } : {}),
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };
}

/**
 * Post to X (Twitter) using the app-owner's OAuth 1.0a tokens.
 * Media goes through the v1.1 upload endpoint (only auth that accepts a binary
 * upload), then the post is created on API v2 with the returned media_id.
 * Returns `null` when the integration is not enabled so callers can fall back
 * to Buffer/webhook.
 */
async function publishTwitterDirect({ text = "", imageUrl, videoUrl }, db) {
  const cfg = getTwitterDirectConfig(db);
  if (!cfg.enabled) return null;
  if (!cfg.apiKey || !cfg.apiSecret || !cfg.accessToken || !cfg.accessTokenSecret) {
    return {
      ok: false,
      error: "X Direct: configure API Key, API Secret, Access Token e Access Token Secret em Settings → Integrations → X Direct.",
    };
  }

  const mediaUrl = videoUrl || imageUrl;
  let mediaId = null;

  try {
    if (mediaUrl) {
      const bytes = await fetchImageBytes(mediaUrl);
      if (!bytes || bytes.length === 0) {
        return { ok: false, error: `X Direct: não foi possível baixar a mídia de ${mediaUrl}.` };
      }
      const form = buildTwitterMediaForm(bytes);
      const auth = buildOAuth1Authorization({
        method: "POST",
        url: "https://upload.twitter.com/1.1/media/upload.json",
        consumerKey: cfg.apiKey,
        consumerSecret: cfg.apiSecret,
        token: cfg.accessToken,
        tokenSecret: cfg.accessTokenSecret,
      });
      const up = await httpsRequest("upload.twitter.com", "POST", { Authorization: auth, "Content-Type": form.contentType }, form.body, {
        path: "/1.1/media/upload.json",
        useBinaryBody: true,
      });
      mediaId = up.body && (up.body.media_id_string || up.body.media_id);
      if (!mediaId) {
        return { ok: false, error: `X Direct: upload de mídia falhou: ${JSON.stringify(up.body)}` };
      }
    }

    const tweet = mediaId
      ? { text: String(text || "").slice(0, 280), media: { media_ids: [String(mediaId)] } }
      : { text: String(text || "").slice(0, 280) };

    const auth2 = buildOAuth1Authorization({
      method: "POST",
      url: "https://api.x.com/2/tweets",
      consumerKey: cfg.apiKey,
      consumerSecret: cfg.apiSecret,
      token: cfg.accessToken,
      tokenSecret: cfg.accessTokenSecret,
    });
    const res = await httpsRequest("api.x.com", "POST", { Authorization: auth2, "Content-Type": "application/json" }, tweet, { path: "/2/tweets" });

    if (res.body && res.body.data && res.body.data.id) {
      return { ok: true, platform: "twitter", mode: "direct", tweetId: res.body.data.id };
    }
    return { ok: false, platform: "twitter", mode: "direct", error: JSON.stringify(res.body && res.body.errors ? res.body.errors : res.body) };
  } catch (err) {
    return { ok: false, platform: "twitter", mode: "direct", error: err.message || String(err) };
  }
}

/**
 * Post to TikTok via the Content Posting API (Direct Post, PULL_FROM_URL).
 * Photos use `/v2/post/publish/content/init/`; videos `/v2/post/publish/video/init/`.
 * Returns `null` when not enabled so callers can fall back to Buffer/webhook.
 * Note: publishing is asynchronous — `publish_id` is returned; the post materializes
 * on TikTok after processing. Public posts require the app to pass TikTok audit
 * (unaudited apps can only post with a private privacy level → error surfaced).
 */
async function publishTikTokDirect({ text = "", imageUrl, videoUrl, privacyLevel }, db) {
  const cfg = getTikTokDirectConfig(db);
  if (!cfg.enabled) return null;
  if (!cfg.accessToken) {
    return { ok: false, error: "TikTok Direct: configure o Access Token em Settings → Integrations → TikTok Direct." };
  }

  const isVideo = !!videoUrl;
  if (!isVideo && !imageUrl) {
    return { ok: false, error: "TikTok Direct requer uma URL de imagem ou vídeo." };
  }

  const api = "open.tiktokapis.com";
  const headers = { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" };
  const path = isVideo ? "/v2/post/publish/video/init/" : "/v2/post/publish/content/init/";
  const body = isVideo
    ? buildTikTokVideoPost({ text, videoUrl, privacyLevel })
    : buildTikTokPhotoPost({ text, imageUrl, privacyLevel });

  try {
    const res = await httpsRequest(api, "POST", headers, body, { path });
    if (res.status >= 200 && res.status < 300 && res.body && res.body.data && res.body.data.publish_id) {
      return { ok: true, platform: "tiktok", mode: "direct", publishId: res.body.data.publish_id };
    }
    const errBody = res.body && (res.body.error || res.body);
    const msg = (errBody && (errBody.message || errBody.code)) || JSON.stringify(res.body);
    return { ok: false, platform: "tiktok", mode: "direct", error: `TikTok Direct: ${msg}` };
  } catch (err) {
    return { ok: false, platform: "tiktok", mode: "direct", error: `TikTok Direct: ${err.message || String(err)}` };
  }
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

  const tw = getTwitterDirectConfig(db);
  if (!tw.enabled || !tw.apiKey || !tw.apiSecret || !tw.accessToken || !tw.accessTokenSecret) {
    results.twitter = { configured: tw.enabled && !!(tw.apiKey && tw.apiSecret && tw.accessToken && tw.accessTokenSecret), ok: false, mode: "direct", error: "Not configured (enable + API Key/Secret + Access Token/Secret)." };
  } else {
    try {
      const auth = buildOAuth1Authorization({
        method: "GET",
        url: "https://api.x.com/2/users/me",
        consumerKey: tw.apiKey,
        consumerSecret: tw.apiSecret,
        token: tw.accessToken,
        tokenSecret: tw.accessTokenSecret,
      });
      const res = await httpsRequest("api.x.com", "GET", { Authorization: auth }, null, { path: "/2/users/me" });
      if (res.status === 200 && res.body?.data) {
        results.twitter = { configured: true, ok: true, mode: "direct", username: res.body.data.username || res.body.data.name || null };
      } else {
        results.twitter = { configured: true, ok: false, mode: "direct", error: JSON.stringify(res.body?.errors || res.body) };
      }
    } catch (err) {
      results.twitter = { configured: true, ok: false, mode: "direct", error: err.message };
    }
  }

  const tt = getTikTokDirectConfig(db);
  if (!tt.enabled || !tt.accessToken) {
    results.tiktok = { configured: tt.enabled && !!tt.accessToken, ok: false, mode: "direct", error: "Not configured (enable + accessToken)." };
  } else {
    try {
      const res = await httpsRequest("open.tiktokapis.com", "GET", { Authorization: `Bearer ${tt.accessToken}` }, null, { path: "/v2/user/info/" });
      if (res.status === 200 && res.body?.data) {
        results.tiktok = { configured: true, ok: true, mode: "direct", username: res.body.data.user?.display_name || res.body.data.user?.open_id || null };
      } else {
        results.tiktok = { configured: true, ok: false, mode: "direct", error: JSON.stringify(res.body?.error || res.body) };
      }
    } catch (err) {
      results.tiktok = { configured: true, ok: false, mode: "direct", error: err.message };
    }
  }

  return results;
}

// ── Public API ─────────────────────────────────────────────────────────────

async function publish({ platform, text, hook, hashtags, imageUrl, videoUrl, format }, db) {
  const fullText = [hook, text].filter(Boolean).join("\n\n");
  const hashtagStr = Array.isArray(hashtags) && hashtags.length
    ? "\n\n" + hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
    : "";
  const finalText = fullText + hashtagStr;

  // X and TikTok Direct (native APIs) — fall back to Buffer/webhook when not enabled.
  if (platform === "twitter") {
    const direct = await publishTwitterDirect({ text: finalText, imageUrl, videoUrl }, db);
    if (direct) return direct;
  } else if (platform === "tiktok") {
    const direct = await publishTikTokDirect({ imageUrl, videoUrl, text: finalText }, db);
    if (direct) return direct;
  }

  // Direct API platforms (Instagram Direct, LinkedIn Direct)
  if (DIRECT_PLATFORMS.includes(platform)) {
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
  publishTwitterDirect,
  publishTikTokDirect,
  testDirectPlatforms,
  getInstagramAccounts,
  _helpers: {
    buildOAuth1Authorization,
    buildTwitterMediaForm,
    buildTikTokPhotoPost,
    buildTikTokVideoPost,
    getTwitterDirectConfig,
    getTikTokDirectConfig,
  },
};
