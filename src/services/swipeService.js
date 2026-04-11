import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getProfile } from './profileService'

function getMatchId(userA, userB) {
  return [userA, userB].sort().join('_')
}

async function getBlockedConnections(currentUserId) {
  const blockedByMeQuery = query(
    collection(db, 'blocks'),
    where('blockerId', '==', currentUserId),
  )
  const blockedMeQuery = query(
    collection(db, 'blocks'),
    where('blockedUserId', '==', currentUserId),
  )

  const [blockedByMeSnapshot, blockedMeSnapshot] = await Promise.all([
    getDocs(blockedByMeQuery),
    getDocs(blockedMeQuery),
  ])

  const blockedIds = new Set()

  blockedByMeSnapshot.forEach((blockedDoc) => {
    blockedIds.add(blockedDoc.data().blockedUserId)
  })

  blockedMeSnapshot.forEach((blockedDoc) => {
    blockedIds.add(blockedDoc.data().blockerId)
  })

  return blockedIds
}

async function getAlreadySwipedUserIds(currentUserId) {
  const swipeQuery = query(
    collection(db, 'swipes'),
    where('fromUserId', '==', currentUserId),
  )
  const swipeSnapshot = await getDocs(swipeQuery)

  const swipedUserIds = new Set()
  swipeSnapshot.forEach((swipeDoc) => {
    swipedUserIds.add(swipeDoc.data().toUserId)
  })

  return swipedUserIds
}

export async function getSwipeCandidates(currentUserId) {
  const [blockedIds, swipedUserIds, profileSnapshot] = await Promise.all([
    getBlockedConnections(currentUserId),
    getAlreadySwipedUserIds(currentUserId),
    getDocs(collection(db, 'profiles')),
  ])

  const profileRecords = profileSnapshot.docs
    .map((profileDoc) => ({
      id: profileDoc.id,
      ...profileDoc.data(),
    }))

  const visibleProfiles = await Promise.all(
    profileRecords.map(async (profile) => {
      if (profile.id === currentUserId) {
        return null
      }

      if (blockedIds.has(profile.id) || swipedUserIds.has(profile.id)) {
        return null
      }

      const settingsSnapshot = await getDoc(doc(db, 'userSettings', profile.id))
      const isPrivateProfile =
        settingsSnapshot.exists() && settingsSnapshot.data().privateProfile === true

      return isPrivateProfile ? null : profile
    }),
  )

  return visibleProfiles.filter(Boolean)
}

async function createMatchDocumentIfMissing(fromUserId, toUserId) {
  const matchId = getMatchId(fromUserId, toUserId)
  const matchRef = doc(db, 'matches', matchId)
  const matchSnapshot = await getDoc(matchRef)

  if (matchSnapshot.exists()) {
    return matchId
  }

  const [fromProfile, toProfile] = await Promise.all([
    getProfile(fromUserId),
    getProfile(toUserId),
  ])

  if (!fromProfile || !toProfile) {
    throw new Error('Both users must complete profile setup before matching.')
  }

  const femaleUserId =
    fromProfile.gender === 'female'
      ? fromUserId
      : toProfile.gender === 'female'
        ? toUserId
        : null

  await setDoc(matchRef, {
    members: [fromUserId, toUserId],
    memberDetails: {
      [fromUserId]: {
        name: fromProfile.name || 'Student',
        photoUrl: fromProfile.photoUrl || '',
        gender: fromProfile.gender || 'unspecified',
        interests: fromProfile.interests || [],
      },
      [toUserId]: {
        name: toProfile.name || 'Student',
        photoUrl: toProfile.photoUrl || '',
        gender: toProfile.gender || 'unspecified',
        interests: toProfile.interests || [],
      },
    },
    femaleUserId,
    allowMaleFirst: false,
    status: 'pending',
    firstMessageBy: null,
    blockedBy: [],
    lastMessagePreview: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return matchId
}

export async function swipeOnUser({ fromUserId, toUserId, action }) {
  if (!['like', 'skip'].includes(action)) {
    throw new Error('Invalid swipe action. Use like or skip.')
  }

  const swipeRef = doc(db, 'swipes', `${fromUserId}_${toUserId}`)

  await setDoc(swipeRef, {
    fromUserId,
    toUserId,
    action,
    createdAt: serverTimestamp(),
  })

  if (action === 'skip') {
    return { matched: false }
  }

  const oppositeSwipeRef = doc(db, 'swipes', `${toUserId}_${fromUserId}`)
  const oppositeSwipeSnapshot = await getDoc(oppositeSwipeRef)

  const hasMutualLike =
    oppositeSwipeSnapshot.exists() && oppositeSwipeSnapshot.data().action === 'like'

  if (!hasMutualLike) {
    return { matched: false }
  }

  const matchId = await createMatchDocumentIfMissing(fromUserId, toUserId)
  return { matched: true, matchId }
}
