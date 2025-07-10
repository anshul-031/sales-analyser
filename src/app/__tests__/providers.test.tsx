// Tests for app providers and layout components
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Providers } from '@/app/providers'

// Mock AuthProvider
jest.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>
}))

describe('App Providers', () => {
  it('should wrap children with AuthProvider', () => {
    render(
      <Providers>
        <div data-testid="test-child">Test Content</div>
      </Providers>
    )
    
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })

  it('should pass children through provider', () => {
    const testContent = 'Provider Test Content'
    render(
      <Providers>
        <span>{testContent}</span>
      </Providers>
    )
    
    expect(screen.getByText(testContent)).toBeInTheDocument()
  })
})
