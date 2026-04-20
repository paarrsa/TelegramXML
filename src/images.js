import sharp from 'sharp';
import path from 'path';
import { downloadPhoto } from './telegram.js';
import { config } from './config.js';

/**
 * Downloads a Telegram photo, compresses it to under MAX_IMAGE_BYTES,
 * and returns { filename, buffer, width, height } or null on failure.
 *
 * @param {object} post  - normalised post object
 */
export async function processPhoto(post) {
  const { channel, id, media } = post;

  console.log(`  📷 Downloading photo for ${channel}/${id}…`);
  const rawBuffer = await downloadPhoto(media.rawMedia);
  if (!rawBuffer || rawBuffer.length === 0) return null;

  const filename = `${channel}__${id}__photo.jpg`;

  try {
    const compressed = await compressToLimit(rawBuffer, config.MAX_IMAGE_BYTES);
    const meta = await sharp(compressed).metadata();

    console.log(`  ✅ Photo compressed: ${filename} (${(compressed.length / 1024).toFixed(0)} KB)`);
    return {
      filename,
      repoPath: `img/${filename}`,
      buffer: compressed,
      width: meta.width,
      height: meta.height,
    };
  } catch (err) {
    console.error(`  ⚠️  Compression failed for ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Iteratively reduces JPEG quality until the buffer fits within maxBytes.
 * Starts at quality 85 and steps down by 10 each round.
 */
async function compressToLimit(inputBuffer, maxBytes) {
  let quality = 85;

  // First try: resize to max 1200px wide and convert to JPEG
  let result = await sharp(inputBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (result.length > maxBytes && quality > 20) {
    quality -= 10;
    result = await sharp(inputBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  // If still too large after quality reduction, shrink dimensions too
  if (result.length > maxBytes) {
    result = await sharp(inputBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 60, mozjpeg: true })
      .toBuffer();
  }

  return result;
}
