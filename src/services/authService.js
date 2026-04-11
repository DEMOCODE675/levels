import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

export async function signUpWithCollegeEmail(email, password) {
  if (!isCollegeEmail(email)) {
    throw new Error('Only @miet.ac.in email addresses are allowed.')
  }

  return createUserWithEmailAndPassword(auth, email, password)
}

export async function loginWithEmail(email, password) {
  if (!isCollegeEmail(email)) {
    throw new Error('Only @miet.ac.in email addresses are allowed.')
  }

  return signInWithEmailAndPassword(auth, email, password)
}

export async function logoutUser() {
  return signOut(auth)
}
