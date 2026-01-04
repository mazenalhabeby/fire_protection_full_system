import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { UpdateTicketDto, CreateMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { TicketStatus } from '@prisma/client';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class SupportAdminController {
  constructor(private readonly supportService: SupportService) {}

  // ============================================
  // Dashboard & Stats
  // ============================================

  @Get('stats')
  @RequirePermissions('support.view')
  async getStats() {
    return this.supportService.getAdminStats();
  }

  // ============================================
  // Tickets Management
  // ============================================

  @Get('tickets')
  @RequirePermissions('support.view')
  async getAllTickets(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.supportService.getAllTickets(
      { status, priority, category, assignedTo },
      Number(page),
      Number(limit),
    );
  }

  @Get('tickets/:id')
  @RequirePermissions('support.view')
  async getTicket(@Request() req: any, @Param('id') id: string) {
    return this.supportService.getTicketById(id, req.user.id, true);
  }

  @Patch('tickets/:id')
  @RequirePermissions('support.edit')
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.updateTicket(id, dto);
  }

  @Post('tickets/:id/reply')
  @RequirePermissions('support.edit')
  async replyToTicket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.replyToTicket(id, req.user.id, dto, true);
  }

  // ============================================
  // Contact Submissions
  // ============================================

  @Get('contacts')
  @RequirePermissions('support.view')
  async getContactSubmissions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.supportService.getContactSubmissions(Number(page), Number(limit));
  }

  @Patch('contacts/:id/read')
  @RequirePermissions('support.edit')
  async markContactAsRead(@Param('id') id: string) {
    return this.supportService.markContactAsRead(id);
  }
}
