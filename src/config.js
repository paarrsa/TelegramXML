import dotenv from 'dotenv';
dotenv.config();

export const config = {
  TG_API_ID: parseInt(process.env.TG_API_ID, 10),
  TG_API_HASH: process.env.TG_API_HASH,
  TG_SESSION: process.env.TG_SESSION || '',

  GITHUB_TOKEN: process.env.GITHUB_PAT,        // ← was GITHUB_TOKEN, now reads GITHUB_PAT
  GITHUB_OWNER: process.env.GITHUB_OWNER,
  GITHUB_REPO: process.env.GITHUB_REPO,
  GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',

  POSTS_LIMIT: parseInt(process.env.POSTS_LIMIT || '20', 10),
  MAX_IMAGE_BYTES: parseInt(process.env.MAX_IMAGE_BYTES || String(1 * 1024 * 1024), 10),
  DRY_RUN: process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true',
};