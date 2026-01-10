import { adminDb, adminAuth } from '@/lib/firebase-admin'
import type { User } from '@/types'

export async function createUserProfile(userId: string, email: string, name?: string): Promise<User> {
  const userData: Omit<User, 'id'> = {
    email,
    name,
    createdAt: new Date(),
  }

  await adminDb.collection('users').doc(userId).set(userData)

  return {
    id: userId,
    ...userData,
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const doc = await adminDb.collection('users').doc(userId).get()

  if (!doc.exists) {
    return null
  }

  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data()?.createdAt?.toDate() || new Date(),
  } as User
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'githubToken'>>
): Promise<void> {
  await adminDb.collection('users').doc(userId).update(updates)
}

export async function verifyIdToken(idToken: string): Promise<string> {
  const decodedToken = await adminAuth.verifyIdToken(idToken)
  return decodedToken.uid
}
