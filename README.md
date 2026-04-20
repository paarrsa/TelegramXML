# tg-xml-feed

Fetches the latest posts from Telegram public channels every 10 minutes,
converts them to XML files, compresses photos under 1 MB, and commits
everything to a GitHub repository — all powered by GitHub Actions (free).

---

## How it works

```
channels.json → Scheduler (GitHub Actions cron)
                     ↓
            Telegram MTProto API (gramjs)
                     ↓
         ┌───────────┴───────────┐
      Posts → XML          Photos → sharp (compressed)
         └───────────┬───────────┘
                     ↓
          GitHub commit (one commit per run)
                     ↓
          repo/channels/*.xml + repo/img/*.jpg
```

Media handling:

- **Photos** → downloaded, compressed to under 1 MB, saved to `img/`
- **Videos** → NOT downloaded; flagged in XML with a Telegram link
- **GIFs, audio, polls, documents** → flagged in XML, not stored

---

## Prerequisites

- A GitHub account
- Node.js 18+ installed on your computer (for the one-time session setup)
- A Telegram account (personal account — not a bot)

---

## Step 1 — Get your Telegram API credentials

1. Go to [https://my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your phone number
3. Click **"Create new application"** (fill in any name/description)
4. Copy your **App api_id** (a number) and **App api_hash** (a long hex string)

Keep these safe — treat them like passwords.

---

## Step 2 — Generate a Telegram session string (one-time, on your computer)

The session string lets GitHub Actions authenticate to Telegram without
re-entering your phone number every run.

Install dependencies first:

```bash
npm install
```

Then run:

```bash
TG_API_ID=YOUR_ID TG_API_HASH=YOUR_HASH node get-session.js
```

It will ask for:

1. Your phone number (with country code, e.g. `+905551234567`)
2. The code Telegram sends to your app
3. Your 2FA password (press Enter if you don't have one)

When done, it prints a long string like:

```
1BVtsOKEBu3Qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
```

**Copy that entire string.** You will not need to run this again.

---

## Step 3 — Create a GitHub repository

1. Go to [https://github.com/new](https://github.com/new)
2. Create a **public or private** repository (e.g. `tg-feed-data`)
3. Initialize it with a README so it has a `main` branch

---

## Step 4 — Create a GitHub Personal Access Token (PAT)

The script needs write access to commit files to your repo.

1. Go to [https://github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
   (Fine-grained tokens — more secure)
2. Click **"Generate new token"**
3. Set:
   - **Token name**: `tg-xml-feed`
   - **Expiration**: choose what suits you (90 days recommended, then rotate)
   - **Repository access**: select only your feed repo
   - **Permissions** → Repository permissions:
     - **Contents**: Read and write
     - **Metadata**: Read-only (auto-selected)
4. Click **Generate token** and copy it immediately (you won't see it again)

---

## Step 5 — Add secrets to your feed repository

In your GitHub feed repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"** for each of the following:

| Secret name    | Value                                           |
| -------------- | ----------------------------------------------- |
| `TG_API_ID`    | Your Telegram API ID (just the number)          |
| `TG_API_HASH`  | Your Telegram API hash                          |
| `TG_SESSION`   | The session string from Step 2                  |
| `GH_PAT`       | The Personal Access Token from Step 4           |
| `GITHUB_OWNER` | Your GitHub username                            |
| `GITHUB_REPO`  | Your feed repository name (e.g. `tg-feed-data`) |

> **Why `GH_PAT` and not `GITHUB_TOKEN`?**
> GitHub Actions provides a built-in `GITHUB_TOKEN`, but it cannot trigger
> other workflows or write to repos outside the current one. Using your own
> PAT avoids this limitation.

---

## Step 6 — Edit channels.json

Open `channels.json` and replace the example channels with the ones you
want to follow:

```json
[
  {
    "name": "BBC News",
    "username": "@bbcnews",
    "profile": "https://example.com/bbcnews.png",
    "category": "news",
    "members": 2400000
  }
]
```

Only `username` is required. All other fields are optional metadata that
gets written into the XML.

---

## Step 7 — Push this project to your feed repository

```bash
cd tg-xml-feed

git init
git remote add origin https://github.com/YOUR_USERNAME/tg-feed-data.git
git add .
git commit -m "init: tg-xml-feed"
git push -u origin main
```

---

## Step 8 — Enable GitHub Actions

1. In your repository, go to the **Actions** tab
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. You should see **"Fetch Telegram Feeds"** listed

To trigger it immediately (without waiting for the cron):

1. Click on **"Fetch Telegram Feeds"**
2. Click **"Run workflow"** → **"Run workflow"**
3. Watch the logs — it should connect to Telegram, fetch posts, and commit

After the first successful run, your repo will have:

```
channels/
  bbcnews.xml
img/
  bbcnews__12345__photo.jpg
channels.json
src/
.github/
```

---

## Adjusting the schedule

The default is every 10 minutes. To change it, edit `.github/workflows/fetch.yml`:

```yaml
on:
  schedule:
    - cron: "*/10 * * * *" # every 10 min
    # - cron: '*/5 * * * *'  # every 5 min
    # - cron: '0 * * * *'    # every hour
```

> **Note:** GitHub Actions cron has a minimum resolution of 1 minute.
> Very frequent runs (every 5 min) on many channels may cause Telegram
> to rate-limit your account temporarily. 10 minutes is recommended.

---

## XML output format

Each channel gets its own file at `channels/CHANNELNAME.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<channel>
  <meta>
    <n>BBC News</n>
    <username>bbcnews</username>
    <category>news</category>
    <members>2400000</members>
    <telegram_link>https://t.me/bbcnews</telegram_link>
    <generated_at>2024-04-20T12:00:00.000Z</generated_at>
  </meta>
  <posts>
    <post id="9821">
      <date>2024-04-20T11:45:00.000Z</date>
      <text>Breaking: something happened.</text>
      <views>142000</views>
      <forwards>3200</forwards>
      <media type="photo" available="true">
        <file>img/bbcnews__9821__photo.jpg</file>
        <width>1200</width>
        <height>675</height>
        <telegram_link>https://t.me/bbcnews/9821</telegram_link>
      </media>
    </post>

    <post id="9820">
      <date>2024-04-20T10:30:00.000Z</date>
      <text>Another update with a video.</text>
      <views>98000</views>
      <forwards>1800</forwards>
      <media type="video" available="false">
        <mime_type>video/mp4</mime_type>
        <duration_seconds>47</duration_seconds>
        <note>Video not stored — view on Telegram</note>
        <telegram_link>https://t.me/bbcnews/9820</telegram_link>
      </media>
    </post>
  </posts>
</channel>
```

---

## Troubleshooting

**"AUTH_KEY_UNREGISTERED" or session errors**
Your session has expired. Re-run `get-session.js` locally and update
the `TG_SESSION` secret.

**"FLOOD_WAIT_X" errors**
Telegram is rate-limiting you. Increase the interval in the cron, or
reduce `POSTS_LIMIT` in the workflow env vars.

**"Bad credentials" from GitHub**
Your PAT has expired or the `GH_PAT` secret is wrong. Regenerate the
token and update the secret.

**Images missing from commits**
Check the Actions log for `⚠️ Photo download failed`. This usually means
the post's media expired on Telegram's CDN. It is not a bug — Telegram
occasionally removes old media from their servers.
