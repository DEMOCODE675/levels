import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import {
  APPWRITE_BUCKET_ID,
  appwriteId,
  appwriteStorage,
  assertAppwriteStorageConfig,
} from '../appwrite/storageClient'

export async function getProfile(userId) {
  const profileRef = doc(db, 'profiles', userId)
  const profileSnapshot = await getDoc(profileRef)

  if (!profileSnapshot.exists()) {
    return null
  }

  return {
    id: profileSnapshot.id,
    ...profileSnapshot.data(),
  }
}

export async function uploadProfilePhoto(userId, file) {
  if (!userId) {
    throw new Error('Cannot upload photo without a user id.')
  }

  assertAppwriteStorageConfig()

  const uploadedFile = await appwriteStorage.createFile(
    APPWRITE_BUCKET_ID,
    appwriteId.unique(),
    file,
  )

  const fileView = appwriteStorage.getFileView(APPWRITE_BUCKET_ID, uploadedFile.$id)
  return typeof fileView === 'string' ? fileView : fileView.toString()
}

export async function saveProfile(userId, profileInput) {
  const profileRef = doc(db, 'profiles', userId)

  await setDoc(
    profileRef,
    {
      ...profileInput,
      updatedAt: serverTimestamp(),
      createdAt: profileInput.createdAt || serverTimestamp(),
    },
    { merge: true },
  )

  return getProfile(userId)
}
