import nodemailer from 'nodemailer';

// Mock nodemailer before any imports
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail,
});

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

describe('Email Service', () => {
  let sendEmail: (options: any) => Promise<boolean>;
  let sendEmailVerification: (email: string, token: string) => Promise<boolean>;
  let sendPasswordResetEmail: (email: string, token: string) => Promise<boolean>;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      SMTP_USER: 'testuser',
      SMTP_PASS: 'testpass',
      FROM_EMAIL: 'from@example.com',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    };

    mockSendMail.mockClear();
    mockCreateTransport.mockClear();
    
    // Reset the mock to return a working transporter
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });

    const emailModule = await import('../email');
    sendEmail = emailModule.sendEmail;
    sendEmailVerification = emailModule.sendEmailVerification;
    sendPasswordResetEmail = emailModule.sendPasswordResetEmail;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('should send an email with the correct options', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: `"Sales Analyzer" <${process.env.FROM_EMAIL}>`,
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      }));
      expect(result).toBe(true);
    });

    it('should return false if sending email fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Failed to send'));
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await sendEmail(options);

      expect(result).toBe(false);
    });

    it('should return false if SMTP credentials are not configured', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      // Clear the mock before testing
      mockSendMail.mockClear();

      const emailModule = await import('../email');
      const { sendEmail: sendEmailLocal } = emailModule;

      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await sendEmailLocal(options);
      expect(result).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendEmailVerification', () => {
    it('should send a verification email', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });
      const result = await sendEmailVerification('test@example.com', 'test-token');
      expect(mockSendMail).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send a password reset email', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });
      const result = await sendPasswordResetEmail('test@example.com', 'test-token');
      expect(mockSendMail).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
