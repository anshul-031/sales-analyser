import { jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, User } from '../auth-context';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid noise in test output
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

// Test component that uses the auth context
const TestComponent = () => {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'no-user'}</div>
      <button 
        data-testid="login-btn"
        onClick={() => auth.login('test@example.com', 'password')}
      >
        Login
      </button>
      <button 
        data-testid="register-btn"
        onClick={() => auth.register({
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User'
        })}
      >
        Register
      </button>
      <button 
        data-testid="logout-btn"
        onClick={() => auth.logout()}
      >
        Logout
      </button>
      <button 
        data-testid="forgot-password-btn"
        onClick={() => auth.forgotPassword('test@example.com')}
      >
        Forgot Password
      </button>
      <button 
        data-testid="reset-password-btn"
        onClick={() => auth.resetPassword('token', 'newpassword')}
      >
        Reset Password
      </button>
      <button 
        data-testid="refresh-user-btn"
        onClick={() => auth.refreshUser()}
      >
        Refresh User
      </button>
    </div>
  );
};

// Component that throws error when useAuth is used outside provider
const InvalidComponent = () => {
  useAuth();
  return <div>Should not render</div>;
};

describe('AuthContext', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    
    // Set a default mock implementation for fetch to prevent undefined returns
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Default mock error' })
      } as Response)
    );
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<InvalidComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should return auth context when used within AuthProvider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Not authenticated' })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });
  });

  describe('AuthProvider', () => {
    describe('Initial authentication check', () => {
      it('should authenticate user on successful auth check', async () => {
        const mockUser: User = {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isEmailVerified: true
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
          credentials: 'include',
        });
      });

      it('should clear user when auth check returns ok but success is false', async () => {
        // Mock the initial auth check that fails but returns ok
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: false, message: 'Invalid token' })
        } as Response);

        // Mock the clearInvalidCookie call
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      });

      it('should clear user when auth check returns non-ok response', async () => {
        // Mock the initial auth check that returns 401
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false, message: 'Unauthorized' })
        } as Response);

        // Mock the clearInvalidCookie call
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should handle network errors during auth check', async () => {
        // Mock the initial auth check that throws error
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        // Mock the clearInvalidCookie call
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(consoleSpy.error).toHaveBeenCalledWith('[Auth] Auth check error:', expect.any(Error));
      });

      it('should handle clearInvalidCookie errors gracefully', async () => {
        // Mock the initial auth check that fails
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);

        // Mock the clearInvalidCookie call that throws error
        mockFetch.mockRejectedValueOnce(new Error('Cookie clear error'));

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        expect(consoleSpy.error).toHaveBeenCalledWith('[Auth] Error clearing invalid cookie:', expect.any(Error));
      });
    });

    describe('login', () => {
      beforeEach(async () => {
        // Mock initial auth check to fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);
        mockFetch.mockResolvedValueOnce({ ok: true } as Response); // clearInvalidCookie

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        jest.clearAllMocks();
      });

      it('should login successfully and set user', async () => {
        const mockUser: User = {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isEmailVerified: true
        };

        // Mock login response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        // Mock the delayed checkAuth call
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        await act(async () => {
          screen.getByTestId('login-btn').click();
        });

        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        });
      });

      it('should handle login failure', async () => {
        // If there's a logged in user from previous test, log them out first
        const userElement = screen.getByTestId('user');
        if (userElement.textContent !== 'no-user') {
          // Mock logout call
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response);

          await act(async () => {
            screen.getByTestId('logout-btn').click();
          });

          await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('no-user');
          });
        }
        
        // Setup the login failure mock right before the action to avoid it being cleared
        await act(async () => {
          // Mock login call to return failure - do this just before the click
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: false, message: 'Invalid credentials' })
          } as Response);

          screen.getByTestId('login-btn').click();
        });

        await waitFor(() => {
          expect(consoleSpy.log).toHaveBeenCalledWith('[Auth] Login failed:', 'Invalid credentials');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      it('should handle login network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          screen.getByTestId('login-btn').click();
        });

        await waitFor(() => {
          expect(consoleSpy.error).toHaveBeenCalledWith('[Auth] Login error:', expect.any(Error));
        });
      });
    });

    describe('register', () => {
      beforeEach(async () => {
        // Mock initial auth check to fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);
        mockFetch.mockResolvedValueOnce({ ok: true } as Response); // clearInvalidCookie

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        jest.clearAllMocks();
      });

      it('should register successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Registration successful' })
        } as Response);

        await act(async () => {
          screen.getByTestId('register-btn').click();
        });

        await waitFor(() => {
          expect(consoleSpy.log).toHaveBeenCalledWith('[Auth] Registration successful');
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
            firstName: 'Test',
            lastName: 'User'
          }),
        });
      });

      it('should handle registration failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: false, message: 'Email already exists' })
        } as Response);

        await act(async () => {
          screen.getByTestId('register-btn').click();
        });

        await waitFor(() => {
          expect(consoleSpy.log).toHaveBeenCalledWith('[Auth] Registration failed:', 'Email already exists');
        });
      });

      it('should handle registration network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          screen.getByTestId('register-btn').click();
        });

        await waitFor(() => {
          expect(consoleSpy.error).toHaveBeenCalledWith('[Auth] Registration error:', expect.any(Error));
        });
      });
    });

    describe('logout', () => {
      beforeEach(async () => {
        // Mock initial auth check with authenticated user
        const mockUser: User = {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isEmailVerified: true
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        });

        jest.clearAllMocks();
      });

      it('should logout successfully and clear user', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response);

        await act(async () => {
          screen.getByTestId('logout-btn').click();
        });

        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        expect(consoleSpy.log).toHaveBeenCalledWith('[Auth] User logged out successfully.');
      });

      it('should clear user even when logout request fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          screen.getByTestId('logout-btn').click();
        });

        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        });

        expect(consoleSpy.error).toHaveBeenCalledWith('[Auth] Logout error:', expect.any(Error));
        expect(consoleSpy.log).toHaveBeenCalledWith('[Auth] User cleared from state despite logout error.');
      });
    });

    describe('forgotPassword', () => {
      beforeEach(async () => {
        // Mock initial auth check to fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);
        mockFetch.mockResolvedValueOnce({ ok: true } as Response); // clearInvalidCookie

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        jest.clearAllMocks();
      });

      it('should handle forgot password successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Reset email sent' })
        } as Response);

        await act(async () => {
          screen.getByTestId('forgot-password-btn').click();
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com' }),
        });
      });

      it('should handle forgot password failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: false, message: 'Email not found' })
        } as Response);

        await act(async () => {
          screen.getByTestId('forgot-password-btn').click();
        });

        // Verify the call was made correctly
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com' }),
        });
      });

      it('should handle forgot password network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          screen.getByTestId('forgot-password-btn').click();
        });

        expect(consoleSpy.error).toHaveBeenCalledWith('Forgot password error:', expect.any(Error));
      });
    });

    describe('resetPassword', () => {
      beforeEach(async () => {
        // Mock initial auth check to fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);
        mockFetch.mockResolvedValueOnce({ ok: true } as Response); // clearInvalidCookie

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        jest.clearAllMocks();
      });

      it('should handle reset password successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Password reset successful' })
        } as Response);

        await act(async () => {
          screen.getByTestId('reset-password-btn').click();
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: 'token', password: 'newpassword' }),
        });
      });

      it('should handle reset password failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: false, message: 'Invalid token' })
        } as Response);

        await act(async () => {
          screen.getByTestId('reset-password-btn').click();
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: 'token', password: 'newpassword' }),
        });
      });

      it('should handle reset password network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          screen.getByTestId('reset-password-btn').click();
        });

        expect(consoleSpy.error).toHaveBeenCalledWith('Reset password error:', expect.any(Error));
      });
    });

    describe('refreshUser', () => {
      beforeEach(async () => {
        // Mock initial auth check to fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);
        mockFetch.mockResolvedValueOnce({ ok: true } as Response); // clearInvalidCookie

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        jest.clearAllMocks();
      });

      it('should refresh user data', async () => {
        const mockUser: User = {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isEmailVerified: true
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        await act(async () => {
          screen.getByTestId('refresh-user-btn').click();
        });

        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
          credentials: 'include',
        });
      });
    });

    describe('setTimeout behavior in login', () => {
      beforeEach(async () => {
        // Mock initial auth check to fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);
        mockFetch.mockResolvedValueOnce({ ok: true } as Response); // clearInvalidCookie

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        jest.clearAllMocks();
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should trigger delayed checkAuth after successful login', async () => {
        const mockUser: User = {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isEmailVerified: true
        };

        // Mock login response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        await act(async () => {
          screen.getByTestId('login-btn').click();
        });

        // Mock the delayed checkAuth call
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, user: mockUser })
        } as Response);

        // Fast-forward time to trigger setTimeout
        act(() => {
          jest.advanceTimersByTime(100);
        });

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledTimes(3);
        });
      });
    });
  });
});
