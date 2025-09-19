import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseClient()
    
    // First try to get the user
    let { data: userProfile, error } = await supabase
      .from('user')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If user doesn't exist, create one
    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('user')
        .insert({
          user_id: userId,
          class_ids: []
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return NextResponse.json(newUser)
    }

    if (error) {
      throw error
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error fetching/creating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch/create user profile' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await createSupabaseClient()
    
    const { data: userProfile, error } = await supabase
      .from('user')
      .upsert({
        user_id: userId,
        ...body
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error creating/updating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to create/update user profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await createSupabaseClient()
    
    const { data: userProfile, error } = await supabase
      .from('user')
      .update(body)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}