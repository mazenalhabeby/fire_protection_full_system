import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Public } from '../../common/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LockingService } from './locking.service';
import {
  CreateLockDto,
  LockTierDto,
  CreateLockResponseDto,
  UnlockResponseDto,
  LockRewardsSummaryDto,
  LockQueryDto,
  EarlyUnlockResponseDto,
  CancelLockResponseDto,
  LockHistoryResponseDto,
  LockDetailsDto,
} from './dto';

@ApiTags('Token Locking')
@Controller('locking')
export class LockingController {
  constructor(private readonly lockingService: LockingService) {}

  @Public()
  @Get('tiers')
  @ApiOperation({ summary: 'Get available lock tiers' })
  @ApiResponse({ status: 200, type: [LockTierDto] })
  async getTiers(): Promise<LockTierDto[]> {
    return this.lockingService.getLockTiers();
  }

  @Post('lock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lock tokens' })
  @ApiResponse({ status: 201, type: CreateLockResponseDto })
  async createLock(
    @Request() req: { user: { id: string } },
    @Body() createLockDto: CreateLockDto,
  ): Promise<CreateLockResponseDto> {
    return this.lockingService.createLock(req.user.id, createLockDto);
  }

  @Get('locks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user locks' })
  async getUserLocks(
    @Request() req: { user: { id: string } },
    @Query() query: LockQueryDto,
  ) {
    return this.lockingService.getUserLocks(req.user.id, query);
  }

  @Get('locks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lock details' })
  async getLockById(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.lockingService.getLockById(req.user.id, id);
  }

  @Post('unlock/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock tokens (after lock period)' })
  @ApiResponse({ status: 200, type: UnlockResponseDto })
  async unlock(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<UnlockResponseDto> {
    return this.lockingService.unlock(req.user.id, id);
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rewards summary' })
  @ApiResponse({ status: 200, type: LockRewardsSummaryDto })
  async getRewardsSummary(
    @Request() req: { user: { id: string } },
  ): Promise<LockRewardsSummaryDto> {
    return this.lockingService.getRewardsSummary(req.user.id);
  }

  @Get('locks/:id/details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed lock information with early unlock estimates' })
  @ApiResponse({ status: 200, type: LockDetailsDto })
  async getLockDetails(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<LockDetailsDto> {
    return this.lockingService.getLockDetails(req.user.id, id);
  }

  @Post('early-unlock/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Early unlock tokens with penalty',
    description: 'Unlock tokens before the lock period ends. A penalty (percentage of rewards) is applied based on how much of the lock period has been completed.',
  })
  @ApiResponse({ status: 200, type: EarlyUnlockResponseDto })
  @ApiResponse({ status: 400, description: 'Lock period is complete - use regular unlock' })
  async earlyUnlock(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<EarlyUnlockResponseDto> {
    return this.lockingService.earlyUnlock(req.user.id, id);
  }

  @Post('cancel/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel a lock within grace period',
    description: 'Cancel a lock within 24 hours of creation without any penalty. Full principal is returned.',
  })
  @ApiResponse({ status: 200, type: CancelLockResponseDto })
  @ApiResponse({ status: 400, description: 'Grace period expired - use early unlock instead' })
  async cancelLock(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<CancelLockResponseDto> {
    return this.lockingService.cancelLock(req.user.id, id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lock operation history' })
  @ApiResponse({ status: 200, type: LockHistoryResponseDto })
  async getLockHistory(
    @Request() req: { user: { id: string } },
    @Query() query: LockQueryDto,
  ): Promise<LockHistoryResponseDto> {
    return this.lockingService.getLockHistory(req.user.id, query);
  }
}
