import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AirdropsService } from './airdrops.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  ParticipateDto,
  CompleteTaskDto,
  CampaignResponseDto,
  EntryResponseDto,
} from './dto';

@ApiTags('Airdrops')
@Controller('airdrops')
export class AirdropsController {
  constructor(private readonly airdropsService: AirdropsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active airdrop campaigns' })
  @ApiResponse({ status: 200, type: [CampaignResponseDto] })
  async getActiveCampaigns(): Promise<CampaignResponseDto[]> {
    return this.airdropsService.getActiveCampaigns();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all airdrop campaigns (Admin)' })
  @ApiResponse({ status: 200, type: [CampaignResponseDto] })
  async getAllCampaigns(): Promise<CampaignResponseDto[]> {
    return this.airdropsService.getAllCampaigns();
  }

  @Get('my-entries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user airdrop participations' })
  @ApiResponse({ status: 200, type: [EntryResponseDto] })
  async getUserEntries(
    @Request() req: { user: { userId: string } },
  ): Promise<EntryResponseDto[]> {
    return this.airdropsService.getUserEntries(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async getCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.airdropsService.getCampaignById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create airdrop campaign (Admin)' })
  async createCampaign(@Body() createDto: CreateCampaignDto) {
    return this.airdropsService.createCampaign(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update airdrop campaign (Admin)' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() updateDto: UpdateCampaignDto,
  ) {
    return this.airdropsService.updateCampaign(id, updateDto);
  }

  @Post(':id/participate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join an airdrop campaign' })
  async participate(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: ParticipateDto,
  ) {
    return this.airdropsService.participate(req.user.userId, id, dto);
  }

  @Post(':id/complete-task')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete an airdrop task' })
  async completeTask(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.airdropsService.completeTask(req.user.userId, id, dto);
  }

  @Post(':id/distribute')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Distribute airdrop tokens (Admin)' })
  async distributeAirdrop(@Param('id') id: string) {
    return this.airdropsService.distributeAirdrop(id);
  }
}
