import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  '0d62c2e0f830e5ce1dc691a64534c503abe5f0af3512c1a76424d39a710f596a'
)

const COOKIE_NAME = 'auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface JWTPayload {
  userId: string
  email: string
  name: string
  iat: number
  exp: number
}

// In-memory user store (replace with database in production)
const users: Map<string, { id: string; email: string; name: string; passwordHash: string; createdAt: Date }> = new Map()

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    createdAt: new Date(),
  }
}

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User | { error: string }> {
  // Check if user exists
  const existingUsers = Array.from(users.values())
  for (const user of existingUsers) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      return { error: 'Email already registered' }
    }
  }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const createdAt = new Date()

  users.set(id, { id, email, name, passwordHash, createdAt })

  return { id, email, name, createdAt }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | { error: string }> {
  let foundUser = null
  const allUsers = Array.from(users.values())

  for (const user of allUsers) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      foundUser = user
      break
    }
  }

  if (!foundUser) {
    return { error: 'Invalid email or password' }
  }

  const isValid = await verifyPassword(password, foundUser.passwordHash)
  if (!isValid) {
    return { error: 'Invalid email or password' }
  }

  return {
    id: foundUser.id,
    email: foundUser.email,
    name: foundUser.name,
    createdAt: foundUser.createdAt,
  }
}

export function getCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
}

export { COOKIE_NAME, COOKIE_MAX_AGE }
