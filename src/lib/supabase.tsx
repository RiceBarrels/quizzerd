import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Creates a Supabase client without authentication (for public routes)
 * Uses the anon key which respects Row Level Security
 * @returns {ReturnType<typeof createClient>} Public Supabase client instance
 */
export function createPublicSupabaseClient() {
  return createClient(supabaseUrl!, supabaseKey!)
}

/**
 * Creates a Supabase client with authentication token from Clerk
 * Attempts to get Supabase JWT template token, falls back to regular session token or service role key
 * @returns {Promise<ReturnType<typeof createClient>>} Authenticated Supabase client instance
 */
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
  if (!token && process.env.SUPABASE_SERVICE_ROLE) {
    return createClient(supabaseUrl!, process.env.SUPABASE_SERVICE_ROLE!)
  }

  // Use anon key without auth if no tokens available
  return createClient(supabaseUrl!, supabaseKey!, {
    global: {
      headers: token ? {
        Authorization: `Bearer ${token}`
      } : {}
    }
  })
}

/**
 * Creates a Supabase client with a specific authentication token
 * @param {string} token - The authentication token to use for Supabase requests
 * @returns {Promise<ReturnType<typeof createClient>>} Authenticated Supabase client instance
 */
export async function createSupabaseClientWithToken(token: string) {
  return createClient(supabaseUrl!, supabaseKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}

/**
 * Creates a Supabase admin client with service role key (bypasses Row Level Security)
 * This client has full access to the database and should only be used server-side
 * @returns {ReturnType<typeof createClient>} Admin Supabase client instance
 * @throws {Error} If SUPABASE_SERVICE_ROLE environment variable is not defined
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE is not defined')
  }
  
  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}