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
    @Request() req: { user: { userId: string } },
    @Body() createLockDto: CreateLockDto,
  ): Promise<CreateLockResponseDto> {
    return this.lockingService.createLock(req.user.userId, createLockDto);
  }

  @Get('locks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user locks' })
  async getUserLocks(
    @Request() req: { user: { userId: string } },
    @Query() query: LockQueryDto,
  ) {
    return this.lockingService.getUserLocks(req.user.userId, query);
  }

  @Get('locks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lock details' })
  async getLockById(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.lockingService.getLockById(req.user.userId, id);
  }

  @Post('unlock/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock tokens (after lock period)' })
  @ApiResponse({ status: 200, type: UnlockResponseDto })
  async unlock(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ): Promise<UnlockResponseDto> {
    return this.lockingService.unlock(req.user.userId, id);
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rewards summary' })
  @ApiResponse({ status: 200, type: LockRewardsSummaryDto })
  async getRewardsSummary(
    @Request() req: { user: { userId: string } },
  ): Promise<LockRewardsSummaryDto> {
    return this.lockingService.getRewardsSummary(req.user.userId);
  }
}
