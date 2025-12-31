import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Logo embedded as base64 data URI
const LOGO_BASE64 = 'data:image/png;base64,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';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface DetailItem {
  label: string;
  value: string;
}

// Brand colors - matches frontend globals.css
const BRAND = {
  primary: '#f97316', // Orange - main brand color from frontend
  primaryDark: '#ea580c', // Orange 600
  secondary: '#f59e0b', // Amber - secondary brand color
  secondaryDark: '#d97706', // Amber 600
  accent: '#10B981', // Emerald
  danger: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  success: '#10B981', // Emerald
  info: '#3B82F6', // Blue
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  background: '#F9FAFB',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM_EMAIL',
      'noreply@hbctoken.com',
    );
    this.fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'HBC Fire Protection',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    // Initialize transporter
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn(
        'SMTP configuration incomplete - emails will be logged but not sent',
      );
    }
  }

  // ============================================
  // BASE EMAIL TEMPLATE
  // ============================================

  private getBaseTemplate(options: {
    title: string;
    subtitle?: string;
    content: string;
    footerText?: string;
  }): string {
    const { title, subtitle, content, footerText = '' } = options;

    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .main-container { width: 100% !important; }
      .content-padding { padding: 24px 20px !important; }
      .header-padding { padding: 20px !important; }
      .footer-padding { padding: 20px !important; }
      .mobile-full { width: 100% !important; display: block !important; }
      .mobile-center { text-align: center !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Main Container -->
        <table role="presentation" class="main-container" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%;">

          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND.white}; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

                <!-- Header - Clean & Simple -->
                <tr>
                  <td class="header-padding" style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); padding: 28px 32px; text-align: center;">
                    <!-- Logo - embedded base64 -->
                    <img src="${LOGO_BASE64}" alt="HBC Fire Protection" width="60" style="display: block; margin: 0 auto 12px auto;">
                    <!-- Brand Name -->
                    <p style="margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); letter-spacing: 2px; text-transform: uppercase;">
                      fire-protection.tech
                    </p>
                    <!-- Title -->
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND.white}; line-height: 1.3;">
                      ${title}
                    </h1>
                    ${subtitle ? `<p style="margin: 8px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.85); font-weight: 400;">${subtitle}</p>` : ''}
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td class="content-padding" style="padding: 32px;">
                    ${content}
                  </td>
                </tr>

                <!-- Footer inside card -->
                <tr>
                  <td class="footer-padding" style="background: ${BRAND.background}; border-top: 1px solid ${BRAND.border}; padding: 24px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="text-align: center;">
                          ${footerText ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: ${BRAND.textSecondary}; line-height: 1.5;">${footerText}</p>` : ''}
                          <p style="margin: 0; font-size: 12px; color: ${BRAND.textLight};">
                            &copy; ${currentYear} HBC Fire Protection. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- External Footer Links -->
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: ${BRAND.textLight};">
                <a href="${this.frontendUrl}" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">fire-protection.tech</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ============================================
  // UI COMPONENTS
  // ============================================

  private getButton(
    text: string,
    url: string,
    color: string = BRAND.primary,
  ): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 25px auto;">
        <tr>
          <td style="background: linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color)} 100%); border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(0,0,0,0.15);">
            <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: ${BRAND.white}; text-decoration: none; letter-spacing: 0.3px;">
              ${text}
            </a>
          </td>
        </tr>
      </table>`;
  }

  private getCodeBox(code: string, color: string = BRAND.primary): string {
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
        <tr>
          <td align="center">
            <div style="background: linear-gradient(135deg, ${color}10 0%, ${color}05 100%); border: 2px dashed ${color}40; border-radius: 12px; padding: 30px 20px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: ${BRAND.textSecondary}; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
              <p style="margin: 0; font-size: 42px; font-weight: 700; color: ${color}; letter-spacing: 10px; font-family: 'Courier New', monospace;">${code}</p>
            </div>
          </td>
        </tr>
      </table>`;
  }

  private getInfoBox(
    content: string,
    type: 'warning' | 'info' | 'success' | 'danger' = 'info',
  ): string {
    const colors = {
      warning: {
        bg: '#FEF3C7',
        border: '#F59E0B',
        text: '#92400E',
        icon: '⚠️',
      },
      info: {
        bg: '#DBEAFE',
        border: '#3B82F6',
        text: '#1E40AF',
        icon: 'ℹ️',
      },
      success: {
        bg: '#D1FAE5',
        border: '#10B981',
        text: '#065F46',
        icon: '✓',
      },
      danger: {
        bg: '#FEE2E2',
        border: '#EF4444',
        text: '#991B1B',
        icon: '⚠️',
      },
    };
    const c = colors[type];

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
        <tr>
          <td style="background: ${c.bg}; border-left: 4px solid ${c.border}; border-radius: 0 8px 8px 0; padding: 16px 20px;">
            <p style="margin: 0; font-size: 14px; color: ${c.text}; line-height: 1.6;">
              ${content}
            </p>
          </td>
        </tr>
      </table>`;
  }

  private getDetailsList(
    items: Array<DetailItem>,
  ): string {
    const rows = items.map(item => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid ${BRAND.border};">
          <span style="font-size: 13px; color: ${BRAND.textSecondary};">${item.label}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid ${BRAND.border}; text-align: right;">
          <span style="font-size: 14px; color: ${BRAND.textPrimary}; font-weight: 500;">${item.value}</span>
        </td>
      </tr>
    `).join('');

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${BRAND.background}; border-radius: 10px; margin: 20px 0; overflow: hidden;">
        ${rows}
      </table>`;
  }

  private getFeatureCard(title: string, description: string, icon: string): string {
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
        <tr>
          <td style="background: ${BRAND.background}; border-radius: 10px; padding: 18px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="40" valign="top">
                  <span style="font-size: 24px;">${icon}</span>
                </td>
                <td style="padding-left: 15px;">
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${BRAND.textPrimary};">${title}</p>
                  <p style="margin: 0; font-size: 13px; color: ${BRAND.textSecondary};">${description}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }

  private darkenColor(hex: string): string {
    // Simple color darkening
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = -30;
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  // ============================================
  // SEND EMAIL
  // ============================================

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    if (!this.transporter) {
      this.logger.log(`[DEV] Email would be sent to: ${to}`);
      this.logger.log(`[DEV] Subject: ${subject}`);
      this.logger.debug(`[DEV] Content: ${text || html}`);
      return true;
    }

    try {
      // Generate unique Message-ID for better deliverability
      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@fire-protection.tech>`;

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
        headers: {
          'Message-ID': messageId,
          'X-Priority': '3', // Normal priority
          'X-Mailer': 'HBC Fire Protection Mailer',
          'List-Unsubscribe': `<${this.frontendUrl}/en/settings/notifications>`,
          'Precedence': 'bulk',
        },
      });
      this.logger.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  // ============================================
  // AUTH EMAILS
  // ============================================

  async sendEmailVerification(userEmail: string, verificationUrl: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Thank you for joining <strong>HBC Fire Protection</strong>! To complete your registration and secure your account, please verify your email address.
      </p>
      ${this.getButton('Verify Email Address', verificationUrl, BRAND.primary)}
      <p style="margin: 20px 0; font-size: 13px; color: ${BRAND.textSecondary}; text-align: center;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; color: ${BRAND.info}; word-break: break-all; text-align: center; background: ${BRAND.background}; padding: 12px; border-radius: 6px;">
        ${verificationUrl}
      </p>
      ${this.getInfoBox('<strong>Important:</strong> This verification link expires in 24 hours. If you didn\'t create an account, you can safely ignore this email.', 'warning')}
    `;

    const html = this.getBaseTemplate({
      title: 'Verify Your Email',
      subtitle: 'One quick step to secure your account',
      content,
      footerText: 'You received this email because you signed up for HBC Fire Protection.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '✉️ Verify Your Email - HBC Fire Protection',
      html,
    });
  }

  async sendEmailVerificationCode(userEmail: string, code: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 10px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Thank you for joining <strong>HBC Fire Protection</strong>! Enter the verification code below to complete your registration.
      </p>
      ${this.getCodeBox(code, BRAND.primary)}
      <p style="margin: 0; font-size: 14px; color: ${BRAND.textSecondary}; text-align: center;">
        Enter this code in the app to verify your email address.
      </p>
      ${this.getInfoBox('<strong>Important:</strong> This verification code expires in <strong>15 minutes</strong>. If you didn\'t create an account, you can safely ignore this email.', 'warning')}
    `;

    const html = this.getBaseTemplate({
      title: 'Verify Your Email',
      subtitle: 'Enter this code to continue',
      content,
      footerText: 'You received this email because you signed up for HBC Fire Protection.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '🔐 Your Verification Code - HBC Fire Protection',
      html,
    });
  }

  async sendPasswordReset(userEmail: string, resetUrl: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        We received a request to reset your password. Click the button below to create a new password for your account.
      </p>
      ${this.getButton('Reset Password', resetUrl, BRAND.danger)}
      <p style="margin: 20px 0; font-size: 13px; color: ${BRAND.textSecondary}; text-align: center;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; color: ${BRAND.info}; word-break: break-all; text-align: center; background: ${BRAND.background}; padding: 12px; border-radius: 6px;">
        ${resetUrl}
      </p>
      ${this.getInfoBox(`
        <strong>Security Notice:</strong><br/>
        • This link expires in <strong>15 minutes</strong><br/>
        • If you didn't request this, please ignore this email<br/>
        • Your password won't change until you create a new one
      `, 'danger')}
    `;

    const html = this.getBaseTemplate({
      title: 'Reset Your Password',
      subtitle: 'Create a new secure password',
      content,
      footerText: 'If you didn\'t request this, your account is still secure.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '🔑 Reset Your Password - HBC Fire Protection',
      html,
    });
  }

  async sendWelcomeEmail(userEmail: string, firstName?: string): Promise<boolean> {
    const name = firstName || 'there';
    const content = `
      <!-- Welcome Message -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
        <tr>
          <td align="center">
            <p style="margin: 0 0 8px 0; font-size: 40px; line-height: 1;">👋</p>
            <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: ${BRAND.textPrimary};">
              Welcome, ${name}!
            </h2>
            <p style="margin: 0; font-size: 15px; color: ${BRAND.textSecondary}; line-height: 1.6;">
              You're now part of the future of fire protection.<br/>Let's get you started!
            </p>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
        <tr>
          <td style="border-top: 1px solid ${BRAND.border};"></td>
        </tr>
      </table>

      <!-- Quick Stats -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 0 16px;">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND.primary};">50%</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: ${BRAND.textSecondary};">Max Bonus</p>
                </td>
                <td align="center" style="padding: 0 16px; border-left: 1px solid ${BRAND.border};">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND.accent};">15%</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: ${BRAND.textSecondary};">Referral</p>
                </td>
                <td align="center" style="padding: 0 16px; border-left: 1px solid ${BRAND.border};">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND.info};">24/7</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: ${BRAND.textSecondary};">Support</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Getting Started Label -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
        <tr>
          <td>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${BRAND.textSecondary}; text-transform: uppercase; letter-spacing: 1px;">
              Get Started
            </p>
          </td>
        </tr>
      </table>

      <!-- Feature 1: Buy Tokens -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
        <tr>
          <td style="padding: 16px; background: #FFF7ED; border-radius: 12px; border: 1px solid #FFEDD5;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="48" valign="top">
                  <p style="margin: 0; font-size: 32px; line-height: 1;">🪙</p>
                </td>
                <td style="padding-left: 12px;">
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${BRAND.textPrimary};">Buy HBCT Tokens</p>
                  <p style="margin: 0; font-size: 13px; color: ${BRAND.textSecondary}; line-height: 1.5;">Get early access to presale prices with crypto or card</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Feature 2: Lock & Earn -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
        <tr>
          <td style="padding: 16px; background: #FAF5FF; border-radius: 12px; border: 1px solid #F3E8FF;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="48" valign="top">
                  <p style="margin: 0; font-size: 32px; line-height: 1;">🔐</p>
                </td>
                <td style="padding-left: 12px;">
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${BRAND.textPrimary};">Lock & Earn Up to 50%</p>
                  <p style="margin: 0; font-size: 13px; color: ${BRAND.textSecondary}; line-height: 1.5;">Stake your tokens for 6-24 months and earn bonus</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Feature 3: Invite & Earn -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
        <tr>
          <td style="padding: 16px; background: #ECFDF5; border-radius: 12px; border: 1px solid #D1FAE5;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="48" valign="top">
                  <p style="margin: 0; font-size: 32px; line-height: 1;">🤝</p>
                </td>
                <td style="padding-left: 12px;">
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${BRAND.textPrimary};">Invite & Earn 15%</p>
                  <p style="margin: 0; font-size: 13px; color: ${BRAND.textSecondary}; line-height: 1.5;">Share your referral link and earn on every sale</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Feature 4: Marketplace -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
        <tr>
          <td style="padding: 16px; background: #EFF6FF; border-radius: 12px; border: 1px solid #DBEAFE;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="48" valign="top">
                  <p style="margin: 0; font-size: 32px; line-height: 1;">🧯</p>
                </td>
                <td style="padding-left: 12px;">
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${BRAND.textPrimary};">Exclusive Marketplace</p>
                  <p style="margin: 0; font-size: 13px; color: ${BRAND.textSecondary}; line-height: 1.5;">Redeem tokens for fire protection products</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); border-radius: 10px;">
                  <a href="${this.frontendUrl}/en/dashboard" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Go to Dashboard →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Support Note -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="padding: 16px; background: ${BRAND.background}; border-radius: 10px;">
            <p style="margin: 0; font-size: 13px; color: ${BRAND.textSecondary}; line-height: 1.5;">
              Need help? Our support team is available 24/7<br/>
              <a href="${this.frontendUrl}/en/support" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">Contact Support →</a>
            </p>
          </td>
        </tr>
      </table>
    `;

    const html = this.getBaseTemplate({
      title: 'Welcome to HBC!',
      subtitle: 'Your account is ready',
      content,
      footerText: 'Thank you for joining the HBC Fire Protection community!',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '🎉 Welcome to HBC Fire Protection!',
      html,
    });
  }

  async sendSecurityAlert(
    userEmail: string,
    alertType: 'new_login' | 'password_changed' | 'sessions_revoked',
    details: {
      deviceName?: string;
      location?: string;
      timestamp?: Date;
    },
  ): Promise<boolean> {
    const alertConfig = {
      new_login: {
        title: 'New Login Detected',
        subtitle: 'A new device signed into your account',
        color: BRAND.warning,
        icon: '🔔',
      },
      password_changed: {
        title: 'Password Changed',
        subtitle: 'Your password was successfully updated',
        color: BRAND.accent,
        icon: '✅',
      },
      sessions_revoked: {
        title: 'Sessions Revoked',
        subtitle: 'All devices have been logged out',
        color: BRAND.danger,
        icon: '🚫',
      },
    };

    const config = alertConfig[alertType];
    const timestamp = details.timestamp || new Date();

    const detailItems: Array<{ label: string; value: string }> = [];
    if (details.deviceName) detailItems.push({ label: 'Device', value: details.deviceName });
    if (details.location) detailItems.push({ label: 'Location', value: details.location });
    detailItems.push({ label: 'Time', value: timestamp.toLocaleString() });

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        ${alertType === 'new_login' ? 'We detected a new sign-in to your HBC Fire Protection account.' : ''}
        ${alertType === 'password_changed' ? 'Your account password has been successfully changed.' : ''}
        ${alertType === 'sessions_revoked' ? 'All active sessions on your account have been logged out.' : ''}
      </p>

      ${this.getDetailsList(detailItems)}

      ${alertType === 'new_login' ? this.getInfoBox(
        '<strong>Wasn\'t you?</strong> If you didn\'t perform this action, we recommend changing your password immediately and reviewing your active sessions in Settings.',
        'danger'
      ) : ''}

      ${this.getButton('Review Account Security', `${this.frontendUrl}/en/settings?tab=security`, config.color)}
    `;

    const html = this.getBaseTemplate({
      title: config.title,
      subtitle: config.subtitle,
      content,
      footerText: 'This is an automated security notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: `${config.icon} ${config.title} - HBC Fire Protection`,
      html,
    });
  }

  // ============================================
  // SUPPORT EMAILS
  // ============================================

  async sendTicketCreatedEmail(
    userEmail: string,
    ticketNumber: string,
    subject: string,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Your support ticket has been created successfully. Our team will review it and respond as soon as possible.
      </p>

      ${this.getDetailsList([
        { label: 'Ticket Number', value: `#${ticketNumber}` },
        { label: 'Subject', value: subject },
        { label: 'Status', value: '🟡 Open' },
      ])}

      <p style="margin: 20px 0; font-size: 14px; color: ${BRAND.textSecondary};">
        You can track the status of your ticket and add additional information from your dashboard.
      </p>

      ${this.getButton('View Ticket', `${this.frontendUrl}/en/support/tickets`, BRAND.info)}
    `;

    const html = this.getBaseTemplate({
      title: 'Support Ticket Created',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'We typically respond within 24 hours.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: `🎫 [Ticket #${ticketNumber}] ${subject}`,
      html,
    });
  }

  async sendTicketReplyEmail(
    userEmail: string,
    ticketNumber: string,
    subject: string,
    replyContent: string,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        There's a new reply on your support ticket.
      </p>

      ${this.getDetailsList([
        { label: 'Ticket', value: `#${ticketNumber}` },
        { label: 'Subject', value: subject },
      ])}

      <div style="background: ${BRAND.background}; border-left: 4px solid ${BRAND.accent}; border-radius: 0 10px 10px 0; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Reply from Support</p>
        <div style="font-size: 15px; color: ${BRAND.textPrimary}; line-height: 1.7;">
          ${replyContent}
        </div>
      </div>

      ${this.getButton('Reply to Ticket', `${this.frontendUrl}/en/support/tickets`, BRAND.accent)}
    `;

    const html = this.getBaseTemplate({
      title: 'New Reply on Your Ticket',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'You can reply directly from your dashboard.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: `💬 [Ticket #${ticketNumber}] New Reply: ${subject}`,
      html,
    });
  }

  async sendContactConfirmationEmail(
    userEmail: string,
    name: string,
    subject: string,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Hello <strong>${name}</strong>,<br/><br/>
        Thank you for reaching out to us! We have received your message and our team will review it promptly.
      </p>

      ${this.getDetailsList([
        { label: 'Subject', value: subject },
        { label: 'Expected Response', value: '24-48 hours' },
      ])}

      ${this.getInfoBox('In the meantime, you might find answers to common questions in our <a href="' + this.frontendUrl + '/en/faq" style="color: ' + BRAND.info + ';">Help Center</a>.', 'info')}

      <p style="margin: 25px 0 0 0; font-size: 14px; color: ${BRAND.textSecondary};">
        Best regards,<br/>
        <strong>The HBC Fire Protection Team</strong>
      </p>
    `;

    const html = this.getBaseTemplate({
      title: 'Message Received',
      subtitle: 'We\'ll get back to you soon',
      content,
      footerText: 'Thank you for contacting us!',
    });

    return this.sendEmail({
      to: userEmail,
      subject: `📩 We received your message: ${subject}`,
      html,
    });
  }

  async sendAdminNewTicketNotification(
    adminEmail: string,
    ticketNumber: string,
    subject: string,
    category: string,
    priority: string,
    userName: string,
  ): Promise<boolean> {
    const priorityColors: Record<string, { bg: string; text: string }> = {
      LOW: { bg: '#D1FAE5', text: '#065F46' },
      MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
      HIGH: { bg: '#FED7AA', text: '#9A3412' },
      URGENT: { bg: '#FEE2E2', text: '#991B1B' },
    };
    const pColor = priorityColors[priority] || priorityColors.MEDIUM;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        A new support ticket has been submitted and requires attention.
      </p>

      ${this.getDetailsList([
        { label: 'Ticket Number', value: `#${ticketNumber}` },
        { label: 'Subject', value: subject },
        { label: 'From', value: userName },
        { label: 'Category', value: category },
      ])}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 15px 0;">
        <tr>
          <td>
            <span style="display: inline-block; background: ${pColor.bg}; color: ${pColor.text}; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
              ${priority} PRIORITY
            </span>
          </td>
        </tr>
      </table>

      ${this.getButton('View in Admin Panel', `${this.frontendUrl}/en/admin/support`, BRAND.secondary)}
    `;

    const html = this.getBaseTemplate({
      title: 'New Support Ticket',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'Admin notification - HBC Fire Protection',
    });

    return this.sendEmail({
      to: adminEmail,
      subject: `🎫 [${priority}] New Ticket #${ticketNumber}: ${subject}`,
      html,
    });
  }

  // ============================================
  // TRANSFER & WITHDRAWAL EMAILS
  // ============================================

  async sendTransferConfirmationEmail(
    userEmail: string,
    code: string,
    recipientName: string,
    amount: string,
    fee: string,
    total: string,
    currency: string,
    expiresInMinutes: number,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 10px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        You've initiated a transfer. Please use the confirmation code below to complete the transaction.
      </p>

      ${this.getCodeBox(code, BRAND.primary)}

      ${this.getDetailsList([
        { label: 'Recipient', value: recipientName },
        { label: 'Amount', value: `${amount} ${currency}` },
        { label: 'Fee', value: `${fee} ${currency}` },
        { label: 'Total', value: `${total} ${currency}` },
      ])}

      ${this.getInfoBox(`<strong>Important:</strong> This confirmation code expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't initiate this transfer, please ignore this email and secure your account.`, 'warning')}
    `;

    const html = this.getBaseTemplate({
      title: 'Confirm Your Transfer',
      subtitle: 'Enter the code to complete',
      content,
      footerText: 'Do not share this code with anyone.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: `🔐 Transfer Confirmation Code - HBC Fire Protection`,
      html,
    });
  }

  async sendWithdrawalConfirmationEmail(
    userEmail: string,
    code: string,
    amount: string,
    currency: string,
    walletAddress: string,
    expiresInMinutes: number = 30,
  ): Promise<boolean> {
    const shortAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;

    const content = `
      <p style="margin: 0 0 10px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        You've requested a withdrawal. Please use the confirmation code below to authorize this transaction.
      </p>

      ${this.getCodeBox(code, BRAND.warning)}

      ${this.getDetailsList([
        { label: 'Amount', value: `${amount} ${currency}` },
        { label: 'Destination', value: shortAddress },
      ])}

      ${this.getInfoBox(`<strong>Security Notice:</strong> This code expires in <strong>${expiresInMinutes} minutes</strong>. Never share this code with anyone. HBC staff will never ask for this code.`, 'danger')}
    `;

    const html = this.getBaseTemplate({
      title: 'Confirm Your Withdrawal',
      subtitle: 'Authorization required',
      content,
      footerText: 'If you didn\'t request this withdrawal, please contact support immediately.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: `🔐 Withdrawal Confirmation Code - HBC Fire Protection`,
      html,
    });
  }

  // ============================================
  // NOTIFICATION EMAILS
  // ============================================

  /**
   * Send a notification email (generic for all notification types)
   */
  async sendNotificationEmail(
    userEmail: string,
    notificationType: 'TRANSACTION' | 'SECURITY' | 'LOCKING' | 'SYSTEM' | 'MARKETING',
    title: string,
    message: string,
    actionUrl?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const typeConfig: Record<string, { icon: string; subtitle: string }> = {
      TRANSACTION: { icon: '💰', subtitle: 'Transaction Update' },
      SECURITY: { icon: '🔒', subtitle: 'Security Alert' },
      LOCKING: { icon: '🔐', subtitle: 'Locking Update' },
      SYSTEM: { icon: '📢', subtitle: 'System Notification' },
      MARKETING: { icon: '✨', subtitle: 'Special Offer' },
    };

    const config = typeConfig[notificationType] || typeConfig.SYSTEM;

    // Build details list if data provided
    let detailsHtml = '';
    if (data && Object.keys(data).length > 0) {
      const detailItems: Array<{ label: string; value: string }> = [];
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          detailItems.push({ label, value: String(value) });
        }
      }
      if (detailItems.length > 0) {
        detailsHtml = this.getDetailsList(detailItems);
      }
    }

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.7;">
        ${message}
      </p>
      ${detailsHtml}
      ${actionUrl ? this.getButton('View Details', `${this.frontendUrl}${actionUrl}`, BRAND.primary) : ''}
    `;

    const html = this.getBaseTemplate({
      title,
      subtitle: config.subtitle,
      content,
      footerText: 'You received this email based on your notification preferences.',
    });

    await this.sendEmail({
      to: userEmail,
      subject: `${config.icon} ${title} - HBC Fire Protection`,
      html,
    });
  }

  // ============================================
  // TWO-FACTOR AUTHENTICATION EMAILS
  // ============================================

  async sendTwoFactorEnabledEmail(userEmail: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Two-factor authentication has been <strong>enabled</strong> on your HBC Fire Protection account. Your account is now protected with an additional layer of security.
      </p>

      ${this.getInfoBox(`
        <strong>What this means:</strong><br/>
        • You'll need to enter a code from your authenticator app when logging in<br/>
        • Make sure to keep your recovery codes in a safe place<br/>
        • If you lose access to your authenticator, use a recovery code to log in
      `, 'success')}

      ${this.getButton('Manage Security Settings', `${this.frontendUrl}/en/settings?tab=security`, BRAND.accent)}

      ${this.getInfoBox('<strong>Didn\'t enable 2FA?</strong> If you didn\'t make this change, please contact support immediately.', 'danger')}
    `;

    const html = this.getBaseTemplate({
      title: '2FA Enabled',
      subtitle: 'Your account is now more secure',
      content,
      footerText: 'This is an automated security notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '🔐 Two-Factor Authentication Enabled - HBC Fire Protection',
      html,
    });
  }

  async sendTwoFactorDisabledEmail(userEmail: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Two-factor authentication has been <strong>disabled</strong> on your HBC Fire Protection account.
      </p>

      ${this.getInfoBox('<strong>Security Warning:</strong> Your account is now less protected. We strongly recommend keeping two-factor authentication enabled for maximum security.', 'warning')}

      ${this.getButton('Re-enable 2FA', `${this.frontendUrl}/en/settings?tab=security`, BRAND.primary)}

      ${this.getInfoBox('<strong>Didn\'t disable 2FA?</strong> If you didn\'t make this change, your account may be compromised. Please change your password immediately and contact support.', 'danger')}
    `;

    const html = this.getBaseTemplate({
      title: '2FA Disabled',
      subtitle: 'Your account security has changed',
      content,
      footerText: 'This is an automated security notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '⚠️ Two-Factor Authentication Disabled - HBC Fire Protection',
      html,
    });
  }

  async sendRecoveryCodeUsedEmail(
    userEmail: string,
    remainingCodes: number,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        A recovery code was just used to sign in to your HBC Fire Protection account.
      </p>

      ${this.getDetailsList([
        { label: 'Recovery Codes Remaining', value: `${remainingCodes} of 10` },
        { label: 'Time', value: new Date().toLocaleString() },
      ])}

      ${remainingCodes <= 3 ? this.getInfoBox(`<strong>Low Recovery Codes!</strong> You only have ${remainingCodes} recovery codes left. We recommend generating new codes soon.`, 'danger') : ''}

      ${this.getInfoBox('<strong>Tip:</strong> If you used a recovery code because you lost access to your authenticator app, consider setting up a new authenticator device.', 'info')}

      ${this.getButton('Manage 2FA Settings', `${this.frontendUrl}/en/settings?tab=security`, BRAND.primary)}

      ${this.getInfoBox('<strong>Wasn\'t you?</strong> If you didn\'t sign in using a recovery code, your account may be compromised. Change your password and contact support immediately.', 'danger')}
    `;

    const html = this.getBaseTemplate({
      title: 'Recovery Code Used',
      subtitle: 'A 2FA recovery code was used to sign in',
      content,
      footerText: 'This is an automated security notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '🔑 Recovery Code Used - HBC Fire Protection',
      html,
    });
  }

  async sendTwoFactorLockedEmail(
    userEmail: string,
    lockDurationMinutes: number,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Your account has been temporarily locked due to too many failed two-factor authentication attempts.
      </p>

      ${this.getDetailsList([
        { label: 'Lock Duration', value: `${lockDurationMinutes} minutes` },
        { label: 'Time', value: new Date().toLocaleString() },
      ])}

      ${this.getInfoBox('<strong>What to do:</strong> Wait for the lockout period to end, then try signing in again with the correct 2FA code. If you\'ve lost access to your authenticator app, use one of your recovery codes.', 'warning')}

      ${this.getInfoBox('<strong>Wasn\'t you?</strong> If you didn\'t attempt to sign in, someone may be trying to access your account. After the lockout ends, consider changing your password.', 'danger')}
    `;

    const html = this.getBaseTemplate({
      title: 'Account Temporarily Locked',
      subtitle: 'Too many failed 2FA attempts',
      content,
      footerText: 'This is an automated security notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '🔒 Account Locked - Too Many 2FA Attempts - HBC Fire Protection',
      html,
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private stripHtml(html: string): string {
    return html
      // Convert links to text with URL
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
      // Convert line breaks and paragraphs to newlines
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&copy;/g, '©')
      // Clean up whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
