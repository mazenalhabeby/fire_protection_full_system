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
import { CreateTicketDto, CreateMessageDto, ContactFormDto, CreateGuestTicketDto, GuestTicketAccessDto, GuestReplyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Public } from '../../common/decorators/public.decorator';
import { TicketStatus } from '@prisma/client';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ============================================
  // Public Endpoints
  // ============================================

  @Public()
  @Get('faq')
  async getFAQ() {
    return this.supportService.getFAQCategories();
  }

  @Public()
  @Patch('faq/:id/view')
  async incrementFAQView(@Param('id') id: string) {
    await this.supportService.incrementFAQView(id);
    return { success: true };
  }

  @Public()
  @Post('faq/:id/rate')
  async rateFAQItem(
    @Param('id') id: string,
    @Body('helpful') helpful: boolean,
  ) {
    await this.supportService.rateFAQItem(id, helpful);
    return { success: true };
  }

  @Public()
  @Post('contact')
  async submitContactForm(@Body() dto: ContactFormDto) {
    return this.supportService.submitContactForm(dto);
  }

  // ============================================
  // Guest Ticket Endpoints (Public)
  // ============================================

  @Public()
  @Post('guest/tickets')
  async createGuestTicket(@Body() dto: CreateGuestTicketDto) {
    return this.supportService.createGuestTicket(dto);
  }

  @Public()
  @Get('guest/tickets/:token')
  async getGuestTicket(@Param('token') token: string) {
    return this.supportService.getGuestTicketByToken(token);
  }

  @Public()
  @Post('guest/tickets/access')
  async requestTicketAccess(@Body() dto: GuestTicketAccessDto) {
    return this.supportService.getGuestTicketAccess(dto);
  }

  @Public()
  @Post('guest/tickets/reply')
  async replyToGuestTicket(@Body() dto: GuestReplyDto) {
    return this.supportService.replyToGuestTicket(dto);
  }

  // ============================================
  // Authenticated User Endpoints
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('tickets')
  async getMyTickets(
    @Request() req: any,
    @Query('status') status?: TicketStatus,
  ) {
    return this.supportService.getUserTickets(req.user.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets')
  async createTicket(@Request() req: any, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tickets/:id')
  async getTicket(@Request() req: any, @Param('id') id: string) {
    return this.supportService.getTicketById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:id/reply')
  async replyToTicket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.replyToTicket(id, req.user.id, dto);
  }
}
