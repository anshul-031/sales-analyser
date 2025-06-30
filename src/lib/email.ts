import nodemailer from 'nodemailer';
import { NextRequest } from 'next/server';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

// Function to dynamically determine base URL from request
function getBaseUrl(request?: NextRequest): string {
  // If no request provided, fall back to environment variable
  if (!request) {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  // Dynamically detect base URL from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ||
                  (host?.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      console.error('SMTP credentials not configured');
      return false;
    }

    const mailOptions = {
      from: `"Sales Analyzer" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Send email verification email
export async function sendEmailVerification(email: string, token: string, request?: NextRequest): Promise<boolean> {
  const baseUrl = getBaseUrl(request);
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Sales Analyzer</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Sales Analyzer!</h1>
      </div>
      <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for signing up for Sales Analyzer. To complete your registration and start analyzing your sales calls, please verify your email address.</p>
        <p>Click the button below to verify your email:</p>
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p><strong>This link will expire in 24 hours.</strong></p>
      </div>
      <div class="footer">
        <p>If you didn't create an account with Sales Analyzer, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to Sales Analyzer!
    
    Please verify your email address by clicking the following link:
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create an account with Sales Analyzer, you can safely ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Sales Analyzer',
    html,
    text,
  });
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string, request?: NextRequest): Promise<boolean> {
  const baseUrl = getBaseUrl(request);
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Sales Analyzer</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Password Reset Request</h1>
      </div>
      <div class="content">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password for your Sales Analyzer account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <div class="warning">
          <strong>Security Notice:</strong>
          <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password will remain unchanged until you complete the reset process</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request - Sales Analyzer
    
    We received a request to reset your password for your Sales Analyzer account.
    
    Click the following link to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this reset, please ignore this email. Your password will remain unchanged.
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Sales Analyzer',
    html,
    text,
  });
}
