import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    );
  }

  // Handle the webhook events
  const eventType = evt.type;
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { 
      id, 
      email_addresses, 
      first_name, 
      last_name,
      username,
      image_url,
      profile_image_url,
      created_at,
      updated_at
    } = evt.data;

    // Get primary email
    const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address || '';

    // Prepare user data for Supabase
    const userData = {
      user_id: id,
      email: email,
      first_name: first_name || '',
      last_name: last_name || '',
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || username || email,
      img_url: image_url || profile_image_url || null,
      created_at: new Date(created_at).toISOString()
    };

    try {
      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from('user')
        .select('user_id')
        .eq('user_id', id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected for new users
        console.error('Error checking user existence:', selectError);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('user')
          .update({
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            full_name: userData.full_name,
            img_url: userData.img_url
          })
          .eq('user_id', id);

        if (updateError) {
          console.error('Error updating user:', updateError);
          return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
          );
        }

        console.log(`User ${id} updated successfully`);
      } else {
        // Create new user
        const { error: insertError } = await supabase
          .from('user')
          .insert(userData);

        if (insertError) {
          console.error('Error creating user:', insertError);
          return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
          );
        }

        console.log(`User ${id} created successfully`);
      }

      return NextResponse.json(
        { message: 'User synced successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Database operation failed:', error);
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Optionally delete or mark user as deleted in Supabase
      // For now, we'll keep the user record but you can modify this
      const { error } = await supabase
        .from('user')
        .update({ is_ban: true })
        .eq('user_id', id);

      if (error) {
        console.error('Error marking user as deleted:', error);
        return NextResponse.json(
          { error: 'Failed to update user status' },
          { status: 500 }
        );
      }

      console.log(`User ${id} marked as deleted`);
      return NextResponse.json(
        { message: 'User deletion processed' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Database operation failed:', error);
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }
  }

  // Return a response for other event types
  return NextResponse.json(
    { message: `Webhook received: ${eventType}` },
    { status: 200 }
  );
}