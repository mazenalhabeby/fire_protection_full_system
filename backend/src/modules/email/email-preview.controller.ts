import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailService } from './email.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Email Preview Controller - For development/testing only
 * Access at: http://localhost:3001/api/email-preview
 */
@ApiTags('Email Preview (Dev)')
@Controller('email-preview')
@Public()
export class EmailPreviewController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @ApiOperation({ summary: 'List all available email templates' })
  getTemplateList(@Res() res: Response) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Template Preview</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
          h1 { color: #333; border-bottom: 2px solid #F59E0B; padding-bottom: 10px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 20px; }
          .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
          .card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
          .card h3 { margin: 0 0 8px 0; color: #333; }
          .card p { margin: 0 0 16px 0; color: #666; font-size: 14px; }
          .card a { display: inline-block; background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; }
          .card a:hover { opacity: 0.9; }
          .section { margin-top: 30px; }
          .section-title { font-size: 14px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h1>📧 Email Template Preview</h1>
        <p>Click on any template to preview how it looks.</p>

        <div class="section">
          <div class="section-title">Authentication Emails</div>
          <div class="grid">
            <div class="card">
              <h3>🔐 Verification Code</h3>
              <p>6-digit code sent after registration</p>
              <a href="/api/email-preview/verification-code">Preview</a>
            </div>
            <div class="card">
              <h3>✉️ Email Verification Link</h3>
              <p>Verification link sent after registration</p>
              <a href="/api/email-preview/verification-link">Preview</a>
            </div>
            <div class="card">
              <h3>🔑 Password Reset</h3>
              <p>Password reset request email</p>
              <a href="/api/email-preview/password-reset">Preview</a>
            </div>
            <div class="card">
              <h3>🎉 Welcome Email</h3>
              <p>Sent after successful registration</p>
              <a href="/api/email-preview/welcome">Preview</a>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Security Alerts</div>
          <div class="grid">
            <div class="card">
              <h3>🔔 New Login Alert</h3>
              <p>New device sign-in notification</p>
              <a href="/api/email-preview/security-alert?type=new_login">Preview</a>
            </div>
            <div class="card">
              <h3>✅ Password Changed</h3>
              <p>Password change confirmation</p>
              <a href="/api/email-preview/security-alert?type=password_changed">Preview</a>
            </div>
            <div class="card">
              <h3>🚫 Sessions Revoked</h3>
              <p>All sessions logged out notification</p>
              <a href="/api/email-preview/security-alert?type=sessions_revoked">Preview</a>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Support Emails</div>
          <div class="grid">
            <div class="card">
              <h3>🎫 Ticket Created</h3>
              <p>Support ticket confirmation</p>
              <a href="/api/email-preview/ticket-created">Preview</a>
            </div>
            <div class="card">
              <h3>💬 Ticket Reply</h3>
              <p>New reply on support ticket</p>
              <a href="/api/email-preview/ticket-reply">Preview</a>
            </div>
            <div class="card">
              <h3>📩 Contact Confirmation</h3>
              <p>Contact form submission confirmation</p>
              <a href="/api/email-preview/contact-confirmation">Preview</a>
            </div>
            <div class="card">
              <h3>🎫 Admin: New Ticket</h3>
              <p>Admin notification for new ticket</p>
              <a href="/api/email-preview/admin-ticket">Preview</a>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Transaction Emails</div>
          <div class="grid">
            <div class="card">
              <h3>💸 Transfer Confirmation</h3>
              <p>Internal transfer confirmation code</p>
              <a href="/api/email-preview/transfer-confirmation">Preview</a>
            </div>
            <div class="card">
              <h3>💰 Withdrawal Confirmation</h3>
              <p>Withdrawal authorization code</p>
              <a href="/api/email-preview/withdrawal-confirmation">Preview</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    res.type('text/html').send(html);
  }

  @Get('verification-code')
  @ApiOperation({ summary: 'Preview verification code email' })
  async previewVerificationCode(@Res() res: Response) {
    // Access private method via any type cast for preview
    const service = this.emailService as any;
    const content = `
      <p style="margin: 0 0 10px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        Thank you for joining <strong>HBC Fire Protection</strong>! Enter the verification code below to complete your registration.
      </p>
      ${service.getCodeBox('847293', '#f97316')}
      <p style="margin: 0; font-size: 14px; color: #6B7280; text-align: center;">
        Enter this code in the app to verify your email address.
      </p>
      ${service.getInfoBox('<strong>Important:</strong> This verification code expires in <strong>15 minutes</strong>. If you didn\'t create an account, you can safely ignore this email.', 'warning')}
    `;

    const html = service.getBaseTemplate({
      title: 'Verify Your Email',
      subtitle: 'Enter this code to continue',
      content,
      footerText: 'You received this email because you signed up for HBC Fire Protection.',
    });

    res.type('text/html').send(html);
  }

  @Get('verification-link')
  @ApiOperation({ summary: 'Preview verification link email' })
  async previewVerificationLink(@Res() res: Response) {
    const service = this.emailService as any;
    const verificationUrl = 'https://example.com/en/verify?token=abc123xyz';

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        Thank you for joining <strong>HBC Fire Protection</strong>! To complete your registration and secure your account, please verify your email address.
      </p>
      ${service.getButton('Verify Email Address', verificationUrl, '#f97316')}
      <p style="margin: 20px 0; font-size: 13px; color: #6B7280; text-align: center;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; color: #3B82F6; word-break: break-all; text-align: center; background: #F9FAFB; padding: 12px; border-radius: 6px;">
        ${verificationUrl}
      </p>
      ${service.getInfoBox('<strong>Important:</strong> This verification link expires in 24 hours. If you didn\'t create an account, you can safely ignore this email.', 'warning')}
    `;

    const html = service.getBaseTemplate({
      title: 'Verify Your Email',
      subtitle: 'One quick step to secure your account',
      content,
      footerText: 'You received this email because you signed up for HBC Fire Protection.',
    });

    res.type('text/html').send(html);
  }

  @Get('password-reset')
  @ApiOperation({ summary: 'Preview password reset email' })
  async previewPasswordReset(@Res() res: Response) {
    const service = this.emailService as any;
    const resetUrl = 'https://example.com/en/reset-password?token=xyz789abc';

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        We received a request to reset your password. Click the button below to create a new password for your account.
      </p>
      ${service.getButton('Reset Password', resetUrl, '#f97316')}
      <p style="margin: 20px 0; font-size: 13px; color: #6B7280; text-align: center;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; color: #3B82F6; word-break: break-all; text-align: center; background: #F9FAFB; padding: 12px; border-radius: 6px;">
        ${resetUrl}
      </p>
      ${service.getInfoBox(`
        <strong>Security Notice:</strong><br/>
        • This link expires in <strong>15 minutes</strong><br/>
        • If you didn't request this, please ignore this email<br/>
        • Your password won't change until you create a new one
      `, 'danger')}
    `;

    const html = service.getBaseTemplate({
      title: 'Reset Your Password',
      subtitle: 'Create a new secure password',
      content,
      footerText: 'If you didn\'t request this, your account is still secure.',
    });

    res.type('text/html').send(html);
  }

  @Get('welcome')
  @ApiOperation({ summary: 'Preview welcome email' })
  async previewWelcome(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 25px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        Hello <strong>John</strong>,<br/><br/>
        Welcome to the HBC Fire Protection ecosystem! We're thrilled to have you on board. Your account is now ready to explore all our features.
      </p>

      <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
        What you can do:
      </p>

      ${service.getFeatureCard('💰 Purchase HBCT Tokens', 'Buy tokens during our presale with multiple payment options', '🪙')}
      ${service.getFeatureCard('📈 Stake & Earn Rewards', 'Lock your tokens and earn attractive APY rewards', '🔒')}
      ${service.getFeatureCard('👥 Affiliate Program', 'Invite friends and earn commissions on their purchases', '🎁')}
      ${service.getFeatureCard('🛒 Marketplace', 'Redeem your tokens for exclusive products', '🛍️')}

      ${service.getButton('Go to Dashboard', 'https://example.com/en/dashboard', '#f97316')}

      <p style="margin: 25px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
        Questions? Our support team is here to help 24/7.
      </p>
    `;

    const html = service.getBaseTemplate({
      title: 'Welcome to HBC Fire Protection!',
      subtitle: 'Your journey to fire safety starts here',
      content,
      footerText: 'Thank you for joining our community!',
    });

    res.type('text/html').send(html);
  }

  @Get('security-alert')
  @ApiOperation({ summary: 'Preview security alert email' })
  @ApiQuery({ name: 'type', enum: ['new_login', 'password_changed', 'sessions_revoked'] })
  async previewSecurityAlert(
    @Query('type') type: 'new_login' | 'password_changed' | 'sessions_revoked' = 'new_login',
    @Res() res: Response,
  ) {
    const service = this.emailService as any;

    const alertConfig = {
      new_login: {
        title: 'New Login Detected',
        subtitle: 'A new device signed into your account',
        message: 'We detected a new sign-in to your HBC Fire Protection account.',
      },
      password_changed: {
        title: 'Password Changed',
        subtitle: 'Your password was successfully updated',
        message: 'Your account password has been successfully changed.',
      },
      sessions_revoked: {
        title: 'Sessions Revoked',
        subtitle: 'All devices have been logged out',
        message: 'All active sessions on your account have been logged out.',
      },
    };

    const config = alertConfig[type];

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        ${config.message}
      </p>

      ${service.getDetailsList([
        { label: 'Device', value: 'Chrome on Windows' },
        { label: 'Location', value: 'Vienna, Austria' },
        { label: 'Time', value: new Date().toLocaleString() },
      ])}

      ${type === 'new_login' ? service.getInfoBox(
        '<strong>Wasn\'t you?</strong> If you didn\'t perform this action, we recommend changing your password immediately and reviewing your active sessions in Settings.',
        'danger'
      ) : ''}

      ${service.getButton('Review Account Security', 'https://example.com/en/settings?tab=security', '#f97316')}
    `;

    const html = service.getBaseTemplate({
      title: config.title,
      subtitle: config.subtitle,
      content,
      footerText: 'This is an automated security notification.',
    });

    res.type('text/html').send(html);
  }

  @Get('ticket-created')
  @ApiOperation({ summary: 'Preview ticket created email' })
  async previewTicketCreated(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        Your support ticket has been created successfully. Our team will review it and respond as soon as possible.
      </p>

      ${service.getDetailsList([
        { label: 'Ticket Number', value: '#TKT-2024-001234' },
        { label: 'Subject', value: 'Unable to withdraw tokens' },
        { label: 'Status', value: '🟡 Open' },
      ])}

      <p style="margin: 20px 0; font-size: 14px; color: #6B7280;">
        You can track the status of your ticket and add additional information from your dashboard.
      </p>

      ${service.getButton('View Ticket', 'https://example.com/en/support/tickets', '#f97316')}
    `;

    const html = service.getBaseTemplate({
      title: 'Support Ticket Created',
      subtitle: 'Ticket #TKT-2024-001234',
      content,
      footerText: 'We typically respond within 24 hours.',
    });

    res.type('text/html').send(html);
  }

  @Get('ticket-reply')
  @ApiOperation({ summary: 'Preview ticket reply email' })
  async previewTicketReply(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        There's a new reply on your support ticket.
      </p>

      ${service.getDetailsList([
        { label: 'Ticket', value: '#TKT-2024-001234' },
        { label: 'Subject', value: 'Unable to withdraw tokens' },
      ])}

      <div style="background: #F9FAFB; border-left: 4px solid #f97316; border-radius: 0 10px 10px 0; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Reply from Support</p>
        <div style="font-size: 15px; color: #111827; line-height: 1.7;">
          Hello! Thank you for reaching out. I've reviewed your account and can see the withdrawal is pending network confirmation. This usually takes 10-30 minutes. If it doesn't complete within an hour, please let us know and we'll investigate further.
        </div>
      </div>

      ${service.getButton('Reply to Ticket', 'https://example.com/en/support/tickets', '#f97316')}
    `;

    const html = service.getBaseTemplate({
      title: 'New Reply on Your Ticket',
      subtitle: 'Ticket #TKT-2024-001234',
      content,
      footerText: 'You can reply directly from your dashboard.',
    });

    res.type('text/html').send(html);
  }

  @Get('contact-confirmation')
  @ApiOperation({ summary: 'Preview contact confirmation email' })
  async previewContactConfirmation(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        Hello <strong>John Doe</strong>,<br/><br/>
        Thank you for reaching out to us! We have received your message and our team will review it promptly.
      </p>

      ${service.getDetailsList([
        { label: 'Subject', value: 'Partnership Inquiry' },
        { label: 'Expected Response', value: '24-48 hours' },
      ])}

      ${service.getInfoBox('In the meantime, you might find answers to common questions in our <a href="https://example.com/en/faq" style="color: #3B82F6;">Help Center</a>.', 'info')}

      <p style="margin: 25px 0 0 0; font-size: 14px; color: #6B7280;">
        Best regards,<br/>
        <strong>The HBC Fire Protection Team</strong>
      </p>
    `;

    const html = service.getBaseTemplate({
      title: 'Message Received',
      subtitle: 'We\'ll get back to you soon',
      content,
      footerText: 'Thank you for contacting us!',
    });

    res.type('text/html').send(html);
  }

  @Get('admin-ticket')
  @ApiOperation({ summary: 'Preview admin ticket notification email' })
  async previewAdminTicket(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        A new support ticket has been submitted and requires attention.
      </p>

      ${service.getDetailsList([
        { label: 'Ticket Number', value: '#TKT-2024-001234' },
        { label: 'Subject', value: 'Unable to withdraw tokens' },
        { label: 'From', value: 'john.doe@example.com' },
        { label: 'Category', value: 'Withdrawals' },
      ])}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 15px 0;">
        <tr>
          <td>
            <span style="display: inline-block; background: #FEE2E2; color: #991B1B; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
              URGENT PRIORITY
            </span>
          </td>
        </tr>
      </table>

      ${service.getButton('View in Admin Panel', 'https://example.com/en/admin/support', '#f97316')}
    `;

    const html = service.getBaseTemplate({
      title: 'New Support Ticket',
      subtitle: 'Ticket #TKT-2024-001234',
      content,
      footerText: 'Admin notification - HBC Fire Protection',
    });

    res.type('text/html').send(html);
  }

  @Get('transfer-confirmation')
  @ApiOperation({ summary: 'Preview transfer confirmation email' })
  async previewTransferConfirmation(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 10px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        You've initiated a transfer. Please use the confirmation code below to complete the transaction.
      </p>

      ${service.getCodeBox('582947', '#f97316')}

      ${service.getDetailsList([
        { label: 'Recipient', value: '@johndoe' },
        { label: 'Amount', value: '1,000.00 HBCT' },
        { label: 'Fee', value: '5.00 HBCT' },
        { label: 'Total', value: '1,005.00 HBCT' },
      ])}

      ${service.getInfoBox('<strong>Important:</strong> This confirmation code expires in <strong>15 minutes</strong>. If you didn\'t initiate this transfer, please ignore this email and secure your account.', 'warning')}
    `;

    const html = service.getBaseTemplate({
      title: 'Confirm Your Transfer',
      subtitle: 'Enter the code to complete',
      content,
      footerText: 'Do not share this code with anyone.',
    });

    res.type('text/html').send(html);
  }

  @Get('withdrawal-confirmation')
  @ApiOperation({ summary: 'Preview withdrawal confirmation email' })
  async previewWithdrawalConfirmation(@Res() res: Response) {
    const service = this.emailService as any;

    const content = `
      <p style="margin: 0 0 10px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        You've requested a withdrawal. Please use the confirmation code below to authorize this transaction.
      </p>

      ${service.getCodeBox('739415', '#f97316')}

      ${service.getDetailsList([
        { label: 'Amount', value: '5,000.00 HBCT' },
        { label: 'Destination', value: '0x1234...5678ab' },
      ])}

      ${service.getInfoBox('<strong>Security Notice:</strong> This code expires in <strong>30 minutes</strong>. Never share this code with anyone. HBC staff will never ask for this code.', 'danger')}
    `;

    const html = service.getBaseTemplate({
      title: 'Confirm Your Withdrawal',
      subtitle: 'Authorization required',
      content,
      footerText: 'If you didn\'t request this withdrawal, please contact support immediately.',
    });

    res.type('text/html').send(html);
  }
}
