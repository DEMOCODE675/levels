import { Client, ID, Storage } from 'appwrite'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID

const hasConfig = Boolean(endpoint && projectId && bucketId)

const client = new Client()
if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId)
}

export const appwriteStorage = new Storage(client)
export const APPWRITE_BUCKET_ID = bucketId
export const appwriteId = ID

export function assertAppwriteStorageConfig() {
  if (hasConfig) {
    return
  }

  throw new Error(
    'Appwrite Storage is not configured. Add VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and VITE_APPWRITE_BUCKET_ID in .env',
  )
}
