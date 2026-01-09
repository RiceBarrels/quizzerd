import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DEV_PASSWORD = 'Fmh04221531';
const COOKIE_NAME = 'dev_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password === DEV_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, 'granted', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(COOKIE_NAME);

    return NextResponse.json({
      hasAccess: accessCookie?.value === 'granted',
    });
  } catch (error) {
    return NextResponse.json({ hasAccess: false });
  }
}
