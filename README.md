# Clearway

A simple, private budget tool — plus a companion vehicle/rideshare decision model. No accounts, no backend. Everything saves to the browser's local storage on whatever device it's opened on.

## What's in here

- `index.html` — the core budget app. Income, expense categories, "What if…" mode, print/share.
- `decision-lab.html` — "The Big Decision." Vehicle replacement cost modeling, a multi-factor go/no-go scorecard, and a rideshare/robotaxi income module (driver-operated and passive/autonomous scenarios). Linked from the main app's action bar.
- `manifest.json` + `icons/` — makes the app installable to a Mac Dock or phone home screen with a proper icon, instead of just a bookmark.

Both pages are one system — same look, same storage pattern, cross-linked — but live as two files so the core budget stays generic and the vehicle-specific modeling doesn't clutter it.

## Getting it live

1. Create the repo `ClearWay` on GitHub (empty, no template).
2. In GitHub Desktop: clone it into `~/GitHub/ClearWay`.
3. Drop all the files from this folder (`index.html`, `decision-lab.html`, `manifest.json`, `icons/`) straight into that repo folder — flat, no subfolder for the HTML files.
4. Commit and push via GitHub Desktop, same as your other repos.
5. On GitHub: repo **Settings → Pages** → deploy from the `main` branch, root folder. GitHub will give you a URL like `https://<username>.github.io/ClearWay/`.
6. Open that URL in Safari → **Share → Add to Dock** (Mac) or **Add to Home Screen** (iPhone). The icon and "Clearway" name will show up properly now that the manifest is wired in.

## Notes on the numbers

- The decision lab's per-mile fields (operating cost, average speed) are labeled in km/h and $/km for Canadian use — the underlying formulas are unit-agnostic, so no conversion was applied. Whatever number goes in is treated as-is.
- The passive/robotaxi presets are grounded in Cern Basher's (@CernBasher on X) published take-rate modeling, not an official Tesla figure — there's no live program in Canada yet, and every input is editable as real terms emerge.
