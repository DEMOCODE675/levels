import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const MATCH_EXPIRY_HOURS = 24

/**
 * Check if a match has expired (24 hours with no first message)
 */
function isMatchExpired(match) {
    if (match.status !== 'pending' || match.firstMessageBy) {
        return false
    }

    if (!match.createdAt || typeof match.createdAt.toMillis !== 'function') {
        return false
    }

    const createdTime = match.createdAt.toMillis()
    const now = Date.now()
    const ageInMs = now - createdTime
    const ageInHours = ageInMs / (1000 * 60 * 60)

    return ageInHours > MATCH_EXPIRY_HOURS
}

/**
 * Get a match document with all its data
 */
export async function getMatch(matchId) {
    try {
        const matchRef = doc(db, 'matches', matchId)
        const matchSnapshot = await getDoc(matchRef)

        if (!matchSnapshot.exists()) {
            return null
        }

        return {
            id: matchSnapshot.id,
            ...matchSnapshot.data(),
        }
    } catch (error) {
        console.error('Error fetching match:', error)
        throw error
    }
}

/**
 * Toggle "allow male first message" setting
 * Only female user can toggle this
 */
export async function toggleAllowMaleFirst(matchId, userId, allowMaleFirst) {
    try {
        const match = await getMatch(matchId)

        if (!match) {
            throw new Error('Match not found.')
        }

        if (match.femaleUserId !== userId) {
            throw new Error('Only the female user can change this setting.')
        }

        await updateDoc(doc(db, 'matches', matchId), {
            allowMaleFirst,
            updatedAt: serverTimestamp(),
        })

        return { success: true }
    } catch (error) {
        console.error('Error toggling allow male first:', error)
        throw error
    }
}

/**
 * Get full permission details for messaging
 * Returns detailed information about why messaging is blocked
 */
export function getFullMessagePermission(match, currentUserId) {
    // Check if user is a match member
    if (!match.members?.includes(currentUserId)) {
        return {
            allowed: false,
            canChat: false,
            canStartChat: false,
            reason: 'You are not a participant in this chat.',
            waitingReason: null,
        }
    }

    // Check if blocked
    if (match.blockedBy && match.blockedBy.length > 0) {
        return {
            allowed: false,
            canChat: false,
            canStartChat: false,
            reason: 'This chat has been blocked.',
            waitingReason: null,
        }
    }

    // Check if match is expired
    if (isMatchExpired(match)) {
        return {
            allowed: false,
            canChat: false,
            canStartChat: false,
            reason: 'This match has expired. No messages were sent within 24 hours.',
            waitingReason: null,
        }
    }

    // If pending status (no first message sent yet)
    if (match.status === 'pending') {
        const isFemaleUser = match.femaleUserId === currentUserId
        const allowMaleFirst = match.allowMaleFirst || false

        // Female user can always start chat
        if (isFemaleUser) {
            return {
                allowed: true,
                canChat: true,
                canStartChat: true,
                isFirstMessage: true,
                isFemaleUser: true,
                allowMaleFirst,
                reason: '',
                waitingReason: null,
            }
        }

        // Male user trying to send first message
        if (!isFemaleUser) {
            if (!allowMaleFirst) {
                return {
                    allowed: false,
                    canChat: false,
                    canStartChat: false,
                    isFirstMessage: true,
                    isFemaleUser: false,
                    allowMaleFirst,
                    reason: 'Only she can start the chat.',
                    waitingReason: 'Waiting for her to start the conversation...',
                }
            }

            // If allowMaleFirst is true, male can send first message
            return {
                allowed: true,
                canChat: true,
                canStartChat: true,
                isFirstMessage: true,
                isFemaleUser: false,
                allowMaleFirst: true,
                reason: '',
                waitingReason: null,
            }
        }
    }

    // After first message is sent (unlocked status)
    return {
        allowed: true,
        canChat: true,
        canStartChat: false,
        reason: '',
        waitingReason: null,
    }
}

/**
 * Simple permission check (backward compatible)
 */
export function getMessagePermission(match, currentUserId) {
    const fullPermission = getFullMessagePermission(match, currentUserId)
    return {
        allowed: fullPermission.allowed,
        reason: fullPermission.reason,
    }
}

/**
 * Check and clean up expired matches
 * Called periodically from client side
 */
export async function cleanupExpiredMatches(userId) {
    try {
        const matchesQuery = query(
            collection(db, 'matches'),
            where('members', 'array-contains', userId),
            where('status', '==', 'pending'),
        )

        const matchesSnapshot = await getDocs(matchesQuery)
        const expiredMatches = []

        matchesSnapshot.forEach((matchDoc) => {
            const match = {
                id: matchDoc.id,
                ...matchDoc.data(),
            }

            if (isMatchExpired(match)) {
                expiredMatches.push(match.id)
            }
        })

        // Delete expired matches
        for (const matchId of expiredMatches) {
            await deleteDoc(doc(db, 'matches', matchId))
        }

        return { deleted: expiredMatches.length }
    } catch (error) {
        console.error('Error cleaning up expired matches:', error)
        throw error
    }
}

/**
 * Get match age in hours
 */
export function getMatchAgeInHours(match) {
    if (!match.createdAt || typeof match.createdAt.toMillis !== 'function') {
        return 0
    }

    const createdTime = match.createdAt.toMillis()
    const now = Date.now()
    const ageInMs = now - createdTime
    return ageInMs / (1000 * 60 * 60)
}

/**
 * Get time remaining before match expires
 */
export function getTimeRemainingBeforeExpiry(match) {
    if (match.status !== 'pending' || match.firstMessageBy) {
        return null
    }

    const ageInHours = getMatchAgeInHours(match)
    const hoursRemaining = MATCH_EXPIRY_HOURS - ageInHours

    if (hoursRemaining <= 0) {
        return null
    }

    return Math.round(hoursRemaining * 100) / 100 // Round to 2 decimals
}

/**
 * Get expiry timestamp
 */
export function getExpiryTimestamp(match) {
    if (!match.createdAt || typeof match.createdAt.toMillis !== 'function') {
        return null
    }

    const expiryTime = match.createdAt.toMillis() + MATCH_EXPIRY_HOURS * 60 * 60 * 1000
    return new Date(expiryTime)
}
