# Demo credentials — Google Play (production)

**Play Store only** (Apple deferred).

---

## Verified production login (works today)

Tested against `https://votabase.iswot.in` on 2026-05-31.

| Field | Value |
|-------|--------|
| **First name** (login screen) | `admin@iswot.io` |
| **Mobile number** | `8867038709` |
| **Role** | SUPER_ADMIN (full access) |

The app label says “First name”, but for this account you must type **`admin@iswot.io`** exactly (same as your super-admin seed in the backend). Email is **not** a separate field.

**Security:** This is a powerful admin account. Use it only for Google’s review window. After approval, prefer creating a limited **AppReview** booth volunteer (below) and update Play Console App access.

---

## Optional: limited reviewer account (recommended after launch)

Create in **Manage Volunteers → Add Volunteer**:

| Field | Suggested value |
|-------|-----------------|
| First name | `AppReview` |
| Mobile | `9890012345` (or any unused 10-digit number you control) |
| Working level | `BOOTH` |
| Ward / booth | One test booth with sample voters |

Then change Play Console **App access** to:

```
First name: AppReview
Mobile number: 9890012345
```

---

## Paste into Play Console

Ready-made text file:

**`PLAY_STORE_APP_ACCESS.txt`**

Path: `votabase-mobile-ui/docs/PLAY_STORE_APP_ACCESS.txt`

Console location: **Policy and programs → App content → App access**

---

## Checklist before production rollout

- [ ] Privacy policy live: https://votabase.iswot.in/ui/privacy  
- [ ] Release APK/AAB tested: login with `admin@iswot.io` + `8867038709`  
- [ ] App access section filled from `PLAY_STORE_APP_ACCESS.txt`  
- [ ] AAB uploaded: `android/app/build/outputs/bundle/release/app-release.aab`  
- [ ] Data safety + content rating completed  

See **`PLAY_STORE_PRODUCTION_NOW.md`** for full upload steps.
