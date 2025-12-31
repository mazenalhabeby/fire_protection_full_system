import { Controller, Get, Query, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { EmailService } from './email.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Email Preview Controller - Development only
 * View all email templates at: /api/email-preview
 *
 * SECURITY: Preview endpoints are public (view-only HTML) but send-test requires admin auth
 */
@Controller('email-preview')
export class EmailPreviewController {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly emailService: EmailService) {}

  @Public()
  @Get()
  getPreviewList(@Res() res: Response) {
    // Block all preview functionality in production
    if (this.isProduction) {
      throw new ForbiddenException('Email preview is disabled in production');
    }

    const templates = [
      { name: 'Email Verification (Link)', path: '/api/email-preview/verify-email' },
      { name: 'Email Verification (Code)', path: '/api/email-preview/verify-code' },
      { name: 'Password Reset', path: '/api/email-preview/password-reset' },
      { name: 'Welcome Email', path: '/api/email-preview/welcome' },
      { name: 'Security Alert - New Login', path: '/api/email-preview/security-new-login' },
      { name: 'Security Alert - Password Changed', path: '/api/email-preview/security-password-changed' },
      { name: 'Support Ticket Created', path: '/api/email-preview/ticket-created' },
      { name: 'Support Ticket Reply', path: '/api/email-preview/ticket-reply' },
      { name: 'Transfer Confirmation', path: '/api/email-preview/transfer' },
      { name: 'Withdrawal Confirmation', path: '/api/email-preview/withdrawal' },
      { name: '2FA Enabled', path: '/api/email-preview/2fa-enabled' },
      { name: '2FA Disabled', path: '/api/email-preview/2fa-disabled' },
      { name: 'Recovery Code Used', path: '/api/email-preview/recovery-code' },
    ];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Email Template Preview</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f5f5f5; margin: 0; }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }

    /* Send Test Section */
    .send-test { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px; padding: 24px; margin-bottom: 30px; color: white; }
    .send-test h2 { margin: 0 0 16px 0; font-size: 18px; }
    .send-test-form { display: flex; gap: 12px; flex-wrap: wrap; }
    .send-test input[type="email"] { flex: 1; min-width: 250px; padding: 12px 16px; border: none; border-radius: 8px; font-size: 14px; }
    .send-test select { padding: 12px 16px; border: none; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; }
    .send-test button { padding: 12px 24px; border: none; border-radius: 8px; background: #111; color: white; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .send-test button:hover { transform: scale(1.02); }
    .send-result { margin-top: 12px; padding: 12px; border-radius: 8px; display: none; }
    .send-result.success { background: rgba(255,255,255,0.2); display: block; }
    .send-result.error { background: rgba(239,68,68,0.3); display: block; }

    /* Templates Grid */
    h3 { color: #333; margin: 0 0 16px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card { display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .name { font-weight: 600; font-size: 16px; }
    .path { font-size: 12px; color: #888; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>📧 Email Template Preview</h1>
  <p class="subtitle">Preview and test email templates for fire-protection.tech</p>

  <!-- Send Test Email Section -->
  <div class="send-test">
    <h2>🚀 Send Test Email</h2>
    <form class="send-test-form" onsubmit="sendTestEmail(event)">
      <input type="email" id="testEmail" placeholder="Enter email address..." required />
      <select id="testTemplate">
        <option value="welcome">Welcome Email</option>
        <option value="verify-code">Verification Code</option>
        <option value="verify-email">Verification Link</option>
        <option value="password-reset">Password Reset</option>
        <option value="security-new-login">Security Alert</option>
        <option value="2fa-enabled">2FA Enabled</option>
        <option value="2fa-disabled">2FA Disabled</option>
      </select>
      <button type="submit">Send Test</button>
    </form>
    <div id="sendResult" class="send-result"></div>
  </div>

  <h3>Preview Templates</h3>
  <div class="grid">
    ${templates.map(t => `
      <a class="card" href="${t.path}" target="_blank">
        <div class="name">${t.name}</div>
        <div class="path">${t.path}</div>
      </a>
    `).join('')}
  </div>

  <script>
    async function sendTestEmail(e) {
      e.preventDefault();
      const email = document.getElementById('testEmail').value;
      const template = document.getElementById('testTemplate').value;
      const resultDiv = document.getElementById('sendResult');

      resultDiv.className = 'send-result';
      resultDiv.textContent = 'Sending...';
      resultDiv.style.display = 'block';

      try {
        const res = await fetch('/api/email-preview/send-test?email=' + encodeURIComponent(email) + '&template=' + template);
        const data = await res.json();

        if (data.success) {
          resultDiv.className = 'send-result success';
          resultDiv.textContent = '✓ ' + data.message;
        } else {
          resultDiv.className = 'send-result error';
          resultDiv.textContent = '✗ ' + (data.error || 'Failed to send');
        }
      } catch (err) {
        resultDiv.className = 'send-result error';
        resultDiv.textContent = '✗ Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
    res.type('html').send(html);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Res() res: Response) {
    const html = await this.generateTemplate('sendEmailVerification', [
      'user@example.com',
      'https://example.com/verify?token=abc123',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('verify-code')
  async verifyCode(@Res() res: Response) {
    const html = await this.generateTemplate('sendEmailVerificationCode', [
      'user@example.com',
      '847291',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('password-reset')
  async passwordReset(@Res() res: Response) {
    const html = await this.generateTemplate('sendPasswordReset', [
      'user@example.com',
      'https://example.com/reset-password?token=xyz789',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('welcome')
  async welcome(@Res() res: Response) {
    const html = await this.generateTemplate('sendWelcomeEmail', [
      'user@example.com',
      'John',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('security-new-login')
  async securityNewLogin(@Res() res: Response) {
    const html = await this.generateTemplate('sendSecurityAlert', [
      'user@example.com',
      'new_login',
      { deviceName: 'Chrome on MacOS', location: 'San Francisco, USA', timestamp: new Date() },
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('security-password-changed')
  async securityPasswordChanged(@Res() res: Response) {
    const html = await this.generateTemplate('sendSecurityAlert', [
      'user@example.com',
      'password_changed',
      { timestamp: new Date() },
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('ticket-created')
  async ticketCreated(@Res() res: Response) {
    const html = await this.generateTemplate('sendTicketCreatedEmail', [
      'user@example.com',
      '12345',
      'Having trouble with token transfer',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('ticket-reply')
  async ticketReply(@Res() res: Response) {
    const html = await this.generateTemplate('sendTicketReplyEmail', [
      'user@example.com',
      '12345',
      'Having trouble with token transfer',
      'Thank you for reaching out! We have looked into your issue and found that the transfer is pending blockchain confirmation. It should complete within the next 30 minutes.',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('transfer')
  async transfer(@Res() res: Response) {
    const html = await this.generateTemplate('sendTransferConfirmationEmail', [
      'user@example.com',
      '582941',
      'Jane Smith',
      '1,000',
      '10',
      '1,010',
      'HBCT',
      15,
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('withdrawal')
  async withdrawal(@Res() res: Response) {
    const html = await this.generateTemplate('sendWithdrawalConfirmationEmail', [
      'user@example.com',
      '729384',
      '5,000',
      'HBCT',
      '0x1234567890abcdef1234567890abcdef12345678',
      30,
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('2fa-enabled')
  async twoFactorEnabled(@Res() res: Response) {
    const html = await this.generateTemplate('sendTwoFactorEnabledEmail', [
      'user@example.com',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('2fa-disabled')
  async twoFactorDisabled(@Res() res: Response) {
    const html = await this.generateTemplate('sendTwoFactorDisabledEmail', [
      'user@example.com',
    ]);
    res.type('html').send(html);
  }

  @Public()
  @Get('recovery-code')
  async recoveryCode(@Res() res: Response) {
    const html = await this.generateTemplate('sendRecoveryCodeUsedEmail', [
      'user@example.com',
      3,
    ]);
    res.type('html').send(html);
  }

  /**
   * Send a test email to a real address
   * Usage: /api/email-preview/send-test?email=your@email.com&template=welcome
   * SECURITY: Requires admin authentication - NOT public
   */
  @UseGuards(AdminGuard)
  @Get('send-test')
  async sendTest(
    @Query('email') email: string,
    @Query('template') template: string = 'welcome',
    @Res() res: Response,
  ) {
    // Block in production for extra safety
    if (this.isProduction) {
      throw new ForbiddenException('Email preview is disabled in production');
    }

    if (!email) {
      res.status(400).json({ error: 'Email parameter is required' });
      return;
    }

    try {
      let result = false;

      switch (template) {
        case 'welcome':
          result = await this.emailService.sendWelcomeEmail(email, 'Test User');
          break;
        case 'verify-email':
          result = await this.emailService.sendEmailVerification(email, 'https://fire-protection.tech/verify?token=test123');
          break;
        case 'verify-code':
          result = await this.emailService.sendEmailVerificationCode(email, '847291');
          break;
        case 'password-reset':
          result = await this.emailService.sendPasswordReset(email, 'https://fire-protection.tech/reset?token=test123');
          break;
        case 'security-new-login':
          result = await this.emailService.sendSecurityAlert(email, 'new_login', {
            deviceName: 'Chrome on MacOS',
            location: 'Cairo, Egypt',
            timestamp: new Date(),
          });
          break;
        case '2fa-enabled':
          result = await this.emailService.sendTwoFactorEnabledEmail(email);
          break;
        case '2fa-disabled':
          result = await this.emailService.sendTwoFactorDisabledEmail(email);
          break;
        default:
          result = await this.emailService.sendWelcomeEmail(email, 'Test User');
      }

      res.json({
        success: result,
        message: result ? `Test email sent to ${email}` : 'Failed to send email',
        template,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async generateTemplate(methodName: string, args: any[]): Promise<string> {
    // Block in production
    if (this.isProduction) {
      throw new ForbiddenException('Email preview is disabled in production');
    }

    const originalSend = this.emailService.sendEmail.bind(this.emailService);
    let capturedHtml = '';

    this.emailService.sendEmail = async (options: any) => {
      capturedHtml = options.html;
      return true;
    };

    try {
      await (this.emailService as any)[methodName](...args);
      return capturedHtml;
    } finally {
      this.emailService.sendEmail = originalSend;
    }
  }
}
