import {
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase/config'

const REQUIRED_COLLEGE_DOMAIN = 'miet.ac.in'

function extractDomain(email) {
  return email.trim().toLowerCase().split('@')[1] || ''
}

export function getAllowedCollegeDomains() {
  return [REQUIRED_COLLEGE_DOMAIN]
}

export function isCollegeEmail(email) {
  const domain = extractDomain(email)
  return domain === REQUIRED_COLLEGE_DOMAIN
}

function createCollegeDomainError() {
  const error = new Error('Only @miet.ac.in Google accounts are allowed.')
  error.code = 'auth/college-domain-required'
  return error
}

export async function continueWithGoogleCollege() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  let credential = null

  try {
    credential = await signInWithPopup(auth, provider)
  } catch (error) {
    const code = error?.code || ''
    const needsRedirectFallback =
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/cancelled-popup-request'

    if (!needsRedirectFallback) {
      throw error
    }

    await signInWithRedirect(auth, provider)
    return null
  }

  const email = credential.user?.email?.trim().toLowerCase() || ''

  if (!isCollegeEmail(email)) {
    await signOut(auth)
    throw createCollegeDomainError()
  }

  return credential
}

export async function logoutUser() {
  return signOut(auth)
}
