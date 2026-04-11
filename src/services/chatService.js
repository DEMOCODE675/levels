import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getFullMessagePermission } from './matchService'

function getTimestampMs(timestamp) {
  if (!timestamp || typeof timestamp.toMillis !== 'function') {
    return 0
  }

  return timestamp.toMillis()
}

export async function getMatchById(matchId) {
  const matchRef = doc(db, 'matches', matchId)
  const matchSnapshot = await getDoc(matchRef)

  if (!matchSnapshot.exists()) {
    return null
  }

  return {
    id: matchSnapshot.id,
    ...matchSnapshot.data(),
  }
}

export function subscribeToMatch(matchId, onMatchChanged, onError) {
  const matchRef = doc(db, 'matches', matchId)

  return onSnapshot(
    matchRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onMatchChanged(null)
        return
      }

      onMatchChanged({
        id: snapshot.id,
        ...snapshot.data(),
      })
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    })
}

export function subscribeToMatches(userId, onMatchesChanged, onError) {
  const matchesQuery = query(
    collection(db, 'matches'),
    where('members', 'array-contains', userId),
  )

  return onSnapshot(
    matchesQuery,
    (snapshot) => {
      const matches = snapshot.docs
        .map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        }))
        .sort((a, b) => getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt))

      onMatchesChanged(matches)
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )
}

export function subscribeToMessages(matchId, onMessagesChanged, onError) {
  const messagesQuery = query(
    collection(db, 'matches', matchId, 'messages'),
    orderBy('createdAt', 'asc'),
  )

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }))

      onMessagesChanged(messages)
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )
}

export function getMessagePermission(match, currentUserId) {
  return getFullMessagePermission(match, currentUserId)
}

export async function sendMessage({ matchId, senderId, text }) {
  const cleanText = text.trim()
  if (!cleanText) {
    throw new Error('Message cannot be empty.')
  }

  const matchRef = doc(db, 'matches', matchId)
  const matchSnapshot = await getDoc(matchRef)

  if (!matchSnapshot.exists()) {
    throw new Error('Match not found.')
  }

  const match = {
    id: matchSnapshot.id,
    ...matchSnapshot.data(),
  }

  const permission = getMessagePermission(match, senderId)
  if (!permission.allowed) {
    throw new Error(permission.reason)
  }

  await addDoc(collection(db, 'matches', matchId, 'messages'), {
    senderId,
    text: cleanText,
    createdAt: serverTimestamp(),
  })

  const updatePayload = {
    lastMessagePreview: cleanText.slice(0, 120),
    updatedAt: serverTimestamp(),
  }

  if (match.status === 'pending') {
    updatePayload.status = 'unlocked'
    updatePayload.firstMessageBy = senderId
    updatePayload.firstMessageAt = serverTimestamp()
  }

  await updateDoc(matchRef, updatePayload)
}

export async function reportUser({ reporterId, reportedUserId, matchId, reason }) {
  const trimmedReason = reason.trim()

  await addDoc(collection(db, 'reports'), {
    reporterId,
    reportedUserId,
    matchId,
    reason: trimmedReason || 'No reason provided',
    createdAt: serverTimestamp(),
  })
}

export async function blockUser({ blockerId, blockedUserId, matchId }) {
  const blockRef = doc(db, 'blocks', `${blockerId}_${blockedUserId}`)

  await setDoc(blockRef, {
    blockerId,
    blockedUserId,
    matchId,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'matches', matchId), {
    blockedBy: arrayUnion(blockerId),
    status: 'blocked',
    updatedAt: serverTimestamp(),
  })
}
