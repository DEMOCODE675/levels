# Bubbles Campus (College-Only Dating App)

A beginner-friendly React + Firebase dating app inspired by Bumble.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Firebase Authentication + Firestore, Appwrite Storage (images only)

## Features Implemented

1. Authentication

- Email/password auth with Firebase Authentication
- Signup/login restricted to `@miet.ac.in` emails only
- Protected routes for authenticated users only

2. User Profile

- Profile setup form with name, bio, interests, gender
- Profile photo upload to Appwrite Storage
- Profile data stored in Firestore (`profiles/{uid}`)

3. Swipe System

- One profile shown at a time
- Swipe left (`skip`) and swipe right (`like`) using drag gestures
- Like/Dislike buttons for mobile and desktop
- Smooth card motion with `framer-motion`
- Swipe decisions saved in Firestore (`swipes`)
- Match popup shown immediately when mutual like happens

4. Matching Logic

- On `like`, checks reciprocal like from the other user
- If mutual, creates match document in Firestore (`matches`)

5. Chat System

- Chat available only for matched users
- Female-first rule: only the female user can send the first message
- After first message, chat unlocks for both users
- Messages stored in `matches/{matchId}/messages`

6. Safety Features

- Block user
- Report user
- Messaging disabled if a block exists
- No chat before match

## Project Structure

```text
src/
  components/
    AppShell.jsx
    SwipeCard.jsx
    ProtectedRoute.jsx
  context/
    AuthContext.jsx
  hooks/
    useAuth.js
  appwrite/
    storageClient.js
  firebase/
    config.js
  pages/
    AuthPage.jsx
    ProfileSetupPage.jsx
    SwipePage.jsx
    MatchesPage.jsx
    ChatPage.jsx
    NotFoundPage.jsx
  services/
    authService.js
    profileService.js
    swipeService.js
    chatService.js
  App.jsx
  main.jsx
  index.css
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and add your Firebase values:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Start development server:

```bash
npm run dev
```

## Firebase Configuration Notes

- Enable Email/Password in Firebase Authentication.
- Create Firestore database.
- Deploy Firestore rules file in this repo:

```bash
firebase deploy --only firestore:rules
```

Rules file:

- `firestore.rules`

Firebase Storage is not used in this app because profile images are stored in Appwrite.

## Appwrite Storage Notes

- Create an Appwrite project and a Storage bucket.
- Add these values in `.env`:
  - `VITE_APPWRITE_ENDPOINT`
  - `VITE_APPWRITE_PROJECT_ID`
  - `VITE_APPWRITE_BUCKET_ID`
- For local testing without Appwrite auth, configure bucket permissions to allow uploads from your app context. For production, use stricter permissions and a server-side upload flow.

## Firestore Collections Used

- `profiles/{uid}`
- `swipes/{fromUid_toUid}`
- `matches/{sortedUidA_sortedUidB}`
- `matches/{matchId}/messages/{messageId}`
- `reports/{reportId}`
- `blocks/{blockerUid_blockedUid}`

## Step-by-Step Learning Path (Matches Your Request)

1. Authentication first:

- `src/services/authService.js`
- `src/pages/AuthPage.jsx`

2. Profile setup second:

- `src/services/profileService.js`
- `src/pages/ProfileSetupPage.jsx`

3. Swipe system third:

- `src/services/swipeService.js`
- `src/pages/SwipePage.jsx`

4. Matching logic fourth:

- `src/services/swipeService.js` (`swipeOnUser`)
- `src/pages/MatchesPage.jsx`

5. Chat and safety fifth:

- `src/services/chatService.js`
- `src/pages/ChatPage.jsx`

## Important Behavior

- Only users with `@miet.ac.in` email can sign up and log in.
- If a match has no female profile, chat remains locked by the female-first rule.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
