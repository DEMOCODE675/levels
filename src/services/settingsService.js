import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export const DEFAULT_USER_SETTINGS = {
  onlyGirlsMessageFirst: true,
  privateProfile: false,
}

function getTimestampMs(timestamp) {
  if (!timestamp || typeof timestamp.toMillis !== 'function') {
    return 0
  }

  return timestamp.toMillis()
}

export function subscribeToUserSettings(userId, onSettingsChanged, onError) {
  const settingsRef = doc(db, 'userSettings', userId)

  return onSnapshot(
    settingsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onSettingsChanged(DEFAULT_USER_SETTINGS)
        return
      }

      onSettingsChanged({
        ...DEFAULT_USER_SETTINGS,
        ...snapshot.data(),
      })
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )
}

export async function saveUserSettings(userId, settingsInput) {
  const settingsRef = doc(db, 'userSettings', userId)

  await setDoc(
    settingsRef,
    {
      ...settingsInput,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function subscribeToBlockedUsers(userId, onBlockedUsersChanged, onError) {
  const blockedQuery = query(
    collection(db, 'blocks'),
    where('blockerId', '==', userId),
  )

  return onSnapshot(
    blockedQuery,
    async (snapshot) => {
      try {
        const blockedUsers = await Promise.all(
          snapshot.docs.map(async (blockedDoc) => {
            const blockedData = blockedDoc.data()
            const profileSnapshot = await getDoc(doc(db, 'profiles', blockedData.blockedUserId))

            const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null

            return {
              id: blockedDoc.id,
              ...blockedData,
              blockedUserName: profileData?.name || 'Student',
              blockedUserPhotoUrl: profileData?.photoUrl || '',
            }
          }),
        )

        blockedUsers.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt))
        onBlockedUsersChanged(blockedUsers)
      } catch (error) {
        if (typeof onError === 'function') {
          onError(error)
        }
      }
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )
}
