# Authentication System

This project includes a complete authentication system with JWT tokens, email verification, and password reset functionality.

## Features

- **User Registration** with email verification
- **User Login** with JWT authentication
- **Password Reset** via email
- **Email Verification** for new accounts
- **Protected Routes** with middleware
- **Responsive UI** with modern design
- **Password Strength Validation**
- **HTTP-only Cookie** storage for tokens

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# JWT Configuration
JWT_SECRET="your-super-secret-and-long-jwt-key"
JWT_EXPIRES_IN="7d"

# SMTP Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-email-app-password"
FROM_EMAIL="your-email@gmail.com"

# App URL (for email links)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Email Configuration

For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

For other providers, update the SMTP settings accordingly.

### 3. Database Setup

The authentication system adds the following fields to the User model:

- `email` (unique)
- `password` (hashed)
- `firstName` (optional)
- `lastName` (optional)
- `isEmailVerified` (boolean)
- `emailVerificationToken` (string, nullable)
- `emailVerificationExpires` (datetime, nullable)
- `passwordResetToken` (string, nullable)
- `passwordResetExpires` (datetime, nullable)

Run the database migration:

```bash
npm run db:push
```

## API Routes

### Authentication Routes

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in user
- `POST /api/auth/logout` - Sign out user
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/verify-email?token=xxx` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Protected Routes

The following routes require authentication:
- `/upload`
- `/analytics`  
- `/call-analysis`

## Frontend Components

### Pages
- `/login` - Sign in form
- `/register` - Sign up form
- `/forgot-password` - Request password reset
- `/reset-password` - Reset password with token

### Components
- `LoginForm` - Login component
- `RegisterForm` - Registration component
- `ForgotPasswordForm` - Password reset request
- `ResetPasswordForm` - Password reset form
- `Navigation` - Updated with auth features

### Context
- `AuthProvider` - Authentication context provider
- `useAuth` - Hook for authentication state

## Usage

### Protecting Components

```tsx
import { useAuth } from '@/lib/auth-context';

function ProtectedComponent() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return <div>Hello, {user.email}!</div>;
}
```

### Authentication State

```tsx
const { user, login, logout, register, loading } = useAuth();

// Check if user is authenticated
if (user) {
  console.log('User is logged in:', user.email);
}

// Login
const result = await login(email, password);
if (result.success) {
  // Login successful
} else {
  console.error(result.message);
}
```

## Security Features

- **JWT Tokens** with configurable expiration
- **HTTP-only Cookies** prevent XSS attacks
- **Password Hashing** with bcrypt (12 rounds)
- **Secure Token Generation** for email verification and password reset
- **Rate Limiting** considerations (implement as needed)
- **Email Verification** prevents fake accounts
- **Password Strength** validation
- **CSRF Protection** via SameSite cookies

## Email Templates

The system includes beautiful HTML email templates for:
- Email verification
- Password reset
- Welcome messages

Templates are responsive and include proper branding.

## Troubleshooting

### Email Issues
1. Check SMTP credentials
2. Verify app password for Gmail
3. Check spam folder
4. Ensure `NEXT_PUBLIC_APP_URL` is correct

### Token Issues
1. Verify JWT_SECRET is set
2. Check token expiration
3. Clear cookies and try again

### Database Issues
1. Run `npm run db:push` to sync schema
2. Check database connection
3. Verify Prisma client is generated

## Development

Start the development server:

```bash
npm run dev
```

The authentication system will be available at:
- http://localhost:3000/login
- http://localhost:3000/register
- http://localhost:3000/forgot-password
