# PWA Push Notifications Setup Guide

## Overview

This feature allows admins to manually send push notifications to all PWA users whenever a new hike is ready (after photos are uploaded and notes are written).

## Features

✅ **Manual Control**: Admin decides when to send notifications (not automatic)
✅ **PWA Integration**: Works with installed PWA apps
✅ **Foreground & Background**: Notifications work whether app is open or closed
✅ **Token Management**: Automatically stores and cleans up user FCM tokens
✅ **Error Handling**: Failed tokens are automatically removed

## Setup Steps

### 1. Configure Firebase Cloud Messaging

#### 1.1 Get Your VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (gr-5-4df65)
3. Go to **Project Settings** (gear icon)
4. Click **Cloud Messaging** tab
5. Under "Web Configuration", copy your **Server key** and **Sender ID**
6. To generate a VAPID key pair:
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Run: `firebase deploy --project gr-5-4df65`
   - Or generate manually at: https://web-push-codelab.glitch.me/

#### 1.2 Add Environment Variables

Create or update `.env.local` in your project root:

```env
REACT_APP_FCM_VAPID_KEY=your_vapid_key_here
REACT_APP_MESSAGING_SENDER_ID=604938319065
```

For Firebase Functions, add to `functions/.env`:

```env
FIREBASE_PROJECT_ID=gr-5-4df65
FIREBASE_MESSAGING_SENDER_ID=604938319065
```

### 2. Update Package Dependencies

Already done:

- ✅ `firebase-messaging` added to package.json

Install dependencies:

```bash
npm install
```

### 3. Set Up Service Worker

The service worker (`public/sw.js`) has been updated to:

- Receive background notifications
- Handle notification clicks
- Open the app when notification is clicked

### 4. Create Firestore Collections

Create these collections in Firestore for token and log management:

#### `userTokens` Collection

Stores FCM tokens for each user:

```
userTokens/
  {userId}/
    tokens: [array of FCM tokens]
    updatedAt: timestamp
    userAgent: string
```

#### `notificationLog` Collection

Logs all sent notifications:

```
notificationLog/
  {docId}/
    hikeId: string
    hikeName: string
    message: string
    totalSent: number
    totalFailed: number
    timestamp: timestamp
    sentBy: userId
```

### 5. Deploy Cloud Functions

Update your functions/index.js (already done) with the new `sendHikeNotification` function.

Deploy:

```bash
firebase deploy --only functions
```

### 6. Enable Admin Permissions

For the admin to send notifications, add admin permissions in your authentication system.

Ensure the admin user role is properly configured:

```javascript
// In your admin check (example in AdminRoute.js)
const isAdmin = user && user.customClaims?.admin === true;
```

## How to Use

### For Users (PWA Installation)

1. **Install PWA**:
   - Open the app in a browser
   - Browser shows "Install" prompt
   - Click install to add to home screen

2. **Grant Notification Permission**:
   - Browser asks for notification permission
   - User clicks "Allow"
   - FCM token is automatically saved

### For Admins (Sending Notifications)

1. **Upload New Hike**:
   - Go to Admin Panel → Activity Manager
   - Upload GPX/FIT file
   - Add photos and write note

2. **Send Notification**:
   - Once hike is ready, click the **🔔 Notify** button
   - Notification is sent to all users who have the PWA installed
   - Status message shows number of users notified

## Architecture

### Frontend Flow

```
App.js (useNotifications)
  ↓
registerServiceWorkerAndGetToken()
  ↓
saveFCMToken(userId, token) → Firestore
  ↓
Admin clicks "🔔 Notify" button
  ↓
sendHikeNotification(hikeId, hikeName, message)
  ↓
Cloud Function receives request
```

### Backend Flow

```
Cloud Function: sendHikeNotification
  ↓
Get all tokens from userTokens collection
  ↓
Send to Firebase Cloud Messaging
  ↓
FCM sends to user devices
  ↓
Service Worker receives notification
  ↓
Show notification to user
```

## Files Modified/Created

### Created:

- `src/services/notificationService.js` - FCM initialization and token management
- `src/hooks/useNotifications.js` - Hook to initialize notifications on app load

### Modified:

- `package.json` - Added firebase-messaging dependency
- `public/sw.js` - Added FCM and notification handling
- `src/App.js` - Added useNotifications hook
- `src/components/AdminActivityManager.js` - Added notification UI button
- `functions/index.js` - Added sendHikeNotification cloud function

## Testing

### Local Testing

1. **Enable Notifications in Browser**:

   ```bash
   npm start
   ```

2. **Register Service Worker**:
   - Open app
   - Check DevTools → Application → Service Workers
   - Should show "sw.js" registered

3. **Check FCM Token**:
   - Go to Firestore → userTokens collection
   - Should see your token saved

4. **Test Notification**:
   - Go to Firebase Console
   - Cloud Messaging → Send your first message
   - Or use admin SDK to test `sendHikeNotification`

### Production Testing

1. Install PWA on real device
2. Go to Admin Panel
3. Try sending a test notification
4. Check if notification appears on device

## Troubleshooting

### No Notifications Received

1. **Check Service Worker**:

   ```javascript
   navigator.serviceWorker.controller.ready.then(() => {
     console.log("Service Worker is ready");
   });
   ```

2. **Verify FCM Token**:
   - Check Firestore `userTokens` collection
   - Token should exist for current user

3. **Check Browser Console**:
   - Look for error messages
   - Enable DevTools Logging for Firebase

4. **VAPID Key**:
   - Verify `REACT_APP_FCM_VAPID_KEY` is correct
   - Regenerate if needed

### Tokens Not Being Saved

1. Check browser notification permission:

   ```javascript
   console.log(Notification.permission); // Should be "granted"
   ```

2. Verify Firestore rules allow writes to `userTokens`:
   ```
   match /userTokens/{userId} {
     allow read, write: if request.auth.uid == userId;
   }
   ```

### Cloud Function Fails

1. Check Firebase Functions logs:

   ```bash
   firebase functions:log --project gr-5-4df65
   ```

2. Verify admin user has auth claim:

   ```bash
   firebase auth:export users.json --project gr-5-4df65
   ```

3. Check function environment variables:
   ```bash
   firebase functions:config:get --project gr-5-4df65
   ```

## Security Considerations

1. **Authentication**: Only authenticated users can send notifications
2. **Authorization**: Only admins can send notifications (add role check)
3. **Rate Limiting**: Consider adding limits to prevent spam
4. **Token Cleanup**: Invalid tokens are auto-removed to avoid storing stale data

## Future Enhancements

- [ ] Schedule notifications for later delivery
- [ ] Allow custom notification titles/messages
- [ ] Add notification templates
- [ ] Rich notifications with images
- [ ] Target specific user segments
- [ ] Analytics on notification engagement
- [ ] Notification history for users
- [ ] Allow users to opt-in/out of specific notification types

## References

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Notifications](https://web.dev/push-notifications-overview/)

## Support

For issues or questions:

1. Check Firebase Functions logs
2. Review browser console for errors
3. Verify Firestore database rules
4. Check VAPID key configuration
