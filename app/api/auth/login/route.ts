import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createToken, getCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const result = await authenticateUser(email, password)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // Create token and set cookie
    const token = await createToken(result)
    const cookieOptions = getCookieOptions()

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
      },
    })

    response.cookies.set(cookieOptions.name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
