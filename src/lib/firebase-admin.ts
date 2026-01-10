import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined

  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
    // Use Application Default Credentials if service account not provided
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  } else if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } else {
    throw new Error('Firebase Admin SDK requires either FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID')
  }
}

export const adminDb = admin.firestore()
export const adminAuth = admin.auth()
