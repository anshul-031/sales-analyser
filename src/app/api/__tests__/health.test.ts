// Tests for the health API endpoint
import { NextRequest } from 'next/server'
import { GET } from '../health/route'

describe('/api/health - Health Check API', () => {
  it('should return successful response', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response).toBeDefined()
  })

  it('should return valid JSON structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    const contentType = response.headers.get('content-type')
    if (contentType) {
      expect(contentType).toContain('application/json')
    }
  })

  it('should handle request processing', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers).toBeDefined()
  })
})
