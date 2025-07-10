// Tests for the contact API endpoint
import { NextRequest } from 'next/server'
import { POST } from '../contact/route'

// Mock the email service
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}))

const mockSendEmail = jest.requireMock('@/lib/email').sendEmail

describe('/api/contact - Contact Form API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSendEmail.mockResolvedValue({ success: true })
  })

  it('should handle POST requests', async () => {
    const contactData = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Test message'
    }

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response).toBeDefined()
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('should validate required fields', async () => {
    const incompleteData = {
      name: 'John Doe',
      email: 'john@example.com'
    }

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify(incompleteData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('should validate email format', async () => {
    const invalidEmailData = {
      name: 'John Doe',
      email: 'invalid-email',
      message: 'Test message'
    }

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify(invalidEmailData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
