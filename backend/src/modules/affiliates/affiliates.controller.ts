import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AffiliatesService } from './affiliates.service';
import {
  AffiliateProfileDto,
  AffiliateStatsDto,
  CommissionQueryDto,
  WithdrawDto,
} from './dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('affiliates')
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register as an affiliate' })
  @ApiResponse({
    status: 201,
    description: 'Affiliate registered successfully',
    type: AffiliateProfileDto,
  })
  @ApiResponse({ status: 409, description: 'Already an affiliate' })
  async register(@CurrentUser('id') userId: string) {
    return this.affiliatesService.register(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user affiliate status (returns null if not registered)' })
  @ApiResponse({
    status: 200,
    description: 'Affiliate profile or null',
    type: AffiliateProfileDto,
  })
  async getMyAffiliate(@CurrentUser('id') userId: string) {
    return this.affiliatesService.getMyAffiliate(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get affiliate profile' })
  @ApiResponse({
    status: 200,
    description: 'Affiliate profile',
    type: AffiliateProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Affiliate not found' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.affiliatesService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get affiliate statistics' })
  @ApiResponse({
    status: 200,
    description: 'Affiliate statistics',
    type: AffiliateStatsDto,
  })
  async getStats(@CurrentUser('id') userId: string) {
    return this.affiliatesService.getStats(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('referrals')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referred users' })
  @ApiResponse({ status: 200, description: 'List of referred users' })
  async getReferrals(
    @CurrentUser('id') userId: string,
    @Query() query: CommissionQueryDto,
  ) {
    return this.affiliatesService.getReferrals(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('commissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get commission history' })
  @ApiResponse({ status: 200, description: 'Commission history' })
  async getCommissions(
    @CurrentUser('id') userId: string,
    @Query() query: CommissionQueryDto,
  ) {
    return this.affiliatesService.getCommissions(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw affiliate earnings' })
  @ApiResponse({ status: 200, description: 'Withdrawal processed' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  async withdraw(
    @CurrentUser('id') userId: string,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.affiliatesService.withdraw(userId, withdrawDto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Post('claim')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim all pending affiliate commissions' })
  @ApiResponse({ status: 200, description: 'Commissions claimed successfully' })
  @ApiResponse({ status: 400, description: 'No pending commissions' })
  async claimCommissions(@CurrentUser('id') userId: string) {
    return this.affiliatesService.claimCommissions(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sales')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales from referrals' })
  @ApiResponse({ status: 200, description: 'Sales history from referrals' })
  async getSales(
    @CurrentUser('id') userId: string,
    @Query() query: CommissionQueryDto,
  ) {
    return this.affiliatesService.getSales(userId, query);
  }

  @Public()
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get affiliate leaderboard' })
  @ApiResponse({ status: 200, description: 'Top affiliates' })
  async getLeaderboard(@Query('limit') limit = 10) {
    return this.affiliatesService.getLeaderboard(Number(limit));
  }

  @Public()
  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate a referral code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCode(@Param('code') code: string) {
    return this.affiliatesService.validateReferralCode(code);
  }
}
