/**
 * Escapes special characters for safe XML output.
 */
function esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a channel config object + its processed posts into an XML string.
 *
 * @param {object}   channelMeta  - entry from channels.json
 * @param {object[]} posts        - normalised post objects (with processedImage attached)
 * @returns {string} full XML document
 */
export function buildChannelXml(channelMeta, posts) {
  const username = channelMeta.username.replace('@', '');
  const generatedAt = new Date().toISOString();

  const postElements = posts.map(post => buildPostXml(post)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<channel>
  <meta>
    <name>${esc(channelMeta.name)}</name>
    <username>${esc(username)}</username>
    <category>${esc(channelMeta.category)}</category>
    <members>${esc(channelMeta.members)}</members>
    <profile>${esc(channelMeta.profile)}</profile>
    <telegram_link>https://t.me/${esc(username)}</telegram_link>
    <generated_at>${generatedAt}</generated_at>
  </meta>
  <posts>
${postElements}
  </posts>
</channel>`;
}

/**
 * Builds the <post> XML element for a single message.
 */
function buildPostXml(post) {
  const mediaXml = buildMediaXml(post);

  return `    <post id="${esc(post.id)}">
      <date>${esc(post.date)}</date>
      <text>${esc(post.text)}</text>
      <views>${esc(post.views)}</views>
      <forwards>${esc(post.forwards)}</forwards>
${mediaXml}
    </post>`;
}

/**
 * Builds the <media> element based on media type.
 */
function buildMediaXml(post) {
  if (!post.media) {
    return '      <media type="none"/>';
  }

  const { type, available, telegramLink } = post.media;

  // ── Photo (downloaded and compressed) ────────────────────────────────────
  if (type === 'photo' && available && post.processedImage) {
    const img = post.processedImage;
    return `      <media type="photo" available="true">
        <file>${esc(img.repoPath)}</file>
        <width>${esc(img.width)}</width>
        <height>${esc(img.height)}</height>
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
  }

  // ── Photo download failed ─────────────────────────────────────────────────
  if (type === 'photo') {
    return `      <media type="photo" available="false">
        <note>Image download failed</note>
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
  }

  // ── Video ─────────────────────────────────────────────────────────────────
  if (type === 'video') {
    const dur = post.media.duration ? `\n        <duration_seconds>${esc(post.media.duration)}</duration_seconds>` : '';
    return `      <media type="video" available="false">
        <mime_type>${esc(post.media.mimeType)}</mime_type>${dur}
        <note>Video not stored — view on Telegram</note>
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
  }

  // ── GIF ───────────────────────────────────────────────────────────────────
  if (type === 'gif') {
    return `      <media type="gif" available="false">
        <note>GIF not stored — view on Telegram</note>
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  if (type === 'audio') {
    return `      <media type="audio" available="false">
        <mime_type>${esc(post.media.mimeType)}</mime_type>
        <note>Audio not stored — view on Telegram</note>
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
  }

  // ── Poll ──────────────────────────────────────────────────────────────────
  if (type === 'poll') {
    return `      <media type="poll" available="false">
        <question>${esc(post.media.question)}</question>
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
  }

  // ── Document / Unknown ────────────────────────────────────────────────────
  return `      <media type="${esc(type)}" available="false">
        <telegram_link>${esc(telegramLink)}</telegram_link>
      </media>`;
}
