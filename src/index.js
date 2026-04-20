import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { config } from './config.js';
import { fetchChannelPosts, disconnect } from './telegram.js';
import { processPhoto } from './images.js';
import { buildChannelXml } from './xml.js';
import { commitFiles } from './github.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🚀 tg-xml-feed starting…');
  console.log(`   DRY RUN: ${config.DRY_RUN}`);

  // Load channel list
  const channelsPath = path.resolve(__dirname, '../channels.json');
  const channels = JSON.parse(readFileSync(channelsPath, 'utf-8'));
  console.log(`📋 Channels to fetch: ${channels.map(c => c.username).join(', ')}\n`);

  const filesToCommit = [];
  const now = new Date().toISOString();

  for (const channelMeta of channels) {
    const username = channelMeta.username;
    console.log(`\n── ${username} ──────────────────────────`);

    // 1. Fetch posts
    const posts = await fetchChannelPosts(username);
    console.log(`   Fetched ${posts.length} post(s)`);

    // 2. Process media for each post
    for (const post of posts) {
      if (post.media?.type === 'photo' && post.media.available) {
        const imgResult = await processPhoto(post);
        if (imgResult) {
          post.processedImage = imgResult;
          filesToCommit.push({
            path: `img/${imgResult.filename}`,
            content: imgResult.buffer,
          });
        } else {
          // Mark as failed so XML reflects it correctly
          post.media.available = false;
        }
      }

      // Rate-limit: 1 request per second for Telegram API safety
      await sleep(1000);
    }

    // 3. Build XML
    const xml = buildChannelXml(channelMeta, posts);
    const xmlFilename = `channels/${username.replace('@', '')}.xml`;

    filesToCommit.push({
      path: xmlFilename,
      content: xml,
    });

    console.log(`   📄 XML built → ${xmlFilename}`);
  }

  // 4. Commit everything to GitHub in one go
  console.log(`\n📦 Files to commit: ${filesToCommit.length}`);

  if (config.DRY_RUN) {
    console.log('⚠️  DRY RUN — skipping GitHub commit.');
    console.log('   Files that would be committed:');
    filesToCommit.forEach(f => console.log(`   • ${f.path}`));
  } else {
    await commitFiles(
      filesToCommit,
      `chore: update channel feeds [${now}]`
    );
  }

  // 5. Disconnect from Telegram
  await disconnect();
  console.log('\n✅ Done.');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
