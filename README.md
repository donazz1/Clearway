# Clearway

A simple, private budget tool — plus a companion vehicle/rideshare decision model. Sign in with an email/password account and your budget data syncs live across every device via Firebase (Auth + Firestore), with offline support. `decision-lab.html` stays local-only, no account needed.

## What's in here

- `index.html` — the core budget app. Income, expense categories, "What if…" mode, print/share, account sign-in + cloud sync.
- `decision-lab.html` — "The Big Decision." Vehicle replacement cost modeling, a multi-factor go/no-go scorecard, and a rideshare/robotaxi income module (driver-operated and passive/autonomous scenarios). Linked from the main app's action bar. Purely local storage, no account.
- `manifest.json` + `icons/` — makes the app installable to a Mac Dock or phone home screen with a proper icon, instead of just a bookmark.
- `firestore.rules` — the security rules to paste into the Firebase console (Firestore → Rules) so each account can only read/write its own data.

Both pages are one system — same look, same storage pattern, cross-linked — but live as two files so the core budget stays generic and the vehicle-specific modeling doesn't clutter it.

## Firebase setup (one-time)

1. [console.firebase.google.com](https://console.firebase.google.com) → create a project (e.g. `clearway-app`).
2. Build → Authentication → Sign-in method → enable **Email/Password**.
3. Build → Firestore Database → Create database.
4. Firestore → Rules tab → paste in the contents of `firestore.rules` → Publish.
5. Project settings → your apps → add a **Web app** → copy the `firebaseConfig` object → paste it into the `firebaseConfig` block near the top of the first `<script type="module">` in `index.html` (replacing the `REPLACE_ME` placeholders).

Data model: one Firestore document per signed-in user, at `users/{uid}`, holding the same JSON shape `blankState()`/`normalizeState()` already use — income, expense categories, notes, settings, activity log.

## Getting it live

Runs as a plain static site — no build step, no server code. Firebase's client SDK loads straight from Google's CDN as ES module imports, so GitHub Pages is still all the hosting this needs.

1. Create the repo `ClearWay` on GitHub (empty, no template).
2. In GitHub Desktop: clone it into `~/GitHub/ClearWay`.
3. Drop all the files from this folder (`index.html`, `decision-lab.html`, `manifest.json`, `icons/`) straight into that repo folder — flat, no subfolder for the HTML files.
4. Commit and push via GitHub Desktop, same as your other repos.
5. On GitHub: repo **Settings → Pages** → deploy from the `main` branch, root folder. GitHub will give you a URL like `https://<username>.github.io/ClearWay/`.
6. Open that URL in Safari → **Share → Add to Dock** (Mac) or **Add to Home Screen** (iPhone). The icon and "Clearway" name will show up properly now that the manifest is wired in.

## Two layers of protection

- **Account sign-in** (Firebase Auth) — controls who your data even belongs to, and what syncs where.
- **On-device password lock** (Settings → Security, optional) — a separate, faster re-lock for this specific device (e.g. someone picks up your already-signed-in phone). Encrypts this device's local copy; doesn't touch the account or the cloud copy either way.

## Notes on the numbers

- The decision lab's per-mile fields (operating cost, average speed) are labeled in km/h and $/km for Canadian use — the underlying formulas are unit-agnostic, so no conversion was applied. Whatever number goes in is treated as-is.
- The passive/robotaxi presets are grounded in Cern Basher's (@CernBasher on X) published take-rate modeling, not an official Tesla figure — there's no live program in Canada yet, and every input is editable as real terms emerge.
