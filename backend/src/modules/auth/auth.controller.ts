import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
  Delete,
  Param,
  Patch,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import * as express from 'express';
import { AuthService } from './auth.service';
import { OAuthService, OAuthProfile } from './oauth.service';
import { WalletManagementService } from './wallet-management.service';
import { SessionService } from './session.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SetPasswordDto,
  VerifyEmailDto,
  VerifyEmailCodeDto,
  AdminVerifyDto,
  AdminVerifyResponseDto,
  AdminStatusResponseDto,
} from './dto';
import {
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
  RegenerateRecoveryCodesDto,
  TwoFactorLoginDto,
} from './dto/two-factor.dto';
import { TwoFactorService } from './two-factor.service';
import { GetNonceDto, WalletLoginDto, WalletRegisterDto, WalletLinkDto } from './dto/wallet-auth.dto';
import {
  GenerateLinkingNonceDto,
  LinkWalletDto,
  UpdateWalletLabelDto,
  CheckWalletSwitchDto,
} from './dto/wallet-management.dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard, JwtRefreshGuard, GoogleAuthGuard, FacebookAuthGuard } from './guards';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../../config/cookie.config';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly isProduction: boolean;
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly walletManagementService: WalletManagementService,
    private readonly twoFactorService: TwoFactorService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
  }

  // ============================================
  // HELPER: Set auth cookies
  // ============================================

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieOptions(this.isProduction));
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshTokenCookieOptions(this.isProduction));
  }

  private setAccessTokenCookie(res: express.Response, accessToken: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieOptions(this.isProduction));
  }

  private clearAuthCookies(res: express.Response): void {
    res.cookie(ACCESS_TOKEN_COOKIE, '', getClearCookieOptions(this.isProduction));
    res.cookie(REFRESH_TOKEN_COOKIE, '', getClearCookieOptions(this.isProduction));
  }

  // ============================================
  // REGISTRATION & LOGIN
  // ============================================

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.register(registerDto, req);

    // Set cookies
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    this.logger.log(`User registered: ${result.user.id}`);

    // Return user data only (tokens are in cookies)
    return {
      user: result.user,
      tokenExpiresAt: result.tokenExpiresAt,
      message: 'Registration successful. Please verify your email.',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute - prevent brute force
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.login(loginDto, req);

    // Check if 2FA is required
    if ('requiresTwoFactor' in result) {
      return {
        requiresTwoFactor: true,
        twoFactorToken: result.twoFactorToken,
      };
    }

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    this.logger.log(`User logged in: ${result.user.id}`);

    return {
      user: result.user,
      tokenExpiresAt: result.tokenExpiresAt,
      securityAlert: result.securityAlert,
    };
  }

  @Public() // Skip global JwtAuthGuard - this endpoint uses JwtRefreshGuard instead
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @CurrentUser() user: any,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.refreshTokens(
      user.id,
      user.sessionId,
      user.refreshToken,
      req,
    );

    // Only set new access token cookie (refresh token stays the same)
    this.setAccessTokenCookie(res, result.accessToken);

    // Return tokenExpiresAt for frontend
    return {
      success: true,
      tokenExpiresAt: result.tokenExpiresAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.logout(user.sessionId, user.id);
    this.clearAuthCookies(res);
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions except current' })
  @ApiResponse({ status: 200, description: 'All other sessions logged out' })
  async logoutAll(@CurrentUser() user: any) {
    const count = await this.authService.logoutAllSessions(user.id, user.sessionId);
    return { success: true, revokedSessions: count };
  }

  // ============================================
  // GET CURRENT USER
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @SkipThrottle()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user with session and pending actions' })
  @ApiResponse({ status: 200, description: 'Returns user data, current session, and pending actions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: any) {
    return this.authService.getMe(user.id, user.sessionId);
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of active sessions' })
  async getSessions(@CurrentUser() user: any) {
    const sessions = await this.authService.getSessions(user.id, user.sessionId);
    return { sessions };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    await this.authService.revokeSession(user.id, sessionId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/trust')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a session/device as trusted' })
  @ApiResponse({ status: 200, description: 'Device marked as trusted' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async trustDevice(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { deviceName?: string },
  ) {
    await this.sessionService.trustDevice(sessionId, user.id, body.deviceName);
    return { success: true, message: 'Device marked as trusted' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId/trust')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove trusted status from a session/device' })
  @ApiResponse({ status: 200, description: 'Device trust removed' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async untrustDevice(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.untrustDevice(sessionId, user.id);
    return { success: true, message: 'Device trust removed' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/activities')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent session activities for security audit' })
  @ApiResponse({ status: 200, description: 'Returns recent session activities' })
  async getSessionActivities(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.sessionService.getUserRecentActivity(
      user.id,
      limit ? parseInt(limit, 10) : 50,
    );
    return { activities };
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token (link-based)' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email-code')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Verify email with 6-digit code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmailCode(
    @CurrentUser() user: any,
    @Body() verifyEmailCodeDto: VerifyEmailCodeDto,
  ) {
    return this.authService.verifyEmailCode(user.id, verifyEmailCodeDto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified or rate limited' })
  async resendVerification(@CurrentUser() user: any) {
    await this.authService.resendVerificationEmail(user.id);
    return { success: true, message: 'Verification email sent' };
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'If email exists, reset link sent' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: express.Request,
  ) {
    await this.authService.forgotPassword(forgotPasswordDto.email, req);
    // Always return success to prevent email enumeration
    return { success: true, message: 'If the email exists, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      user.sessionId,
    );
    return { success: true, message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password for users without one (OAuth/Wallet users)' })
  @ApiResponse({ status: 200, description: 'Password set successfully' })
  @ApiResponse({ status: 400, description: 'Password already set or passwords do not match' })
  async setPassword(
    @CurrentUser() user: any,
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    if (setPasswordDto.password !== setPasswordDto.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    await this.authService.setPassword(user.id, setPasswordDto.password);
    return { success: true, message: 'Password set successfully' };
  }

  // ============================================
  // WALLET AUTHENTICATION
  // ============================================

  @Public()
  @Post('wallet/nonce')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Get nonce for wallet signature' })
  @ApiResponse({ status: 200, description: 'Nonce generated successfully' })
  async getWalletNonce(@Body() getNonceDto: GetNonceDto) {
    return this.authService.getWalletNonce(getNonceDto.walletAddress);
  }

  @Public()
  @Post('wallet/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 per minute
  @ApiOperation({ summary: 'Login with wallet signature' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature or wallet not registered' })
  async walletLogin(
    @Body() walletLoginDto: WalletLoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.walletLogin(walletLoginDto, req);

    // Check if 2FA is required
    if ('requiresTwoFactor' in result) {
      return {
        requiresTwoFactor: true,
        twoFactorToken: result.twoFactorToken,
      };
    }

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { user: result.user, tokenExpiresAt: result.tokenExpiresAt, securityAlert: result.securityAlert };
  }

  @Public()
  @Post('wallet/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @ApiOperation({ summary: 'Register with wallet signature' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Wallet already registered' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async walletRegister(
    @Body() walletRegisterDto: WalletRegisterDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.walletRegister(walletRegisterDto, req);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { user: result.user, tokenExpiresAt: result.tokenExpiresAt };
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet/link')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link wallet to existing account' })
  @ApiResponse({ status: 200, description: 'Wallet linked successfully' })
  @ApiResponse({ status: 409, description: 'Wallet already linked to another account' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async linkWallet(@CurrentUser() user: any, @Body() walletLinkDto: WalletLinkDto) {
    return this.authService.linkWallet(
      user.id,
      walletLinkDto.walletAddress,
      walletLinkDto.signature,
      walletLinkDto.message,
    );
  }

  @Public()
  @Get('wallet/check/:address')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 per minute
  @ApiOperation({ summary: 'Check if a wallet address is available (not linked to any account)' })
  @ApiResponse({ status: 200, description: 'Returns wallet availability status' })
  @ApiResponse({ status: 400, description: 'Invalid wallet address format' })
  async checkWalletAvailability(@Param('address') address: string) {
    return this.walletManagementService.checkWalletAvailability(address);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wallet/check-authenticated/:address')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check wallet availability for authenticated user (includes ownership check)' })
  @ApiResponse({ status: 200, description: 'Returns wallet availability with ownership info' })
  async checkWalletAvailabilityAuthenticated(
    @CurrentUser() user: any,
    @Param('address') address: string,
  ) {
    return this.walletManagementService.checkWalletAvailability(address, user.id);
  }

  // ============================================
  // OAUTH AUTHENTICATION
  // ============================================

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  async googleAuth() {
    // Guard handles the redirect to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with auth result' })
  async googleCallback(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      const profile = req.user as OAuthProfile;

      if (!profile) {
        this.logger.warn('Google OAuth: No profile returned');
        return res.redirect(`${this.frontendUrl}/login?error=oauth_failed`);
      }

      const result = await this.oauthService.handleOAuthLogin(profile, req);

      // Set auth cookies
      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      // Redirect to frontend
      const redirectUrl = result.isNewUser
        ? `${this.frontendUrl}/dashboard?welcome=true`
        : `${this.frontendUrl}/dashboard`;

      this.logger.log(`Google OAuth success: ${result.user.id}`);
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`Google OAuth error: ${error}`);
      return res.redirect(`${this.frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Public()
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Facebook OAuth' })
  async facebookAuth() {
    // Guard handles the redirect to Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with auth result' })
  async facebookCallback(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      const profile = req.user as OAuthProfile;

      if (!profile) {
        this.logger.warn('Facebook OAuth: No profile returned');
        return res.redirect(`${this.frontendUrl}/login?error=oauth_failed`);
      }

      const result = await this.oauthService.handleOAuthLogin(profile, req);

      // Set auth cookies
      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      // Redirect to frontend
      const redirectUrl = result.isNewUser
        ? `${this.frontendUrl}/dashboard?welcome=true`
        : `${this.frontendUrl}/dashboard`;

      this.logger.log(`Facebook OAuth success: ${result.user.id}`);
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`Facebook OAuth error: ${error}`);
      return res.redirect(`${this.frontendUrl}/login?error=oauth_failed`);
    }
  }

  // ============================================
  // MULTI-WALLET MANAGEMENT
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('wallets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all wallets linked to current user' })
  @ApiResponse({ status: 200, description: 'Returns list of linked wallets' })
  async getWallets(@CurrentUser() user: any) {
    const wallets = await this.walletManagementService.getUserWallets(user.id);
    const remainingSlots = await this.walletManagementService.getRemainingSlots(user.id);
    return { wallets, remainingSlots, maxWallets: 3 };
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallets/nonce')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate nonce for linking a new wallet' })
  @ApiResponse({ status: 200, description: 'Nonce generated for wallet linking' })
  @ApiResponse({ status: 400, description: 'Invalid wallet address' })
  @ApiResponse({ status: 403, description: 'Wallet limit reached' })
  @ApiResponse({ status: 409, description: 'Wallet already linked' })
  async generateLinkingNonce(
    @CurrentUser() user: any,
    @Body() dto: GenerateLinkingNonceDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.walletManagementService.generateLinkingNonce(
      user.id,
      dto.walletAddress,
      ipAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallets/link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 per 5 minutes
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a new wallet after signature verification' })
  @ApiResponse({ status: 200, description: 'Wallet linked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or expired nonce' })
  @ApiResponse({ status: 403, description: 'Wallet limit reached' })
  @ApiResponse({ status: 409, description: 'Wallet already linked' })
  async linkNewWallet(
    @CurrentUser() user: any,
    @Body() dto: LinkWalletDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    const wallet = await this.walletManagementService.linkWallet(
      user.id,
      dto,
      ipAddress,
      userAgent,
    );
    return { wallet, message: 'Wallet linked successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('wallets/:walletId/primary')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a wallet as primary' })
  @ApiResponse({ status: 200, description: 'Wallet set as primary' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async setPrimaryWallet(
    @CurrentUser() user: any,
    @Param('walletId') walletId: string,
  ) {
    const wallet = await this.walletManagementService.setPrimaryWallet(user.id, walletId);
    return { wallet, message: 'Primary wallet updated' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('wallets/:walletId/label')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update wallet label' })
  @ApiResponse({ status: 200, description: 'Label updated successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async updateWalletLabel(
    @CurrentUser() user: any,
    @Param('walletId') walletId: string,
    @Body() dto: UpdateWalletLabelDto,
  ) {
    const wallet = await this.walletManagementService.updateWalletLabel(
      user.id,
      walletId,
      dto.label,
    );
    return { wallet };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('wallets/:walletId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a linked wallet' })
  @ApiResponse({ status: 200, description: 'Wallet removed successfully' })
  @ApiResponse({ status: 403, description: 'Cannot remove last auth method' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async removeWallet(
    @CurrentUser() user: any,
    @Param('walletId') walletId: string,
  ) {
    return this.walletManagementService.removeWallet(user.id, walletId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallets/check-switch')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can switch to a connected wallet' })
  @ApiResponse({ status: 200, description: 'Returns switch eligibility' })
  async checkWalletSwitch(
    @CurrentUser() user: any,
    @Body() dto: CheckWalletSwitchDto,
  ) {
    return this.walletManagementService.canSwitchToWallet(user.id, dto.walletAddress);
  }

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  @ApiResponse({ status: 200, description: 'Returns 2FA status' })
  async getTwoFactorStatus(@CurrentUser() user: any) {
    return this.twoFactorService.getStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate 2FA setup, returns QR code and secret' })
  @ApiResponse({ status: 200, description: 'Returns QR code data URL and manual secret' })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  async initiateTwoFactorSetup(@CurrentUser() user: any) {
    return this.twoFactorService.initiateSetup(user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify-setup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP code and enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA enabled, returns recovery codes' })
  @ApiResponse({ status: 400, description: '2FA not set up or already enabled' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async verifyTwoFactorSetup(
    @CurrentUser() user: any,
    @Body() dto: VerifyTwoFactorDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.twoFactorService.verifyAndEnable(
      user.id,
      dto.token,
      ipAddress,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (requires current TOTP code)' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async disableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: DisableTwoFactorDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.twoFactorService.disable(
      user.id,
      dto.token,
      ipAddress,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/recovery-codes')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate recovery codes (requires TOTP code)' })
  @ApiResponse({ status: 200, description: 'Returns new recovery codes' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async regenerateRecoveryCodes(
    @CurrentUser() user: any,
    @Body() dto: RegenerateRecoveryCodesDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    const codes = await this.twoFactorService.regenerateRecoveryCodes(
      user.id,
      dto.token,
      ipAddress,
      userAgent,
    );
    return { recoveryCodes: codes };
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute - strict for 6-digit OTP
  @ApiOperation({ summary: 'Complete login with 2FA verification' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code or challenge token' })
  async verifyTwoFactorLogin(
    @Body() dto: TwoFactorLoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.verifyTwoFactorLogin(
      dto.twoFactorToken,
      dto.code,
      req,
      dto.location,
    );

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { user: result.user, tokenExpiresAt: result.tokenExpiresAt, securityAlert: result.securityAlert };
  }

  // ============================================
  // USER PERMISSIONS (for RBAC)
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('my-permissions')
  @SkipThrottle()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s role and permissions' })
  @ApiResponse({ status: 200, description: 'Returns user role and permissions' })
  async getMyPermissions(@CurrentUser() user: any) {
    return this.authService.getUserPermissions(user.id);
  }

  // ============================================
  // ADMIN STEP-UP AUTHENTICATION
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('admin/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin access status' })
  @ApiResponse({ status: 200, description: 'Admin status', type: AdminStatusResponseDto })
  async getAdminStatus(
    @CurrentUser() user: any,
    @Req() req: express.Request,
  ): Promise<AdminStatusResponseDto> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    return this.authService.getAdminStatus(user.id, user.sessionId, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify admin access with 2FA code (step-up authentication)' })
  @ApiResponse({ status: 200, description: 'Admin access verified', type: AdminVerifyResponseDto })
  @ApiResponse({ status: 400, description: '2FA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid verification code or not admin' })
  async verifyAdminAccess(
    @CurrentUser() user: any,
    @Body() dto: AdminVerifyDto,
    @Req() req: express.Request,
  ): Promise<AdminVerifyResponseDto> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    return this.authService.verifyAdminAccess(
      user.id,
      user.sessionId,
      dto.code,
      ipAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke admin verification (logout from admin panel)' })
  @ApiResponse({ status: 200, description: 'Admin verification revoked' })
  async revokeAdminAccess(
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    await this.authService.revokeAdminVerification(user.sessionId);
    return { success: true };
  }

  // ============================================
  // ACCOUNT DELETION (SELF-SERVICE)
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('account/deletion-eligibility')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if account can be deleted (pre-deletion validation)' })
  @ApiResponse({ status: 200, description: 'Returns deletion eligibility status' })
  async checkDeletionEligibility(@CurrentUser() user: any) {
    return this.authService.checkDeletionEligibility(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour - prevent abuse
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own account (soft delete with 30-day grace period)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete - has balance, locks, or pending withdrawals' })
  async deleteMyAccount(
    @CurrentUser() user: any,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.deleteMyAccount(user.id, {
      ipAddress,
      userAgent,
    });

    // Clear auth cookies after deletion
    this.clearAuthCookies(res);

    return result;
  }
}
