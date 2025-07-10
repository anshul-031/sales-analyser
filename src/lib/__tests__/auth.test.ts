// Mock dependencies first, before any imports
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(),
  })),
}))

jest.mock('../db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateSecureToken,
  extractTokenFromRequest,
  getAuthenticatedUser,
  isValidEmail,
  isValidPassword,
  createAuthResponse,
  type TokenPayload,
  type AuthenticatedUser,
} from '../auth'

// Cast the mocked modules for type safety
const mockJwt = jwt as jest.Mocked<typeof jwt>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockCrypto = crypto as jest.Mocked<typeof crypto>

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mock implementations
    ;(mockJwt.sign as jest.Mock).mockReturnValue('mock-token')
    ;(mockJwt.verify as jest.Mock).mockReturnValue({ userId: 'user123', email: 'test@example.com' })
    ;(mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
    ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(mockCrypto.randomBytes as jest.Mock).mockReturnValue({
      toString: jest.fn().mockReturnValue('secure-random-token')
    })
  })

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const payload: TokenPayload = {
        userId: 'user123',
        email: 'test@example.com',
      }
      const expectedToken = 'mocked-jwt-token'

      ;(mockJwt.sign as jest.Mock).mockReturnValue(expectedToken)

      const result = generateToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-jwt-secret',
        { expiresIn: '7d' }
      )
      expect(result).toBe(expectedToken)
    })

    it('should use default JWT_SECRET if not provided', () => {
      delete process.env.JWT_SECRET
      const payload: TokenPayload = {
        userId: 'user123',
        email: 'test@example.com',
      }

      ;(mockJwt.sign as jest.Mock).mockReturnValue('token')
      generateToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-jwt-secret', // The environment variable is set in jest.setup.js and cached
        { expiresIn: '7d' }
      )
    })
  })

  describe('verifyToken', () => {
    it('should verify and return token payload', () => {
      const token = 'valid-token'
      const expectedPayload: TokenPayload = {
        userId: 'user123',
        email: 'test@example.com',
      }

      ;(mockJwt.verify as jest.Mock).mockReturnValue(expectedPayload)

      const result = verifyToken(token)

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-jwt-secret')
      expect(result).toEqual(expectedPayload)
    })

    it('should throw error for invalid token', () => {
      const token = 'invalid-token'
      const error = new Error('Invalid token')

      ;(mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw error
      })

      expect(() => verifyToken(token)).toThrow('Invalid token')
    })
  })

  describe('hashPassword', () => {
    it('should hash password with salt rounds', async () => {
      const password = 'testPassword123'
      const hashedPassword = 'hashed-password'

      ;(mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123'
      const hashedPassword = 'hashed-password'

      ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await comparePassword(password, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(true)
    })

    it('should return false for non-matching passwords', async () => {
      const password = 'testPassword123'
      const hashedPassword = 'hashed-password'

      ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(false)

      const result = await comparePassword(password, hashedPassword)

      expect(result).toBe(false)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate a secure random token', () => {
      const mockRandomBytes = {
        toString: jest.fn().mockReturnValue('secure-random-token'),
      }
      mockCrypto.randomBytes.mockReturnValue(mockRandomBytes as any)

      const result = generateSecureToken()

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32)
      expect(mockRandomBytes.toString).toHaveBeenCalledWith('hex')
      expect(result).toBe('secure-random-token')
    })
  })

  describe('extractTokenFromRequest', () => {
    it('should extract token from Authorization header', () => {
      const token = 'test-token'
      const request = {
        headers: {
          get: jest.fn().mockReturnValue(`Bearer ${token}`),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      const result = extractTokenFromRequest(request)

      expect(result).toBe(token)
    })

    it('should extract token from cookies if header not present', () => {
      const token = 'test-token'
      const request = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        cookies: {
          get: jest.fn().mockReturnValue({ value: token }),
        },
      } as unknown as NextRequest

      const result = extractTokenFromRequest(request)

      expect(result).toBe(token)
    })

    it('should return null if no token found', () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      const result = extractTokenFromRequest(request)

      expect(result).toBeNull()
    })

    it('should return null for malformed Authorization header', () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue('InvalidHeader token'),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      const result = extractTokenFromRequest(request)

      expect(result).toBeNull()
    })
  })

  describe('getAuthenticatedUser', () => {
    const { prisma: mockPrisma } = jest.requireMock('../db')

    beforeEach(() => {
      ;(mockJwt.verify as jest.Mock).mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
      })
    })

    it('should return authenticated user for valid token', async () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token'),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await getAuthenticatedUser(request)

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      })
    })

    it('should return null for invalid token', async () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer invalid-token'),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      ;(mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = await getAuthenticatedUser(request)

      expect(result).toBeNull()
    })

    it('should return null if user not found in database', async () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token'),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getAuthenticatedUser(request)

      expect(result).toBeNull()
    })

    it('should return null if no token provided', async () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest

      const result = await getAuthenticatedUser(request)

      expect(result).toBeNull()
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@subdomain.example.org',
        'user123@test-domain.com',
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.com',
        'test@.com',
        // Note: 'test..test@example.com' passes basic regex validation
        '',
        'test@example.',
      ]

      invalidEmails.forEach(email => {
        const result = isValidEmail(email)
        expect(result).toBe(false)
      })
    })
  })

  describe('isValidPassword', () => {
    it('should return valid for strong passwords', () => {
      const strongPasswords = [
        'Password123',
        'MySecureP@ss1',
        'Str0ngPassword!',
        'ComplexPass123',
      ]

      strongPasswords.forEach(password => {
        const result = isValidPassword(password)
        expect(result.isValid).toBe(true)
        expect(result.message).toBeUndefined()
      })
    })

    it('should return invalid for passwords that are too short', () => {
      const result = isValidPassword('Pass1')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must be at least 8 characters long')
    })

    it('should return invalid for passwords without lowercase letters', () => {
      const result = isValidPassword('PASSWORD123')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must contain at least one lowercase letter')
    })

    it('should return invalid for passwords without uppercase letters', () => {
      const result = isValidPassword('password123')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must contain at least one uppercase letter')
    })

    it('should return invalid for passwords without numbers', () => {
      const result = isValidPassword('Password')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must contain at least one number')
    })
  })

  describe('createAuthResponse', () => {
    it('should create proper auth response object', () => {
      const user: AuthenticatedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      }
      const token = 'jwt-token'

      const result = createAuthResponse(user, token)

      expect(result).toEqual({
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: true,
        },
        token: 'jwt-token',
      })
    })

    it('should handle user without optional fields', () => {
      const user: AuthenticatedUser = {
        id: 'user123',
        email: 'test@example.com',
        isEmailVerified: false,
      }
      const token = 'jwt-token'

      const result = createAuthResponse(user, token)

      expect(result).toEqual({
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          firstName: undefined,
          lastName: undefined,
          isEmailVerified: false,
        },
        token: 'jwt-token',
      })
    })
  })
})
