import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// Default tags that are created for new users
const DEFAULT_TAGS = [
  { tag_name: 'Easy', tag_color: 'green', tag_category: 'difficulty' },
  { tag_name: 'Medium', tag_color: 'yellow', tag_category: 'difficulty' },
  { tag_name: 'Hard', tag_color: 'red', tag_category: 'difficulty' },
  { tag_name: 'Remember', tag_color: 'blue', tag_category: 'bloom' },
  { tag_name: 'Understand', tag_color: 'blue', tag_category: 'bloom' },
  { tag_name: 'Apply', tag_color: 'purple', tag_category: 'bloom' },
  { tag_name: 'Analyze', tag_color: 'purple', tag_category: 'bloom' },
];

// GET - Fetch all tags for the current user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch user's tags
    const { data, error } = await supabase
      .from('question_tags')
      .select('*')
      .eq('user_id', userId)
      .order('tag_category', { ascending: true })
      .order('tag_name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      );
    }

    // If user has no tags, create default ones
    if (!data || data.length === 0) {
      const defaultTagsWithUser = DEFAULT_TAGS.map(tag => ({
        ...tag,
        user_id: userId
      }));

      const { data: insertedTags, error: insertError } = await supabase
        .from('question_tags')
        .insert(defaultTagsWithUser)
        .select();

      if (insertError) {
        console.error('Error creating default tags:', insertError);
        return NextResponse.json({ success: true, data: [] });
      }

      return NextResponse.json({ success: true, data: insertedTags });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error in tags API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new tag
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tag_name, tag_color = 'gray', tag_category = 'custom' } = body;

    if (!tag_name || typeof tag_name !== 'string' || tag_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('question_tags')
      .insert({
        user_id: userId,
        tag_name: tag_name.trim(),
        tag_color,
        tag_category
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating tag:', error);
      return NextResponse.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tag
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('question_tags')
      .delete()
      .eq('tag_id', tagId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting tag:', error);
      return NextResponse.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a tag
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tag_id, tag_name, tag_color, tag_category } = body;

    if (!tag_id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const updateData: Record<string, string> = {};
    if (tag_name) updateData.tag_name = tag_name.trim();
    if (tag_color) updateData.tag_color = tag_color;
    if (tag_category) updateData.tag_category = tag_category;

    const { data, error } = await supabase
      .from('question_tags')
      .update(updateData)
      .eq('tag_id', tag_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Error updating tag:', error);
      return NextResponse.json(
        { error: 'Failed to update tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
