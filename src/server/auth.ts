import { createServerFn } from '@tanstack/start-client-core'
import { verifyIdToken, getUserProfile, createUserProfile, updateUserProfile } from '@/services/authService'
import type { User } from '@/types'

export const getCurrentUser = createServerFn({
  method: 'GET',
})
  .handler(async (ctx) => {
    const request = (ctx.context as any)?.request
    const authHeader = request?.headers?.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.substring(7)
    const userId = await verifyIdToken(token)
    const user = await getUserProfile(userId)
    
    if (!user) {
      // Create user profile if it doesn't exist
      return await createUserProfile(userId, '', '')
    }

    return user
  })

export const updateCurrentUser = createServerFn({
  method: 'POST',
})
  .handler(async (ctx) => {
    const request = (ctx.context as any)?.request
    const authHeader = request?.headers?.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.substring(7)
    const userId = await verifyIdToken(token)
    const data = (ctx.data as any) as { name?: string; githubToken?: string }
    
    await updateUserProfile(userId, data)
    
    const updatedUser = await getUserProfile(userId)
    if (!updatedUser) {
      throw new Error('User not found')
    }
    
    return updatedUser
  })
