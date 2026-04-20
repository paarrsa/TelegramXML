import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { createInterface } from 'readline';

const apiId = parseInt(process.env.TG_API_ID, 10);
const apiHash = process.env.TG_API_HASH;

if (!apiId || !apiHash) {
  console.error('❌ Please set TG_API_ID and TG_API_HASH environment variables.');
  process.exit(1);
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
  connectionRetries: 5,
  proxy: {
    ip: '127.0.0.1',
    port: 10808,
    socksType: 5,
    timeout: 20,
  },
});

await client.start({
  phoneNumber: async () => await ask('📱 Phone number (with country code, e.g. +989123456789): '),
  password:    async () => await ask('🔑 2FA password (press Enter if none): '),
  phoneCode:   async () => await ask('📨 Code from Telegram app: '),
  onError: (err) => console.error(err),
});

console.log('\n✅ Authentication successful!');
console.log('\n🔐 Your TG_SESSION string (copy this into GitHub Actions secrets):\n');
console.log(client.session.save());
console.log('\n');

await client.disconnect();