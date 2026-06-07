# Votabase Mobile — Play Store & App Store Release Guide

**Project:** `votabase-mobile-ui` (React Native 0.82, bare workflow)  
**Document date:** 2026-05-31  
**Prepared by:** Cursor agent (automated audit + release prep on your machine)

---

## 1. What was done on your system (summary)

| Item | Status | Notes |
|------|--------|--------|
| Android release AAB build | **Verified** | `bundleRelease` succeeded; artifact ~43 MB |
| Android signing config | **Present** | `votabase-upload-key.keystore` + `gradle.properties` |
| iOS bundle ID | **Fixed** | Was default RN example ID → now `in.iswot.votabase` (matches Android) |
| Display name | **Updated** | "Votabase" on Android & iOS |
| iOS photo permission | **Added** | Required for profile image picker |
| Production API URL | **Updated** | `https://votabase.iswot.in` (was raw IP; aligns with web app) |
| Release scripts | **Added** | `scripts/release-android.sh`, `scripts/release-ios-archive.sh` |
| Play/App Store upload | **Not done** | Requires **your** Google Play & Apple accounts (see §8) |

**AAB location (after build):**

```
votabase-mobile-ui/android/app/build/outputs/bundle/release/app-release.aab
```

Rebuild anytime:

```bash
cd votabase-mobile-ui
npm run release:android
```

---

## 2. App identity (use consistently in both stores)

| Field | Value |
|-------|--------|
| **App name (user-facing)** | Votabase |
| **Android applicationId** | `in.iswot.votabase` |
| **iOS bundle ID** | `in.iswot.votabase` |
| **Version name** | `1.0` |
| **Version code / build** | `1` (increment for every store upload) |
| **Min Android SDK** | 24 |
| **Target Android SDK** | 36 |
| **Min iOS** | 15.1 |

**Permissions used**

- Internet  
- Fine / coarse location (maps, meetings, family capture)  
- Photo library (profile picture)

**Backend (release builds)**

- `https://votabase.iswot.in` — configured in `src/apis/ApiClient.js`

---

## 3. What only you can provide (blockers for submission)

Stores cannot be completed without accounts and legal/marketing assets from **your organization**.

### 3.1 Accounts & fees

| Platform | Requirement | Typical cost |
|----------|-------------|--------------|
| **Google Play** | [Google Play Console](https://play.google.com/console) developer account | One-time ~$25 USD |
| **Apple App Store** | [Apple Developer Program](https://developer.apple.com/programs/) | ~$99 USD / year |

### 3.2 Legal & policy (both stores)

- **Privacy policy URL** (public HTTPS) — mandatory  
- **Support email** (and optionally support URL)  
- **Data safety / privacy questionnaire** answers (what you collect: location, phone, voter-related data, etc.)

### 3.3 Store listing assets

| Asset | Google Play | Apple App Store |
|-------|-------------|-----------------|
| App icon | 512×512 PNG | 1024×1024 PNG (no transparency) |
| Feature graphic | 1024×500 | — |
| Phone screenshots | Min 2, 16:9 or 9:16 | 6.7", 6.5", 5.5" sizes (or use Xcode screenshots) |
| Short description | ≤ 80 chars | Subtitle ≤ 30 chars |
| Full description | ≤ 4000 chars | Description |
| Category | e.g. Productivity / Business | Same |
| Content rating | IARC questionnaire | Age rating questionnaire |

### 3.4 Signing credentials (cannot be done by agent alone)

**Android**

- Upload keystore already exists: `android/app/votabase-upload-key.keystore`  
- Passwords are in `android/gradle.properties` — **treat as secret**; rotate if this repo was ever shared publicly.  
- Google Play also needs **Play App Signing** enrollment (recommended: Google manages app signing key).

**iOS**

- Apple **Distribution** certificate + **App Store** provisioning profile for `in.iswot.votabase`  
- Created in [Apple Developer → Certificates, IDs & Profiles](https://developer.apple.com/account/resources)  
- Or via Xcode: **Signing & Capabilities** → Team → Automatically manage signing

---

## 4. Security actions recommended before public release

1. **Rotate Android keystore passwords** if `gradle.properties` was committed to git (passwords were visible as `developer`).  
2. **Back up** `votabase-upload-key.keystore` offline; losing it prevents updating the same Play listing.  
3. **Enable Play App Signing** in Play Console on first upload.  
4. Do **not** share Apple/Google account passwords in chat; use invited users with least privilege.  
5. Confirm production API TLS and auth match compliance expectations (voter data).

---

## 5. Google Play Store — step-by-step

### 5.1 One-time: Play Console setup

1. Sign in to [Play Console](https://play.google.com/console).  
2. Create **developer account** (organization recommended for ISWOT/Votabase).  
3. Complete identity / DUNS / payments profile if prompted.

### 5.2 Create the app

1. **Create app** → name **Votabase** → default language **English (India)** or your choice.  
2. App / game → **App**; free/paid → **Free** (unless you charge).  
3. Declare policy compliance (government apps, elections, user data, etc. — answer honestly).

### 5.3 Store listing

Fill **Main store listing**:

- App name: **Votabase**  
- Short & full description (draft below in §7)  
- Graphics: icon, feature graphic, screenshots  
- Contact: support email  
- Privacy policy URL  

### 5.4 App content & compliance

Complete all required sections (Play will block publish until done):

- **Privacy policy**  
- **Data safety** (location, personal info, account data)  
- **Content rating** (IARC)  
- **Target audience** (likely 18+ if electoral/voter tooling)  
- **News app / elections** declarations if applicable in your region  

### 5.5 Upload the AAB

1. **Release** → **Production** (or **Internal testing** first — recommended).  
2. **Create new release** → upload:

   `android/app/build/outputs/bundle/release/app-release.aab`

3. Release name: e.g. `1.0 (1)`  
4. Review **App bundle explorer** (size, devices).  
5. **Roll out** after review.

### 5.6 Version updates (later)

In `android/app/build.gradle`:

```gradle
versionCode 2        // must increase every upload
versionName "1.0.1"
```

Then `npm run release:android` and upload new AAB.

---

## 6. Apple App Store — step-by-step

### 6.1 Prerequisites (on your Mac)

```bash
cd votabase-mobile-ui
npm ci
cd ios && bundle install && bundle exec pod install
```

Xcode 26.x is installed on this machine.

### 6.2 Register the app in App Store Connect

1. [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+**  
2. **New App**  
   - Platform: iOS  
   - Name: **Votabase**  
   - Primary language  
   - Bundle ID: **in.iswot.votabase** (must exist in Developer portal first)  
   - SKU: e.g. `votabase-ios`  
3. Create **App ID** in Developer portal if missing: `in.iswot.votabase`.

### 6.3 Configure signing in Xcode

1. Open `ios/votabase.xcworkspace` (not `.xcodeproj`).  
2. Select target **votabase** → **Signing & Capabilities**.  
3. Team: your Apple Developer team.  
4. Bundle Identifier: `in.iswot.votabase`.  
5. Enable **Automatically manage signing** (simplest).

### 6.4 Archive & upload

**Option A — Xcode UI (recommended first time)**

1. Scheme: **votabase**, device: **Any iOS Device (arm64)**.  
2. **Product → Archive**.  
3. **Organizer → Distribute App → App Store Connect → Upload**.  
4. Follow prompts (symbols, bitcode settings as defaults).

**Option B — script**

```bash
cd votabase-mobile-ui
npm run release:ios:archive
```

Then distribute archive from Xcode Organizer.

### 6.5 App Store Connect metadata

- Screenshots per device class  
- Description, keywords, support URL  
- **Privacy Nutrition Labels** + privacy policy URL  
- Export compliance (encryption) — typically “uses standard encryption only”  
- **App Review Information**: demo login if reviewers cannot register themselves  

### 6.6 Submit for review

1. Build appears under **TestFlight** / **App Store** tab after processing (~15–60 min).  
2. Select build on version **1.0**.  
3. Answer questionnaires → **Submit for Review**.

### 6.7 Version updates (later)

In Xcode target or `project.pbxproj`:

- `MARKETING_VERSION` = user-visible (e.g. 1.0.1)  
- `CURRENT_PROJECT_VERSION` = build number (must increase each upload)

---

## 7. Draft store copy (edit before publish)

**Short description (Play, ~80 chars)**  
Voter outreach and family management for authorized campaign volunteers.

**Full description (starter)**  
Votabase helps authorized volunteers manage voter outreach: search voters and booths, record visits, manage household families, view maps, and coordinate meetings. Access is restricted to registered accounts provided by your organization.

**Keywords (Apple)**  
voter, outreach, campaign, booth, family, volunteers

**Privacy policy**  
Must describe: account login, location for maps/attendance, voter identifiers (EPIC), phone numbers, profile photos, and server storage. Host at e.g. `https://votabase.iswot.in/privacy` (you must create this page).

---

## 8. Your answers (recorded 2026-05-31)

| Question | Your answer |
|----------|-------------|
| Play Console | **Yes** — Personal account “iswot admin”, `admin@iswot.in` |
| Apple Developer | **Not enrolled yet** — Play credentials do **not** work on Apple; enroll separately at developer.apple.com |
| Privacy policy | **Yes** — page added at `https://votabase.iswot.in/ui/privacy` (deploy website to go live) |
| Support email | `admin@iswot.in`, `venugopalagowda9999@gmail.com` |
| First release track | **Production** (see `PLAY_STORE_PRODUCTION_NOW.md`) |
| Demo credentials | **Play:** `admin@iswot.io` + `8867038709` (verified on prod) — paste `PLAY_STORE_APP_ACCESS.txt` |

**Important:** Store passwords must not be shared in chat. Rotate any password that was exposed. The agent cannot sign in to Play Console on your behalf.

**Next docs:**

- `PLAY_STORE_PRODUCTION_NOW.md` — click-by-click Play production upload  
- `DEMO_CREDENTIALS_FOR_STORE_REVIEW.md` — what to create for app review

---

## 9. Internal testing recommendation (before production)

| Platform | Track | Purpose |
|----------|--------|---------|
| Google Play | **Internal testing** (up to 100 testers) | Fast iteration, no review |
| Apple | **TestFlight** | Beta testers, then promote to App Store |

---

## 10. File reference

| Path | Purpose |
|------|---------|
| `android/app/build.gradle` | `versionCode`, `versionName`, signing |
| `android/gradle.properties` | Keystore secrets (keep private) |
| `android/gradle.properties.example` | Template without secrets |
| `android/app/votabase-upload-key.keystore` | Upload key (backup securely) |
| `ios/votabase.xcodeproj/project.pbxproj` | Bundle ID, versions |
| `ios/votabase/Info.plist` | Permissions, display name |
| `src/apis/ApiClient.js` | Production API base URL |
| `scripts/release-android.sh` | Build Play AAB |
| `scripts/release-ios-archive.sh` | Xcode archive helper |

---

## 11. Troubleshooting

| Issue | Fix |
|-------|-----|
| Android signing failed | Check `MYAPP_*` in `gradle.properties` and keystore path |
| Play rejects AAB version | Increase `versionCode` |
| iOS signing error | Select correct Team in Xcode; regenerate profiles |
| App Review rejection (login) | Provide demo account in App Review notes |
| Network error in release app | Verify `PROD_BASE_URL` and server TLS certificate |
| Missing privacy manifest | `ios/votabase/PrivacyInfo.xcprivacy` already included |

---

## 12. What the agent cannot do without your credentials

- Create or verify Google Play / Apple developer accounts  
- Accept developer agreements on your behalf  
- Upload binaries using your Apple ID / Google account  
- Host privacy policy or marketing pages on your domain  
- Complete IARC / Apple age rating questionnaires without your business answers  

Once you provide §8 answers and console access (or uploaded builds), a follow-up session can walk through TestFlight / internal testing and production rollout step-by-step.
