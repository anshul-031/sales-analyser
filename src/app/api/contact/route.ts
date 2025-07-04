import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission - Sales Analyzer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 5px; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; margin-top: 5px; }
          .message-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
          <h2>Contact Details</h2>
          
          <div class="info-row">
            <div class="label">Full Name:</div>
            <div class="value">${name}</div>
          </div>
          
          <div class="info-row">
            <div class="label">Email Address:</div>
            <div class="value">${email}</div>
          </div>
          
          ${company ? `
          <div class="info-row">
            <div class="label">Company:</div>
            <div class="value">${company}</div>
          </div>
          ` : ''}
          
          ${phone ? `
          <div class="info-row">
            <div class="label">Phone Number:</div>
            <div class="value">${phone}</div>
          </div>
          ` : ''}
          
          <div class="message-box">
            <div class="label">Message:</div>
            <div class="value">${message.replace(/\n/g, '<br>')}</div>
          </div>
        </div>
        <div class="footer">
          <p>This message was sent from the Sales Analyzer contact form.</p>
          <p>Received on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      New Contact Form Submission - Sales Analyzer
      
      Contact Details:
      Name: ${name}
      Email: ${email}
      ${company ? `Company: ${company}` : ''}
      ${phone ? `Phone: ${phone}` : ''}
      
      Message:
      ${message}
      
      Received on: ${new Date().toLocaleString()}
    `;

    // Send email to admin (you'll need to set this email in your environment variables)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    
    if (!adminEmail) {
      console.error('ADMIN_EMAIL not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact form is temporarily unavailable. Please try again later or contact us directly.' 
        },
        { status: 500 }
      );
    }

    const emailSent = await sendEmail({
      to: adminEmail,
      subject: `New Contact Form Submission from ${name}`,
      html: emailHtml,
      text: emailText,
    });

    if (!emailSent) {
      console.error('Failed to send contact form email');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send your message. Please try again later.' 
        },
        { status: 500 }
      );
    }

    // Send confirmation email to the user
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Contacting Sales Analyzer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Thank You for Contacting Us!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for reaching out to Sales Analyzer. We've received your message and will get back to you within 24 hours.</p>
          
          <div class="highlight">
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our team will review your message</li>
              <li>We'll prepare a personalized response</li>
              <li>You'll hear back from us within 24 hours</li>
              <li>If urgent, feel free to call us directly</li>
            </ul>
          </div>
          
          <p>In the meantime, feel free to explore our platform and start analyzing your sales calls!</p>
          
          <p>Best regards,<br>
          The Sales Analyzer Team</p>
        </div>
        <div class="footer">
          <p>This is an automated confirmation email.</p>
        </div>
      </body>
      </html>
    `;

    const confirmationText = `
      Thank You for Contacting Sales Analyzer
      
      Hi ${name},
      
      Thank you for reaching out to Sales Analyzer. We've received your message and will get back to you within 24 hours.
      
      What happens next?
      - Our team will review your message
      - We'll prepare a personalized response
      - You'll hear back from us within 24 hours
      - If urgent, feel free to call us directly
      
      In the meantime, feel free to explore our platform and start analyzing your sales calls!
      
      Best regards,
      The Sales Analyzer Team
    `;

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Thank you for contacting Sales Analyzer',
      html: confirmationHtml,
      text: confirmationText,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
