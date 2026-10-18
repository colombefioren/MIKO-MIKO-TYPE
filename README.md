<p align="center"><img src="public/assets/images/mikomiko-logo.webp" alt="Miko-Miko Type" width="280" /></p>

# Miko-Miko Type

Miko-Miko Type is a typing test with a social side: save your results, climb a live leaderboard, add friends, chat in real time and share your best runs with the community.

Built with plain HTML, CSS and vanilla JavaScript (ES modules, no build step) on top of [Supabase](https://supabase.com) for auth, Postgres, storage and realtime websockets.

Miko-Miko Type started as a WEB1 exam project by [Colombe](https://github.com/colombefioren) (STD24176) and [Mihaja](https://github.com/Whipander) (STD24126) at HEI.

## Features

### Typing test

- Difficulty: easy, medium, hard
- Content mix: words, numbers, symbols, code
- Length: 15, 30 or 50 words
- Live progress and speed, a three-line scrolling text window and a smooth caret
- Standard scoring: WPM from correctly typed words, raw WPM, keystroke accuracy and a correct / incorrect / extra / missed breakdown
- Speed chart with per-second raw speed and errors, plus confetti when you finish (extra for a personal best)
- Backspace into the previous word to fix a mistake
- <kbd>Tab</kbd> restarts, <kbd>Enter</kbd> starts the next test
- Works without an account: guest results are kept in the browser, and logging in from the results screen saves the last test

### Profile

- Best and average WPM and accuracy, test count and a history chart
- Full test history with pagination, friends list with online status
- Settings: username, bio, profile picture and password

### Community

- Feed with text, images, #hashtags and shared test results
- Likes and comments with live counters
- Direct messages between friends with live delivery, unread counts and a typing indicator
- Inbox for friend requests, accepted requests, likes and comments
- Friend search, requests and online presence

### Leaderboard

- Best result per typist, filterable by difficulty
- Updates live when anyone finishes a test

### Everywhere

- Navy dark theme by default, with a light theme toggle
- Sidebar from the original design with a sliding highlight (collapse with <kbd>Ctrl</kbd>+<kbd>Esc</kbd>), bottom tab bar on phones
- Animated page transitions
- Keyboard accessible, with visible focus and reduced-motion support

## Running locally

Requirements: Node 20+, Docker, Python 3 (or any static file server).

```bash
npm run db:start   # starts Supabase in Docker and applies supabase/migrations
npm run dev        # serves the site on http://127.0.0.1:5500
```

Open <http://127.0.0.1:5500>. On `localhost` and `127.0.0.1` the app connects to the local Supabase automatically (see `public/js/config.js`). Email confirmation is off locally, so new accounts can log in right away.

Other commands:

```bash
npm test           # unit tests for scoring and word generation
npm run db:reset   # wipe the local database and re-apply migrations
npm run db:stop    # stop the local Supabase containers
```

## Importing Miko-Miko data

Backups of the old Miko-Miko project (a `pg_dumpall` `.gz` file and the storage `.zip`) can be imported into the current database:

```bash
npm run db:import-legacy -- /path/to/backup.gz /path/to/storage.zip
```

This keeps every account with its existing password, profiles, typing results, friend requests, posts with images, likes, comments and chats. Usernames are adjusted to the new format (spaces become underscores) and old images are re-uploaded into each owner's folder. Old results had no word count or duration, so those are stored as a 30-word test with an estimated time. Running it twice is refused.

By default it targets the local stack. For a hosted project, set `DB_URL`, `SUPABASE_URL` and `SERVICE_ROLE_KEY` first (see the header of `scripts/import-legacy.sh`). Requires `python3`, `psql`, `unzip` and `curl`.

## Deploying

1. Create a project on [supabase.com](https://supabase.com).
2. Apply the schema:
   ```bash
   npx supabase@2.121.0 link --project-ref <your-project-ref>
   npx supabase@2.121.0 db push
   ```
3. In `public/js/config.js`, fill `PRODUCTION` with the project URL and the **anon (public)** key. Never put the service role key in the frontend.
4. In the Supabase dashboard, under Authentication, set the Site URL to your deployed address.
5. Deploy the repository root to any static host (Vercel, Netlify, GitHub Pages).

If `PRODUCTION` is left empty, the deployed site still works as a guest-only typing test.

## Project structure

```
index.html                     typing test
pages/                         profile, community, leaderboard
public/css/
  tokens.css                   fonts, colours (dark and light), radii
  base.css, layout.css         reset, utilities, header, tab bar, page container
  sidebar.css, transitions.css desktop sidebar, page transitions
  components/                  controls, dialogs and toasts, auth dialog, shared content
  pages/                       one stylesheet per page
public/js/
  config.js                    Supabase URL and anon key
  lib/                         DOM helpers, routes, formatting, theme, toasts, Supabase client
  services/                    data access: auth, profiles, results, social, friends, chat, notifications, realtime
  game/                        word lists, generator, scoring, typing engine, word view, charts
  ui/
    shell/                     header, sidebar, inbox badge, page transitions
    auth/                      login and sign-up dialog
    common/                    tabs, pagination, confirm dialog, presence dots, button actions
    type/                      test options, results view, saving and sharing, confetti
    profile/                   profile header, stats, paged history, friends, settings
    community/                 feed (posts, comments, composer), side panel tabs, chat window
  pages/                       one small entry module per page
supabase/migrations/           database schema, row level security, triggers, realtime and storage
scripts/                       Miko-Miko backup import
tests/                         node:test unit tests
```

Each page loads one entry module from `public/js/pages/`, which wires the UI modules together. UI modules never talk to Supabase directly; they go through `services/`.

## Security notes

- Every table has row level security. Users can only write their own rows; messages are visible to chat members only.
- Profile stats, notifications and chat timestamps are written by database triggers, so clients cannot forge them.
- Results are checked by database constraints (for example, WPM above 350 is rejected).
- User content is always rendered as text, never as HTML.
- Third-party scripts are pinned to exact versions with Subresource Integrity.

## Credits

Logo: Mimi and Coco, the Miko-Miko mascots. Fonts: [Geist](https://vercel.com/font) and [Cascadia Mono](https://github.com/microsoft/cascadia-code) (SIL Open Font License). Icons: [Phosphor](https://phosphoricons.com). Charts: [Chart.js](https://www.chartjs.org).
