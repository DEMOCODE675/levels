# Match and Chat Permission System Documentation

## Overview

This document describes the complete female-first messaging system with optional flexibility and 24-hour match expiry implemented for the Bubbles college dating app.

## Core Features

### 1. Female-First Messaging (Bumble-style)

By default, only the female user can send the first message in a match. This ensures women have control over conversations.

**Match Document Structure:**

```javascript
{
  members: [userId1, userId2],           // Both matched users
  femaleUserId: userId,                  // Female user's ID
  allowMaleFirst: false,                 // Male can message first?
  status: 'pending',                     // 'pending' or 'unlocked'
  firstMessageBy: null,                  // User who sent first message
  firstMessageAt: null,                  // Timestamp of first message
  blockedBy: [],                         // Users who blocked others
  createdAt: timestamp,                  // Match creation time
  updatedAt: timestamp                   // Last update time
}
```

### 2. Optional Flexibility

Female users can toggle "Allow him to message first" in the three-dot menu. When enabled:

- `allowMaleFirst = true`
- Male user can send the first message
- Both users can chat freely

### 3. Match Status Flow

```
pending (no message sent)
  ↓
  If allowMaleFirst = false:
    - Only female can send message
    - If 24 hours pass with no message → DELETE MATCH

  If allowMaleFirst = true:
    - Both can send messages
    - First message unlocks chat
  ↓
unlocked (after first message sent)
  - Both users can message freely
```

## Service Layer

### matchService.js

Core functions for managing match permissions and lifecycle:

#### `getFullMessagePermission(match, currentUserId)`

Returns detailed permission information:

```javascript
{
  allowed: boolean,           // Can send message?
  canChat: boolean,          // Can access chat?
  canStartChat: boolean,     // Can start conversation?
  isFirstMessage: boolean,   // Is this first message?
  isFemaleUser: boolean,     // Is current user female?
  allowMaleFirst: boolean,   // Can male message first?
  reason: string,            // Why blocked (if blocked)
  waitingReason: string      // Waiting status message
}
```

#### `toggleAllowMaleFirst(matchId, userId, allowMaleFirst)`

Female user toggles male-first messaging. Only female user can call this.

#### `cleanupExpiredMatches(userId)`

Removes pending matches older than 24 hours with no first message. Called periodically.

#### `getMatchAgeInHours(match)`

Returns age of match in hours (useful for countdown).

#### `getTimeRemainingBeforeExpiry(match)`

Returns hours remaining before match expires.

#### `getExpiryTimestamp(match)`

Returns JavaScript Date when match will expire.

### chatService.js

Updated to use the new permission logic:

#### `getMessagePermission(match, currentUserId)`

Returns permission object with `allowed` and `reason` properties.

#### `sendMessage({ matchId, senderId, text })`

Validates permission before sending. On first message:

- Sets `status = 'unlocked'`
- Sets `firstMessageBy = senderId`
- Sets `firstMessageAt = serverTimestamp()`

### swipeService.js

Updated `createMatchDocumentIfMissing()` to include:

- `allowMaleFirst: false` (default)

## UI Implementation

### ChatPage.jsx

Features:

- Detects female user and shows toggle in three-dot menu
- Shows "Start Chat" button for female user when pending
- Shows "Waiting for her to start..." message for male user
- Shows detailed permission reason in input area
- Auto-cleanup expired matches on page load

**Female User (pending status):**

```
Three-dot menu:
  ☐ Let him message first

  Safety section...
```

**Male User (allowMaleFirst = false):**

```
Messages area:
  ⏳ Waiting for her to start the conversation...
  She has 24 hours to send the first message
```

**Male User (allowMaleFirst = true):**

```
Normal input box enabled:
  [Type a message...] [Send]
```

## 24-Hour Match Expiry System

### Client-Side Cleanup

`matchService.cleanupExpiredMatches(userId)` is called on ChatPage load:

```javascript
// In ChatPage.jsx useEffect hook
useEffect(() => {
  if (user?.uid) {
    cleanupExpiredMatches(user.uid).catch(console.error);
  }
}, [user?.uid]);
```

### Server-Side Cleanup (Cloud Function)

**Important:** Set up a scheduled Cloud Function to delete expired matches. Below is example code:

```javascript
// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const MATCH_EXPIRY_HOURS = 24;

// Run every 6 hours
exports.cleanupExpiredMatches = functions.pubsub
  .schedule("every 6 hours")
  .onRun(async (context) => {
    console.log("Starting match cleanup...");

    try {
      const pendingMatches = await db
        .collection("matches")
        .where("status", "==", "pending")
        .get();

      const now = Date.now();
      let deleted = 0;

      const batch = db.batch();

      for (const doc of pendingMatches.docs) {
        const match = doc.data();

        if (!match.firstMessageBy && match.createdAt) {
          const createdTime = match.createdAt.toMillis();
          const ageInMs = now - createdTime;
          const ageInHours = ageInMs / (1000 * 60 * 60);

          if (ageInHours > MATCH_EXPIRY_HOURS) {
            batch.delete(doc.ref);
            deleted++;
          }
        }
      }

      await batch.commit();
      console.log(`Deleted ${deleted} expired matches`);
      return { deleted };
    } catch (error) {
      console.error("Error cleaning up matches:", error);
      throw error;
    }
  });
```

**Setup Instructions:**

1. Navigate to your Firebase Functions directory:

   ```bash
   cd functions
   ```

2. Install dependencies:

   ```bash
   npm install firebase-functions firebase-admin
   ```

3. Update `functions/index.js` with the code above

4. Deploy functions:

   ```bash
   firebase deploy --only functions
   ```

5. Monitor in Firebase Console → Cloud Functions

## Security Rules (Firestore)

Update `firestore.rules` to enforce permissions:

```
match /matches/{matchId} {
  // Only match members can read
  allow read: if request.auth.uid in resource.data.members;

  // Only match members can create/update
  allow create, update: if request.auth.uid in request.resource.data.members;

  match /messages/{messageId} {
    // Only match members can read/create
    allow read, create: if request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.members;
  }
}
```

## Error Handling

**Common Error Messages:**

1. **"Only she can start the chat"**
   - Male user tried to message when `allowMaleFirst = false`
   - Show: "Waiting for her to start..."

2. **"Match has expired"**
   - 24 hours passed with no first message
   - Match automatically deleted

3. **"User is not a match member"**
   - Attempting to access unauthorized match
   - Redirect to /matches

4. **"Chat has been blocked"**
   - One user blocked the other
   - Chat disabled

## Testing Checklist

- [ ] Female user can send first message
- [ ] Male user cannot send message when `allowMaleFirst = false`
- [ ] Female user can toggle "Allow him to message first"
- [ ] Male user can send message after toggle enabled
- [ ] After first message, both can chat freely
- [ ] Match status changes to 'unlocked' after first message
- [ ] Expired matches are deleted after 24 hours (check via admin console)
- [ ] Proper error messages shown for blocked states
- [ ] UI shows correct status for both users
- [ ] Cleanup function runs without errors

## Future Enhancements

1. **Match Expiry Countdown**
   - Show "23 hours remaining" timer on UI
   - Use `getTimeRemainingBeforeExpiry()`

2. **Notification System**
   - Alert female user when male enables messaging
   - Remind to respond within time limit

3. **Analytics**
   - Track first message rate
   - Monitor allowMaleFirst adoption

4. **Extended Timeouts**
   - Allow admin to extend expiry for verified users
   - Implement streak system

## References

- Bumble app: Female-first messaging model
- Firebase Firestore: Real-time database
- Cloud Functions: Scheduled cleanup jobs
