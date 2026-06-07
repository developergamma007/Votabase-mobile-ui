# Play Store — what the agent did vs what you must click (5–15 min)

## Done automatically on your Mac

| Item | Status |
|------|--------|
| Package `in.iswot.votabase` | Matches Play Console ✓ |
| Release AAB built | `android/app/build/outputs/bundle/release/app-release.aab` |
| `versionCode` bumped to **2** | Required if internal testing already had v1 |
| Login for reviewers | `admin@iswot.io` + `8867038709` works on production API ✓ |
| App access text | `PLAY_STORE_APP_ACCESS.txt` ready to paste |
| Privacy page code | `Votabase-Website/app/privacy` + middleware allows public access |

## Blocker: privacy URL not live yet

`https://votabase.iswot.in/ui/privacy` currently **redirects to login** (Play will reject).

**Fix applied in code:** `Votabase-Website/middleware.js` now treats `/privacy` as public.

**You must deploy the website** (one time):

```bash
cd Votabase-Website
npm run build
# Then deploy to your server (same process you use for votabase.iswot.in today)
```

After deploy, verify in browser (incognito):  
https://votabase.iswot.in/ui/privacy → should show Privacy Policy, not login.

---

## Why the agent cannot click Play Console for you

Google Play has **no safe way** to upload from this environment without:

- Your Google login in a browser (not provided to the agent), or  
- A **Play Console service account** JSON key (API access you create once in Play Console → Setup → API access)

Passwords sent in chat cannot be used to automate the console.

---

## Your clicks in Play Console (existing Votabase app)

### 1. App content → App access

Paste entire file: `docs/PLAY_STORE_APP_ACCESS.txt`

### 2. App content → Privacy policy

URL: `https://votabase.iswot.in/ui/privacy` (only after deploy above)

### 3. Store listing

- App name: **Votabase**
- Short description: `Voter outreach and family tools for authorized campaign volunteers.`
- Full description: (see `PLAY_STORE_PRODUCTION_NOW.md`)
- Email: `admin@iswot.in`
- Icon 512×512 + ≥2 screenshots (add from your app)

### 4. Data safety + Content rating

Declare: account info, location, voter-related data entered by volunteers. No ads if applicable.

### 5. Production release

1. **Release** → **Production** → **Create new release**
2. Upload:  
   `votabase-mobile-ui/android/app/build/outputs/bundle/release/app-release.aab`
3. Release notes: `Initial production release (1.0.0)`
4. **Review release** → **Start rollout to Production**

Internal testing track can stay as-is; production is separate.

---

## Rebuild AAB after any app change

```bash
cd votabase-mobile-ui
npm run release:android
```

---

## Optional: automate future uploads (API)

1. Play Console → **Setup** → **API access** → link Google Cloud project  
2. Create service account → grant **Release manager**  
3. Download JSON key → store outside git  
4. Use [fastlane supply](https://docs.fastlane.tools/actions/upload_to_play_store/) or Google Play Developer API  

Ask in a follow-up if you want a `fastlane/` setup added to the repo.
