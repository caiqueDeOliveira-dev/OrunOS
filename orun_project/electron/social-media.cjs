// electron/social-media.cjs
//
// Social media publishing via n8n webhooks. Each platform (Instagram, TikTok,
// X/Twitter) has its own webhook URL configured by the user. When the Social
// Media agent generates content, this module sends it to the matching n8n
// workflow which handles the actual OAuth posting.

const n8n = require("./n8n.cjs");

const PLATFORMS = ["instagram", "tiktok", "twitter"];

/**
 * Get the social media webhook config from settings.
 * Shape: { instagram: { webhookUrl, headerName?, headerValue? }, tiktok: {...}, twitter: {...} }
 */
function getConfig(db) {
  return db.getSetting("socialMediaWebhooks", {});
}

function setConfig(db, cfg) {
  db.setSetting("socialMediaWebhooks", cfg);
}

/**
 * Publish content to a single platform via its n8n webhook.
 *
 * @param {object} opts
 * @param {string} opts.platform - "instagram" | "tiktok" | "twitter"
 * @param {string} opts.text - The post text / caption
 * @param {string} [opts.hook] - Attention hook (first line)
 * @param {string[]} [opts.hashtags] - Hashtag list
 * @param {string} [opts.imageUrl] - Optional image URL for the post
 * @param {string} [opts.videoUrl] - Optional video URL for Reels/TikTok
 * @param {string} [opts.format] - Content format (stories, reels, carousel, post, thread)
 * @param {object} db - Database instance
 */
async function publish({ platform, text, hook, hashtags, imageUrl, videoUrl, format }, db) {
  if (!PLATFORMS.includes(platform)) {
    return { ok: false, error: `Unknown platform: "${platform}". Supported: ${PLATFORMS.join(", ")}` };
  }

  const config = getConfig(db);
  const platformCfg = config[platform];

  if (!platformCfg?.webhookUrl) {
    return {
      ok: false,
      error: `No webhook configured for ${platform}. Go to Settings → Social Media and add the n8n webhook URL for ${platform}.`,
    };
  }

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

/**
 * Publish to multiple platforms at once.
 * @param {object} opts
 * @param {string[]} opts.platforms - List of platform names
 * @param {string} opts.text
 * @param {string} [opts.hook]
 * @param {string[]} [opts.hashtags]
 * @param {string} [opts.imageUrl]
 * @param {string} [opts.videoUrl]
 * @param {string} [opts.format]
 * @param {object} db
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
  const config = getConfig(db);
  const results = {};

  for (const platform of PLATFORMS) {
    const cfg = config[platform];
    if (!cfg?.webhookUrl) {
      results[platform] = { configured: false };
      continue;
    }
    try {
      await n8n.triggerWebhook({
        webhookUrl: cfg.webhookUrl,
        payload: { body: { platform, text: "test", timestamp: new Date().toISOString() } },
        headerName: cfg.headerName,
        headerValue: cfg.headerValue,
      });
      results[platform] = { configured: true, ok: true };
    } catch (err) {
      results[platform] = { configured: true, ok: false, error: err.message };
    }
  }

  return results;
}

module.exports = { PLATFORMS, getConfig, setConfig, publish, publishMulti, testPlatforms };
