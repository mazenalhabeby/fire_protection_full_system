import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

// Logo URL - hosted on GitHub for better email client compatibility
const LOGO_URL = 'https://raw.githubusercontent.com/mazenalhabeby/fire_protection_full_system/0f6e332a49962e66e6a0e19981ccd04ecd7535f1/shared/assets/images/logo-white.svg';

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
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl && process.env.NODE_ENV === 'production') {
      throw new Error('FRONTEND_URL environment variable is required in production');
    }
    this.frontendUrl = frontendUrl || 'http://localhost:3000';

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
                    <img src="${LOGO_URL}" alt="HBC Fire Protection" width="60" style="display: block; margin: 0 auto 12px auto;">
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
      const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@fire-protection.tech>`;

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

  async sendTicketUserReplyNotification(
    staffEmail: string,
    ticketNumber: string,
    subject: string,
    replyContent: string,
    userName: string,
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        A user has replied to a support ticket that requires your attention.
      </p>

      ${this.getDetailsList([
        { label: 'Ticket Number', value: `#${ticketNumber}` },
        { label: 'Subject', value: subject },
        { label: 'From', value: userName },
      ])}

      <div style="background: ${BRAND.background}; border-left: 4px solid ${BRAND.info}; border-radius: 0 10px 10px 0; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">User's Reply</p>
        <div style="font-size: 15px; color: ${BRAND.textPrimary}; line-height: 1.7;">
          ${replyContent}
        </div>
      </div>

      ${this.getButton('View Ticket', `${this.frontendUrl}/en/admin/support`, BRAND.secondary)}
    `;

    const html = this.getBaseTemplate({
      title: 'New Reply on Support Ticket',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'Support Staff Notification - HBC Fire Protection',
    });

    return this.sendEmail({
      to: staffEmail,
      subject: `💬 [Ticket #${ticketNumber}] ${userName} replied: ${subject}`,
      html,
    });
  }

  async sendGuestTicketCreatedEmail(
    email: string,
    name: string,
    ticketNumber: string,
    subject: string,
    accessToken: string,
  ): Promise<boolean> {
    const ticketUrl = `${this.frontendUrl}/en/help/ticket?token=${accessToken}`;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Hello <strong>${name}</strong>,<br/><br/>
        Thank you for contacting HBC Fire Protection Support. Your ticket has been created and our team will respond as soon as possible.
      </p>

      ${this.getDetailsList([
        { label: 'Ticket Number', value: `#${ticketNumber}` },
        { label: 'Subject', value: subject },
      ])}

      ${this.getInfoBox('Save this email! You will need the link below to access your ticket and view responses.', 'warning')}

      ${this.getButton('View Your Ticket', ticketUrl, BRAND.accent)}

      <p style="margin: 25px 0 0 0; font-size: 14px; color: ${BRAND.textSecondary};">
        You can also use your ticket number <strong>#${ticketNumber}</strong> and email address to retrieve your ticket at any time.
      </p>
    `;

    const html = this.getBaseTemplate({
      title: 'Support Ticket Created',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'Thank you for contacting HBC Fire Protection!',
    });

    return this.sendEmail({
      to: email,
      subject: `🎫 [Ticket #${ticketNumber}] ${subject} - Ticket Created`,
      html,
    });
  }

  async sendGuestTicketAccessEmail(
    email: string,
    ticketNumber: string,
    accessToken: string,
  ): Promise<boolean> {
    const ticketUrl = `${this.frontendUrl}/en/help/ticket?token=${accessToken}`;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        You requested access to your support ticket. Click the button below to view your ticket and any responses.
      </p>

      ${this.getDetailsList([
        { label: 'Ticket Number', value: `#${ticketNumber}` },
      ])}

      ${this.getButton('Access Your Ticket', ticketUrl, BRAND.accent)}

      <p style="margin: 25px 0 0 0; font-size: 14px; color: ${BRAND.textSecondary};">
        If you did not request this, please ignore this email.
      </p>
    `;

    const html = this.getBaseTemplate({
      title: 'Ticket Access Link',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'HBC Fire Protection Support',
    });

    return this.sendEmail({
      to: email,
      subject: `🔗 [Ticket #${ticketNumber}] Access Link`,
      html,
    });
  }

  async sendGuestTicketReplyEmail(
    email: string,
    name: string,
    ticketNumber: string,
    subject: string,
    replyContent: string,
    accessToken: string,
  ): Promise<boolean> {
    const ticketUrl = `${this.frontendUrl}/en/help/ticket?token=${accessToken}`;

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Hello <strong>${name}</strong>,<br/><br/>
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

      ${this.getButton('View Full Conversation', ticketUrl, BRAND.accent)}
    `;

    const html = this.getBaseTemplate({
      title: 'New Reply on Your Ticket',
      subtitle: `Ticket #${ticketNumber}`,
      content,
      footerText: 'HBC Fire Protection Support',
    });

    return this.sendEmail({
      to: email,
      subject: `💬 [Ticket #${ticketNumber}] New Reply: ${subject}`,
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
  // ACCOUNT STATUS EMAILS
  // ============================================

  async sendAccountSuspendedEmail(
    userEmail: string,
    reason?: string,
  ): Promise<boolean> {
    const reasonText = reason
      ? `
        <div style="margin: 20px 0; padding: 16px; background-color: #FEF2F2; border-radius: 8px; border-left: 4px solid ${BRAND.danger};">
          <p style="margin: 0; font-size: 14px; color: ${BRAND.danger}; font-weight: 600;">Reason for suspension:</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND.textPrimary};">${reason}</p>
        </div>
      `
      : '';

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        We regret to inform you that your <strong>HBC Fire Protection</strong> account has been suspended.
      </p>
      ${reasonText}
      <p style="margin: 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        During this suspension, you will not be able to:
      </p>
      <ul style="margin: 0 0 20px 0; padding-left: 24px; color: ${BRAND.textPrimary};">
        <li style="margin-bottom: 8px;">Log in to your account</li>
        <li style="margin-bottom: 8px;">Access platform features</li>
        <li style="margin-bottom: 8px;">Make transactions</li>
      </ul>
      <p style="margin: 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        If you believe this suspension was made in error or would like to appeal this decision, please contact our support team.
      </p>
      ${this.getButton('Contact Support', `${this.frontendUrl}/help/contact`, BRAND.primary)}
      ${this.getInfoBox('Your account data remains secure. Once the suspension is lifted, you will regain full access to your account.', 'info')}
    `;

    const html = this.getBaseTemplate({
      title: 'Account Suspended',
      subtitle: 'Your account access has been restricted',
      content,
      footerText: 'This is an automated security notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '⚠️ Account Suspended - HBC Fire Protection',
      html,
    });
  }

  async sendAccountReinstatedEmail(userEmail: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Great news! Your <strong>HBC Fire Protection</strong> account has been reinstated and is now fully active.
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        You can now log in and access all platform features as usual.
      </p>
      ${this.getButton('Log In Now', `${this.frontendUrl}/login`, BRAND.success)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND.textSecondary}; line-height: 1.7;">
        Thank you for your patience. If you have any questions, please don't hesitate to contact our support team.
      </p>
    `;

    const html = this.getBaseTemplate({
      title: 'Account Reinstated',
      subtitle: 'Welcome back to HBC Fire Protection',
      content,
      footerText: 'This is an automated notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '✅ Account Reinstated - HBC Fire Protection',
      html,
    });
  }

  // ============================================
  // ACCOUNT DELETION EMAILS
  // ============================================

  async sendAccountDeletedEmail(
    userEmail: string,
    gracePeriodEndsAt: Date,
  ): Promise<boolean> {
    const formattedDate = gracePeriodEndsAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Your <strong>HBC Fire Protection</strong> account has been scheduled for deletion.
      </p>
      <div style="margin: 20px 0; padding: 16px; background-color: #FEF2F2; border-radius: 8px; border-left: 4px solid ${BRAND.warning};">
        <p style="margin: 0; font-size: 14px; color: ${BRAND.warning}; font-weight: 600;">Important Notice:</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND.textPrimary};">
          You have until <strong>${formattedDate}</strong> to recover your account. After this date, account recovery will no longer be possible.
        </p>
      </div>
      <p style="margin: 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        During the deletion period:
      </p>
      <ul style="margin: 0 0 20px 0; padding-left: 24px; color: ${BRAND.textPrimary};">
        <li style="margin-bottom: 8px;">Your account cannot be accessed</li>
        <li style="margin-bottom: 8px;">Your data is preserved but inactive</li>
        <li style="margin-bottom: 8px;">You can request account recovery within 30 days</li>
      </ul>
      <p style="margin: 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        If you did not request this deletion or wish to recover your account, please contact our support team immediately.
      </p>
      ${this.getButton('Contact Support', `${this.frontendUrl}/help/contact`, BRAND.primary)}
      ${this.getInfoBox('Your account data will be retained for 1 year for compliance purposes before permanent deletion.', 'info')}
    `;

    const html = this.getBaseTemplate({
      title: 'Account Deletion Scheduled',
      subtitle: 'Your account has been deactivated',
      content,
      footerText: 'This is an automated notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '⚠️ Account Deletion Scheduled - HBC Fire Protection',
      html,
    });
  }

  async sendAccountRecoveredEmail(userEmail: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Great news! Your <strong>HBC Fire Protection</strong> account has been successfully recovered and is now fully active.
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        All your data has been restored and you can now log in and access all platform features as usual.
      </p>
      ${this.getButton('Log In Now', `${this.frontendUrl}/login`, BRAND.success)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND.textSecondary}; line-height: 1.7;">
        If you did not request this recovery or have any concerns, please contact our support team immediately.
      </p>
    `;

    const html = this.getBaseTemplate({
      title: 'Account Recovered',
      subtitle: 'Welcome back to HBC Fire Protection',
      content,
      footerText: 'This is an automated notification.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: '✅ Account Recovered - HBC Fire Protection',
      html,
    });
  }

  // ============================================
  // AFFILIATE STATUS EMAILS
  // ============================================

  async sendAffiliateDeactivatedEmail(
    userEmail: string,
    reason?: string,
  ): Promise<boolean> {
    const reasonText = reason
      ? `
        <div style="margin: 20px 0; padding: 16px; background-color: #FEF2F2; border-radius: 8px; border-left: 4px solid ${BRAND.danger};">
          <p style="margin: 0; font-size: 14px; color: ${BRAND.danger}; font-weight: 600;">Reason:</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND.textPrimary};">${reason}</p>
        </div>
      `
      : '';

    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        We're writing to inform you that your <strong>Affiliate Program</strong> account has been temporarily deactivated.
      </p>
      ${reasonText}
      <p style="margin: 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        While your affiliate account is deactivated:
      </p>
      <ul style="margin: 0 0 20px 0; padding-left: 24px; color: ${BRAND.textPrimary};">
        <li style="margin-bottom: 8px;">Your referral code will not be valid for new registrations</li>
        <li style="margin-bottom: 8px;">You will not earn commissions from referred users' purchases</li>
        <li style="margin-bottom: 8px;">You will not appear on the affiliate leaderboard</li>
      </ul>
      ${this.getInfoBox('Your existing referral relationships and earned commissions remain intact. Once reactivated, you will regain full affiliate privileges.', 'info')}
      <p style="margin: 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        If you have questions about this decision or would like to discuss reactivation, please contact our support team.
      </p>
      ${this.getButton('Contact Support', `${this.frontendUrl}/help/contact`, BRAND.primary)}
    `;

    const html = this.getBaseTemplate({
      title: 'Affiliate Account Deactivated',
      subtitle: 'Your affiliate privileges have been temporarily suspended',
      content,
      footerText: 'This is an automated notification from the Affiliate Program.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: 'Affiliate Account Deactivated - HBC Fire Protection',
      html,
    });
  }

  async sendAffiliateReactivatedEmail(userEmail: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        Great news! Your <strong>Affiliate Program</strong> account has been reactivated and is now fully active.
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND.textPrimary}; line-height: 1.7;">
        You can now enjoy all affiliate benefits:
      </p>
      <ul style="margin: 0 0 20px 0; padding-left: 24px; color: ${BRAND.textPrimary};">
        <li style="margin-bottom: 8px;">Your referral code is active again</li>
        <li style="margin-bottom: 8px;">You'll earn commissions from referred users' purchases</li>
        <li style="margin-bottom: 8px;">You're visible on the affiliate leaderboard</li>
      </ul>
      ${this.getButton('View Affiliate Dashboard', `${this.frontendUrl}/affiliates`, BRAND.success)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND.textSecondary}; line-height: 1.7;">
        Thank you for being part of our affiliate program. If you have any questions, please don't hesitate to contact our support team.
      </p>
    `;

    const html = this.getBaseTemplate({
      title: 'Affiliate Account Reactivated',
      subtitle: 'Welcome back to the Affiliate Program',
      content,
      footerText: 'This is an automated notification from the Affiliate Program.',
    });

    return this.sendEmail({
      to: userEmail,
      subject: 'Affiliate Account Reactivated - HBC Fire Protection',
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
