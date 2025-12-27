import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RewardPoolsService } from './reward-pools.service';
import { RewardPoolDto, UpdatePoolDto, PoolStatsDto } from './dto';

@ApiTags('Reward Pools')
@Controller('pools')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class RewardPoolsController {
  constructor(private readonly rewardPoolsService: RewardPoolsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reward pools (Admin)' })
  @ApiResponse({ status: 200, type: [RewardPoolDto] })
  async getAllPools(): Promise<RewardPoolDto[]> {
    return this.rewardPoolsService.getAllPools();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get pool usage statistics (Admin)' })
  @ApiResponse({ status: 200, type: PoolStatsDto })
  async getPoolStats(): Promise<PoolStatsDto> {
    return this.rewardPoolsService.getPoolStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reward pool by ID (Admin)' })
  @ApiResponse({ status: 200, type: RewardPoolDto })
  async getPoolById(@Param('id') id: string): Promise<RewardPoolDto> {
    return this.rewardPoolsService.getPoolById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reward pool (Admin)' })
  @ApiResponse({ status: 200, type: RewardPoolDto })
  async updatePool(
    @Param('id') id: string,
    @Body() updateDto: UpdatePoolDto,
  ): Promise<RewardPoolDto> {
    return this.rewardPoolsService.updatePool(id, updateDto);
  }
}
