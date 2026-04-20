import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { config } from './config.js';

let client = null;

/**
 * Returns a connected, authenticated TelegramClient.
 * Re-uses the existing client if already connected.
 */
export async function getClient() {
  if (client) return client;

  const session = new StringSession(config.TG_SESSION);
  client = new TelegramClient(session, config.TG_API_ID, config.TG_API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram');
  return client;
}

/**
 * Disconnect cleanly.
 */
export async function disconnect() {
  if (client) {
    await client.disconnect();
    client = null;
  }
}

/**
 * Fetches the latest posts from a public channel username (e.g. "@bbcnews").
 * Returns an array of normalised post objects.
 */
export async function fetchChannelPosts(username) {
  const tg = await getClient();
  const messages = [];

  try {
    const result = await tg.getMessages(username, {
      limit: config.POSTS_LIMIT,
    });

    for (const msg of result) {
      if (!msg || !msg.id) continue;

      messages.push(normaliseMessage(msg, username));
    }
  } catch (err) {
    console.error(`❌ Failed to fetch ${username}: ${err.message}`);
  }

  return messages;
}

/**
 * Converts a raw Telegram message into a flat, serialisable object.
 */
function normaliseMessage(msg, username) {
  const base = {
    id: msg.id,
    channel: username.replace('@', ''),
    date: new Date(msg.date * 1000).toISOString(),
    text: msg.message || '',
    views: msg.views || 0,
    forwards: msg.forwards || 0,
    media: null,
  };

  if (!msg.media) return base;

  const className = msg.media.className;

  // ── Photo ──────────────────────────────────────────────────────────────────
  if (className === 'MessageMediaPhoto') {
    base.media = {
      type: 'photo',
      available: true,
      rawMedia: msg.media,            // kept for download step
      telegramLink: `https://t.me/${base.channel}/${msg.id}`,
    };
    return base;
  }

  // ── Document (video, gif, audio, file …) ───────────────────────────────────
  if (className === 'MessageMediaDocument') {
    const doc = msg.media.document;
    const mime = doc?.mimeType || '';

    if (mime.startsWith('video/')) {
      base.media = {
        type: 'video',
        available: false,
        mimeType: mime,
        duration: doc.attributes?.find(a => a.className === 'DocumentAttributeVideo')?.duration || null,
        telegramLink: `https://t.me/${base.channel}/${msg.id}`,
      };
      return base;
    }

    if (mime === 'image/gif' || doc.attributes?.some(a => a.className === 'DocumentAttributeAnimated')) {
      base.media = {
        type: 'gif',
        available: false,
        telegramLink: `https://t.me/${base.channel}/${msg.id}`,
      };
      return base;
    }

    if (mime.startsWith('audio/')) {
      base.media = {
        type: 'audio',
        available: false,
        mimeType: mime,
        telegramLink: `https://t.me/${base.channel}/${msg.id}`,
      };
      return base;
    }

    // Generic document / file
    base.media = {
      type: 'document',
      available: false,
      mimeType: mime,
      telegramLink: `https://t.me/${base.channel}/${msg.id}`,
    };
    return base;
  }

  // ── Poll ───────────────────────────────────────────────────────────────────
  if (className === 'MessageMediaPoll') {
    base.media = {
      type: 'poll',
      available: false,
      question: msg.media.poll?.question || '',
      telegramLink: `https://t.me/${base.channel}/${msg.id}`,
    };
    return base;
  }

  // ── Web page preview — treat as text, no media ────────────────────────────
  if (className === 'MessageMediaWebPage') {
    return base;
  }

  // Fallback for any unknown type
  base.media = {
    type: 'unknown',
    available: false,
    telegramLink: `https://t.me/${base.channel}/${msg.id}`,
  };
  return base;
}

/**
 * Downloads a photo buffer from Telegram (used only for photos).
 */
export async function downloadPhoto(rawMedia) {
  const tg = await getClient();
  try {
    const buffer = await tg.downloadMedia(rawMedia, { outputFile: Buffer.alloc(0) });
    return buffer;
  } catch (err) {
    console.error(`  ⚠️  Photo download failed: ${err.message}`);
    return null;
  }
}
