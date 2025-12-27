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
import { StakingService } from './staking.service';
import {
  StakingPlanDto,
  CreateStakeDto,
  StakeDto,
  StakeQueryDto,
  RewardsDto,
} from './dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('staking')
@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Get available staking plans' })
  @ApiResponse({
    status: 200,
    description: 'List of staking plans',
    type: [StakingPlanDto],
  })
  getPlans() {
    return this.stakingService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('stakes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user stakes' })
  @ApiResponse({ status: 200, description: 'User stakes', type: [StakeDto] })
  async getStakes(
    @CurrentUser('id') userId: string,
    @Query() query: StakeQueryDto,
  ) {
    return this.stakingService.getStakes(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stake')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stake' })
  @ApiResponse({
    status: 201,
    description: 'Stake created successfully',
    type: StakeDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid stake parameters' })
  async createStake(
    @CurrentUser('id') userId: string,
    @Body() createStakeDto: CreateStakeDto,
  ) {
    return this.stakingService.createStake(userId, createStakeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('unstake/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unstake tokens' })
  @ApiResponse({ status: 200, description: 'Unstaked successfully' })
  @ApiResponse({ status: 404, description: 'Stake not found' })
  async unstake(
    @CurrentUser('id') userId: string,
    @Param('id') stakeId: string,
  ) {
    return this.stakingService.unstake(userId, stakeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('rewards')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending rewards' })
  @ApiResponse({
    status: 200,
    description: 'Pending rewards',
    type: RewardsDto,
  })
  async getRewards(@CurrentUser('id') userId: string) {
    return this.stakingService.getRewards(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('claim')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim staking rewards' })
  @ApiResponse({ status: 200, description: 'Rewards claimed successfully' })
  @ApiResponse({ status: 400, description: 'No rewards to claim' })
  async claimRewards(@CurrentUser('id') userId: string) {
    return this.stakingService.claimRewards(userId);
  }
}
