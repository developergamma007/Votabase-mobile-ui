# Google Play — Production upload (iswot admin account)

**Account:** Personal Play Console · ID `5765768005813833157` · Admin email `admin@iswot.in`  
**Target track:** Production (as requested)  
**Privacy policy URL:** `https://votabase.iswot.in/ui/privacy`  
**Support emails:** `admin@iswot.in`, `venugopalagowda9999@gmail.com`

> **Security:** Do not share Play Console passwords in chat or email. Rotate the password that was shared in chat. This document does not store passwords.

---

## Before you upload

1. **Deploy the website** so `/ui/privacy` is live (see `Votabase-Website/app/privacy/page.js`).
2. **Build the AAB** on your Mac:
   ```bash
   cd votabase-mobile-ui
   npm run release:android
   ```
   File: `android/app/build/outputs/bundle/release/app-release.aab`
3. **App access credentials** — use `PLAY_STORE_APP_ACCESS.txt` (verified: `admin@iswot.io` + `8867038709`). See `DEMO_CREDENTIALS_FOR_STORE_REVIEW.md`.

---

## Step 1 — Create the app (if not already created)

1. Open [Play Console](https://play.google.com/console) → **Home**.
2. Click **Create app**.
3. **App name:** `Votabase`
4. **Default language:** English (India)
5. **App or game:** App · **Free**
6. Complete declarations → **Create app**.

---

## Step 2 — Store listing

**Grow → Store presence → Main store listing**

| Field | Value |
|-------|--------|
| App name | Votabase |
| Short description | Voter outreach and family tools for authorized campaign volunteers. |
| Full description | Votabase helps registered volunteers search voters and booths, record visits, manage families, view maps, and run meetings. Access is limited to accounts created by your organization. |
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | At least 2 |
| Privacy policy | `https://votabase.iswot.in/ui/privacy` |
| Email | `admin@iswot.in` (add `venugopalagowda9999@gmail.com` in contact details if the form allows a second address) |

---

## Step 3 — App content (required for production)

Complete every item under **Policy and programs → App content**:

- **Privacy policy** → URL above  
- **Ads** → No ads (if true)  
- **App access** → **Restricted** → paste full text from **`PLAY_STORE_APP_ACCESS.txt`**  
- **Content rating** → run IARC questionnaire (likely not for children)  
- **Target audience** → Adults / 18+  
- **Data safety** → declare: account info, location, photos (optional), voter-related data collected by volunteers  
- **Government apps** / elections → answer honestly for India  

---

## Step 4 — Production release

1. **Release** → **Production** → **Create new release**.
2. Upload `app-release.aab`.
3. **Release name:** `1.0 (1)`
4. **Release notes:** Initial production release.
5. Review warnings → **Save** → **Review release** → **Start rollout to Production**.

First production submission may take **several days** for Google review.

---

## Step 5 — Version updates later

In `android/app/build.gradle`:

```gradle
versionCode 2      // must increase every upload
versionName "1.0.1"
```

Rebuild AAB and upload a new production release.

---

## Apple App Store (separate from Play Console)

Play Console credentials **do not** work on Apple.

1. Enroll at [Apple Developer Program](https://developer.apple.com/programs/) with `admin@iswot.in` (or your org D-U-N-S).
2. Follow `STORE_RELEASE_GUIDE.md` §6 for Xcode archive and App Store Connect.
3. Use the **same** privacy URL and demo credentials in **App Review Information**.
