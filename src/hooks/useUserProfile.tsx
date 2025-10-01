'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function useUserProfile() {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    fetchProfile()
  }, [user, isLoaded])

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

  const updateProfile = async (updates) => {
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

  const createProfile = async (profileData) => {
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