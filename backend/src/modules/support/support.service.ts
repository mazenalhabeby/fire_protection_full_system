import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTicketDto, CreateMessageDto, ContactFormDto, UpdateTicketDto } from './dto';
import { TicketStatus, SenderType, UserRole } from '@prisma/client';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ============================================
  // FAQ Methods
  // ============================================

  async getFAQCategories() {
    return this.prisma.fAQCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async incrementFAQView(id: string) {
    await this.prisma.fAQItem.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async rateFAQItem(id: string, helpful: boolean) {
    const data = helpful
      ? { helpful: { increment: 1 } }
      : { notHelpful: { increment: 1 } };

    await this.prisma.fAQItem.update({
      where: { id },
      data,
    });
  }

  // ============================================
  // Contact Form Methods
  // ============================================

  async submitContactForm(dto: ContactFormDto) {
    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
      },
    });

    // Send confirmation email
    await this.emailService.sendContactConfirmationEmail(
      dto.email,
      dto.name,
      dto.subject,
    );

    this.logger.log(`Contact form submitted: ${submission.id}`);
    return { success: true, message: 'Your message has been received. We will respond shortly.' };
  }

  // ============================================
  // Ticket Methods - User
  // ============================================

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
        messages: {
          create: {
            senderId: userId,
            senderType: SenderType.USER,
            content: dto.message,
          },
        },
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        messages: true,
      },
    });

    // Send confirmation email to user
    if (ticket.user?.email) {
      await this.emailService.sendTicketCreatedEmail(
        ticket.user.email,
        ticketNumber,
        dto.subject,
      );
    }

    // Notify admins (could be improved to get admin emails from DB)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const userName = ticket.user
        ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || 'User'
        : 'User';

      await this.emailService.sendAdminNewTicketNotification(
        adminEmail,
        ticketNumber,
        dto.subject,
        dto.category || 'GENERAL',
        dto.priority || 'MEDIUM',
        userName,
      );
    }

    this.logger.log(`Ticket created: ${ticketNumber}`);
    return ticket;
  }

  async getUserTickets(userId: string, status?: TicketStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTicketById(ticketId: string, userId: string, isAdmin = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check access
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async replyToTicket(ticketId: string, userId: string, dto: CreateMessageDto, isAdmin = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { email: true, firstName: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check access
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const senderType = isAdmin ? SenderType.ADMIN : SenderType.USER;
    const newStatus = isAdmin ? TicketStatus.AWAITING_REPLY : TicketStatus.OPEN;

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        senderType,
        content: dto.content,
        isInternal: dto.isInternal && isAdmin,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update ticket status
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: newStatus },
    });

    // Send email notification (if not internal)
    if (!dto.isInternal && isAdmin && ticket.user?.email) {
      await this.emailService.sendTicketReplyEmail(
        ticket.user.email,
        ticket.ticketNumber,
        ticket.subject,
        dto.content,
      );
    }

    return message;
  }

  // ============================================
  // Admin Methods
  // ============================================

  async getAllTickets(
    filters: {
      status?: TicketStatus;
      priority?: string;
      category?: string;
      assignedTo?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    const data: any = { ...dto };

    if (dto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    } else if (dto.status === TicketStatus.CLOSED) {
      data.closedAt = new Date();
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getAdminStats() {
    const [open, inProgress, awaitingReply, resolved, total] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.AWAITING_REPLY } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
      this.prisma.supportTicket.count(),
    ]);

    const unreadContacts = await this.prisma.contactSubmission.count({
      where: { isRead: false },
    });

    return {
      tickets: { open, inProgress, awaitingReply, resolved, total },
      unreadContacts,
    };
  }

  async getContactSubmissions(page = 1, limit = 20) {
    const [submissions, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactSubmission.count(),
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markContactAsRead(id: string) {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const prefix = `TKT${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const lastTicket = await this.prisma.supportTicket.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
    });

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.slice(-4), 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }
}
