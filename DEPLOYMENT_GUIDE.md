# MyMedAlert - Play Store Deployment Guide

This guide covers everything you need to deploy MyMedAlert to the Google Play Store.

## ✅ Pre-Deployment Checklist

| Item | Status | Notes |
|------|--------|-------|
| App Icon | ✅ Ready | Custom 512x512 icon configured |
| App Name | ✅ Ready | "MyMedAlert - Medicine Reminder" |
| Version | ✅ Ready | 1.0 (versionCode 1) |
| Privacy Policy | ✅ Ready | `PRIVACY_POLICY.md` |
| Release Keystore | ✅ Ready | `mymedalert-release-key.jks` |
| Signed AAB | ✅ Ready | `android/app/build/outputs/bundle/release/app-release.aab` |

---

## 🔑 Keystore Information

**⚠️ IMPORTANT: Back up these files securely! You cannot update your app without them.**

| Property | Value |
|----------|-------|
| Keystore File | `android/app/mymedalert-release-key.jks` |
| Key Alias | `mymedalert` |
| Store Password | `mymedalert123` |
| Key Password | `mymedalert123` |
| Validity | 25 years (10,000 days) |

### Backup Recommendations
1. Store the keystore file in a secure cloud storage (Google Drive, OneDrive)
2. Save the passwords in a password manager
3. Keep a copy on an external drive
4. Never commit the keystore to version control

---

## 🏗️ Building a Release AAB

### Prerequisites
- Node.js and npm installed
- Java JDK 11+ installed
- Android SDK installed

### Build Steps

```bash
# 1. Build the React app
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Build the signed release AAB
cd android
./gradlew bundleRelease
```

The signed AAB will be located at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📱 Play Store Console Setup

### Step 1: Create Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Complete identity verification

### Step 2: Create New App
1. Click **"Create app"**
2. Fill in:
   - **App name**: MyMedAlert - Medicine Reminder
   - **Default language**: English (US)
   - **App or game**: App
   - **Free or paid**: Free

### Step 3: Store Listing

#### App Details
| Field | Content |
|-------|---------|
| **App name** | MyMedAlert - Medicine Reminder |
| **Short description** (80 chars) | Never miss a dose! Smart medicine reminders with custom schedules & alerts. |
| **Full description** | See below |

#### Full Description (4,000 chars max)
```
MyMedAlert is your personal medicine reminder assistant that helps you stay on top of your medication schedule.

🔔 SMART REMINDERS
• Set custom reminders for each medication
• Choose specific days of the week
• Multiple time slots per medicine
• Loud, attention-grabbing alarms that work even on lock screen

💊 EASY MEDICINE MANAGEMENT
• Add unlimited medications
• Track dosage information
• Set start and end dates for treatments
• Quick add and edit functionality

📱 USER-FRIENDLY DESIGN
• Clean, intuitive interface
• Dark and light mode support
• Easy-to-read medicine list
• One-tap to dismiss or snooze alarms

🔒 PRIVACY FOCUSED
• All data stored locally on your device
• No account required
• No data collection or tracking
• Works offline

Perfect for:
• Daily medication schedules
• Vitamin and supplement reminders
• Post-surgery medication tracking
• Elderly care assistance
• Chronic condition management

Never forget to take your medicine again with MyMedAlert!
```

#### Graphics Requirements

| Asset | Size | Format |
|-------|------|--------|
| App icon | 512 x 512 px | PNG (32-bit, no alpha) |
| Feature graphic | 1024 x 500 px | PNG or JPG |
| Phone screenshots | Min 320px, Max 3840px | PNG or JPG |
| 7-inch tablet screenshots | Min 320px, Max 3840px | PNG or JPG (optional) |
| 10-inch tablet screenshots | Min 320px, Max 3840px | PNG or JPG (optional) |

**Screenshot Requirements:**
- Minimum 2 screenshots, maximum 8
- Recommended: 4-6 screenshots showing main features
- Show: Medicine list, Add medicine form, Alarm screen, Settings

### Step 4: Content Rating
1. Go to **Policy** → **App content** → **Content rating**
2. Complete the questionnaire
3. Answer questions about:
   - Violence
   - Sexual content
   - Language
   - Controlled substances
   - User-generated content

**Expected rating**: Everyone (E)

### Step 5: Target Audience
1. Go to **Policy** → **App content** → **Target audience**
2. Select: **18 and over** (not designed for children)
3. Confirm app doesn't appeal primarily to children

### Step 6: Privacy Policy
1. Host your privacy policy online (options below)
2. Add the URL in Play Console under **Policy** → **App content** → **Privacy policy**

#### Hosting Options for Privacy Policy
1. **GitHub Pages**: Push `PRIVACY_POLICY.md` and enable Pages
2. **Your website**: Upload as HTML page
3. **Google Sites**: Free and easy setup
4. **Notion**: Create public page

### Step 7: App Category
| Setting | Value |
|---------|-------|
| Category | Medical OR Health & Fitness |
| Tags | medicine reminder, pill reminder, health, medication |

### Step 8: Contact Details
Provide:
- Support email address
- Privacy policy URL
- (Optional) Website URL
- (Optional) Phone number

---

## 🚀 Release Process

### Step 1: Create Production Release
1. Go to **Production** → **Releases**
2. Click **"Create new release"**
3. Upload `app-release.aab`
4. Add release notes:
```
Version 1.0 - Initial Release

• Add and manage your medications
• Set custom reminder schedules
• Receive alarm notifications
• Works on lock screen
• Local storage - your data stays on your device
```

### Step 2: Review and Rollout
1. Review all sections have green checkmarks
2. Click **"Review release"**
3. Click **"Start rollout to Production"**

### Step 3: Wait for Review
- Initial review typically takes 1-3 days
- You'll receive email notification when approved/rejected

---

## 🔄 Updating Your App

### Version Increment
Edit `android/app/build.gradle`:
```groovy
defaultConfig {
    versionCode 2  // Increment this
    versionName "1.1"  // Update this
}
```

### Build New Release
```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

### Upload to Play Console
1. Go to **Production** → **Releases**
2. **Create new release**
3. Upload new AAB
4. Add release notes
5. Review and rollout

---

## ❗ Common Issues & Solutions

### Issue: App rejected for policy violation
- Ensure privacy policy URL is accessible
- Complete all "App content" sections
- Verify no misleading claims in description

### Issue: AAB upload fails
- Ensure versionCode is higher than previous release
- Verify AAB is signed with the correct keystore
- Check file isn't corrupted

### Issue: App crashes on some devices
- Test on multiple Android versions (API 22+)
- Check logcat for crash reports
- Use Firebase Crashlytics for monitoring

### Issue: Notifications not working
- Verify POST_NOTIFICATIONS permission is requested
- Check exact alarm permissions on Android 12+
- Test on different manufacturer devices (Samsung, Xiaomi have aggressive battery optimization)

---

## 📊 Post-Launch Checklist

- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Track download statistics
- [ ] Plan feature updates based on feedback
- [ ] Set up Firebase Analytics (optional)
- [ ] Consider Firebase Crashlytics for crash reporting

---

## 📞 Support

For issues with this deployment guide or the app:
- GitHub: [https://github.com/Vishnu1702/PILL-REMINDER](https://github.com/Vishnu1702/PILL-REMINDER)
- Email: [Your support email]

---

*Last updated: December 2025*
