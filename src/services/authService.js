import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase/config'

export async function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function continueWithGoogle() {
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

  return credential
}

export async function logoutUser() {
  return signOut(auth)
}
