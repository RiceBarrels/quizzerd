'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

/**
 * Custom hook for managing user profile data with fetch, update, and create operations
 * @returns {Object} Object containing profile data, loading state, error state, and profile management functions
 */
export function useUserProfile() {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    fetchProfile()
  }, [user, isLoaded])

  /**
   * Fetches the user profile from the API
   */
  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/profile')
      
      if (!response.ok) {
        if (response.status === 404) {
          setProfile(null)
          return
        }
        throw new Error('Failed to fetch profile')
      }
      
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Updates the user profile with the provided updates
   * @param {Record<string, any>} updates - Object containing the fields to update
   * @returns {Promise<any>} The updated profile data
   */
  const updateProfile = async (updates: Record<string, any>) => {
    try {
      setError(null)
      
      const response = await fetch('/api/user/profile', {
        method: profile ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update profile')
      }
      
      const data = await response.json()
      setProfile(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error updating profile:', err)
      throw err
    }
  }

  /**
   * Creates a new user profile with the provided data
   * @param {Record<string, any>} profileData - Object containing the profile data to create
   * @returns {Promise<any>} The created profile data
   */
  const createProfile = async (profileData: Record<string, any>) => {
    try {
      setError(null)
      
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create profile')
      }
      
      const data = await response.json()
      setProfile(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error creating profile:', err)
      throw err
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    createProfile,
    refetch: fetchProfile,
  }
}