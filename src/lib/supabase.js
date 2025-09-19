import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function createSupabaseClient() {
  const { getToken, userId } = await auth()
  
  // Try to get Supabase JWT template token, fall back to regular session token
  let token
  try {
    token = await getToken({ template: 'supabase' })
  } catch (error) {
    // If Supabase template not configured, use regular session token
    token = await getToken()
  }

  // If still no token, use service role key for server-side operations
  if (!token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  }

  // Use anon key without auth if no tokens available
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: token ? {
        Authorization: `Bearer ${token}`
      } : {}
    }
  })
}

export async function createSupabaseClientWithToken(token) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}