// Tests for the main app pages
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '@/app/page'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import ForgotPasswordPage from '@/app/forgot-password/page'
import ResetPasswordPage from '@/app/reset-password/page'

// Mock the dependencies
jest.mock('@/components/LandingPage', () => {
  return function MockLandingPage() {
    return <div data-testid="landing-page">Landing Page</div>
  }
})

jest.mock('@/components/LoginForm', () => {
  return function MockLoginForm() {
    return <div data-testid="login-form">Login Form</div>
  }
})

jest.mock('@/components/RegisterForm', () => {
  return function MockRegisterForm() {
    return <div data-testid="register-form">Register Form</div>
  }
})

jest.mock('@/components/ForgotPasswordForm', () => {
  return function MockForgotPasswordForm() {
    return <div data-testid="forgot-password-form">Forgot Password Form</div>
  }
})

jest.mock('@/components/ResetPasswordForm', () => {
  return function MockResetPasswordForm() {
    return <div data-testid="reset-password-form">Reset Password Form</div>
  }
})

describe('App Pages', () => {
  describe('Home Page', () => {
    it('should render landing page component', () => {
      render(<Home />)
      expect(screen.getByTestId('landing-page')).toBeInTheDocument()
    })
  })

  describe('Login Page', () => {
    it('should render login form component', () => {
      render(<LoginPage />)
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
    })
  })

  describe('Register Page', () => {
    it('should render register form component', () => {
      render(<RegisterPage />)
      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })
  })

  describe('Forgot Password Page', () => {
    it('should render forgot password form component', () => {
      render(<ForgotPasswordPage />)
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
    })
  })

  describe('Reset Password Page', () => {
    it('should render reset password form component', () => {
      render(<ResetPasswordPage />)
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument()
    })
  })
})
