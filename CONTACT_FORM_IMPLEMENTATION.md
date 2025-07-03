# Contact Form Feature

## Overview

The contact form feature has been successfully implemented to replace the "Watch Demo" button on the landing page. When users click "Contact Us", they can fill out a form with their details and send a message directly to the sales team.

## Components Created

### 1. ContactForm Component (`/src/components/ContactForm.tsx`)
- Modal-style contact form with fields for:
  - Name (required)
  - Email (required)
  - Company (optional)
  - Phone (optional)
  - Message (required)
- Form validation and error handling
- Loading states during submission
- Success confirmation after submission

### 2. Contact API Route (`/src/app/api/contact/route.ts`)
- Handles POST requests from the contact form
- Validates input data
- Sends email to admin with contact details
- Sends confirmation email to the user
- Returns appropriate success/error responses

### 3. Updated Landing Page (`/src/components/LandingPage.tsx`)
- Replaced "Watch Demo" button with "Contact Us" button
- Added contact form modal integration
- Added necessary imports and state management

## Email Configuration Required

To use the contact form, you need to set up the following environment variables:

### Required Variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@yourcompany.com  # Email where contact form submissions will be sent
```

### Optional Variables:
```env
FROM_EMAIL=your-email@gmail.com  # Defaults to SMTP_FROM or SMTP_USER if not set
SMTP_FROM=no-reply@yourcompany.com  # Alternative from address
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
3. **Use the app password** as `SMTP_PASS` (not your regular Gmail password)

## Features

### User Experience:
- Clean, professional modal design
- Real-time form validation
- Loading states during submission
- Success confirmation with automatic modal close
- Error handling with user-friendly messages

### Admin Experience:
- Receives well-formatted HTML email with contact details
- Includes all user information in an organized layout
- Timestamp of submission
- Clear action required (respond within 24 hours)

### User Confirmation:
- Automatic confirmation email sent to the user
- Professional email template matching the brand
- Clear expectations about response time
- Encouragement to explore the platform

## Email Templates

### Admin Notification Email:
- Professional HTML layout with contact details
- Clear sections for name, email, company, phone, and message
- Branded header with Sales Analyzer styling
- Timestamp and source information

### User Confirmation Email:
- Thank you message with response time expectations
- What happens next section
- Branded professional design
- Encouragement to explore the platform

## Technical Details

### Form Validation:
- Client-side validation for required fields
- Email format validation
- Server-side validation for security
- Error handling for network issues

### Security:
- Input sanitization
- Email validation
- Rate limiting (can be added if needed)
- Secure email transmission

### Response Handling:
- Proper HTTP status codes
- Detailed error messages
- Success confirmation
- Graceful error handling

## Usage

1. User visits the landing page
2. Clicks "Contact Us" button
3. Modal opens with contact form
4. User fills out the form
5. Form is submitted via API
6. Admin receives email notification
7. User receives confirmation email
8. Success message is displayed

## Customization

### Styling:
- Uses Tailwind CSS for responsive design
- Consistent with the existing brand colors
- Easy to modify color scheme in the component

### Email Templates:
- HTML templates in the API route
- Easy to customize branding and content
- Responsive email design

### Form Fields:
- Easy to add/remove fields in the ContactForm component
- Validation rules can be adjusted
- API route will handle additional fields automatically

## Troubleshooting

### Common Issues:
1. **Email not sending:** Check SMTP configuration
2. **Invalid email format:** Ensure proper email validation
3. **Form not submitting:** Check network connectivity and API endpoint
4. **Modal not opening:** Verify state management and button click handlers

### Error Messages:
- User-friendly error messages for all common scenarios
- Server-side error logging for debugging
- Fallback error messages for unexpected issues

## Future Enhancements

Potential improvements that could be added:
- Rate limiting to prevent spam
- CAPTCHA integration for additional security
- File attachment support
- Integration with CRM systems
- Auto-responder with scheduling links
- Multi-language support
- Analytics tracking for form submissions
