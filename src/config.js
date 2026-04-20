import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Telegram API credentials (from my.telegram.org)
  TG_API_ID: parseInt(process.env.TG_API_ID, 10),
  TG_API_HASH: process.env.TG_API_HASH,
  TG_SESSION: process.env.TG_SESSION || '',

  // GitHub credentials
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_OWNER: process.env.GITHUB_OWNER,       // your GitHub username
  GITHUB_REPO: process.env.GITHUB_REPO,         // repo name
  GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',

  // How many posts to fetch per channel per run
  POSTS_LIMIT: parseInt(process.env.POSTS_LIMIT || '20', 10),

  // Max image size in bytes (default 1MB)
  MAX_IMAGE_BYTES: parseInt(process.env.MAX_IMAGE_BYTES || String(1 * 1024 * 1024), 10),

  // Dry run — skips GitHub commit (useful for local testing)
  DRY_RUN: process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true',
};
