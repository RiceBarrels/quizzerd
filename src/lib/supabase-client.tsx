'use client'

import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables')
}

export function useSupabase() {
  const { session } = useSession()

  const supabaseClient = createClient(
    supabaseUrl!,
    supabasePublishableKey!,
    {
      accessToken: async () => {
        const token = await session?.getToken({ template: 'supabase' })
        return token ?? null
      }
    }
  )

  return supabaseClient
}