import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTicketDto, CreateMessageDto, ContactFormDto, UpdateTicketDto, CreateGuestTicketDto, GuestTicketAccessDto, GuestReplyDto } from './dto';
import { TicketStatus, SenderType, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

// Support permission constant
const SUPPORT_VIEW_PERMISSION = 'support.view';

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
  // Guest Ticket Methods (Public)
  // ============================================

  private generateAccessToken(): string {
    return randomBytes(32).toString('hex');
  }

  async createGuestTicket(dto: CreateGuestTicketDto) {
    const ticketNumber = await this.generateTicketNumber();
    const accessToken = this.generateAccessToken();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
        guestEmail: dto.email.toLowerCase(),
        guestName: dto.name,
        accessToken,
        messages: {
          create: {
            senderType: SenderType.GUEST,
            content: dto.message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    // Send confirmation email with access link
    await this.emailService.sendGuestTicketCreatedEmail(
      dto.email,
      dto.name,
      ticketNumber,
      dto.subject,
      accessToken,
    );

    // Notify support staff
    await this.notifySupportStaffNewTicket(
      ticketNumber,
      dto.subject,
      dto.category || 'GENERAL',
      dto.priority || 'MEDIUM',
      dto.name,
    );

    this.logger.log(`Guest ticket created: ${ticketNumber}`);

    return {
      ticketNumber,
      accessToken,
      message: 'Your ticket has been created. Check your email for the access link.',
    };
  }

  async getGuestTicketByToken(accessToken: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { accessToken },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async getGuestTicketAccess(dto: GuestTicketAccessDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        ticketNumber: dto.ticketNumber.toUpperCase(),
        guestEmail: dto.email.toLowerCase(),
      },
      select: {
        accessToken: true,
        ticketNumber: true,
      },
    });

    if (!ticket || !ticket.accessToken) {
      throw new NotFoundException('Ticket not found or email does not match');
    }

    // Send access link via email
    await this.emailService.sendGuestTicketAccessEmail(
      dto.email,
      dto.ticketNumber,
      ticket.accessToken,
    );

    return {
      success: true,
      message: 'Access link has been sent to your email',
    };
  }

  async replyToGuestTicket(dto: GuestReplyDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { accessToken: dto.accessToken },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED) {
      throw new BadRequestException('This ticket is closed');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: SenderType.GUEST,
        content: dto.content,
      },
    });

    // Update ticket status
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.OPEN },
    });

    // Notify assigned staff or all support staff
    const guestName = ticket.guestName || 'Guest';
    await this.notifyAssignedStaffUserReply(
      ticket.id,
      ticket.ticketNumber,
      ticket.subject,
      dto.content,
      guestName,
    );

    return message;
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

    // Notify all support staff dynamically
    const userName = ticket.user
      ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || 'User'
      : 'User';

    await this.notifySupportStaffNewTicket(
      ticketNumber,
      dto.subject,
      dto.category || 'GENERAL',
      dto.priority || 'MEDIUM',
      userName,
    );

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
          where: isAdmin ? undefined : { isInternal: false },
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
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check access - for non-admin, must be ticket owner (only for user tickets, not guest tickets)
    if (!isAdmin && ticket.userId && ticket.userId !== userId) {
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

    // Update ticket status and auto-assign if admin replies and not already assigned
    const updateData: any = { status: newStatus };

    if (isAdmin && !ticket.assignedTo) {
      // Auto-assign ticket to the admin who replies
      updateData.assignedTo = userId;
      this.logger.log(`Auto-assigned ticket ${ticket.ticketNumber} to user ${userId}`);
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Send notifications
    if (!dto.isInternal) {
      if (isAdmin) {
        // Admin replied - notify user or guest
        if (ticket.user?.email) {
          // Registered user ticket
          await this.emailService.sendTicketReplyEmail(
            ticket.user.email,
            ticket.ticketNumber,
            ticket.subject,
            dto.content,
          );
        } else if (ticket.guestEmail && ticket.accessToken) {
          // Guest ticket
          await this.emailService.sendGuestTicketReplyEmail(
            ticket.guestEmail,
            ticket.guestName || 'Guest',
            ticket.ticketNumber,
            ticket.subject,
            dto.content,
            ticket.accessToken,
          );
        }
      } else if (!isAdmin) {
        // User replied - notify assigned staff or all support staff
        const userName = ticket.user
          ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || 'User'
          : 'User';

        await this.notifyAssignedStaffUserReply(
          ticketId,
          ticket.ticketNumber,
          ticket.subject,
          dto.content,
          userName,
        );
      }
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

  /**
   * Get all users who have support.view permission (support staff)
   * Returns users with their email and name
   */
  async getSupportStaff(): Promise<Array<{ id: string; email: string; firstName: string | null; lastName: string | null }>> {
    // Find the support.view permission
    const permission = await this.prisma.permission.findFirst({
      where: { code: SUPPORT_VIEW_PERMISSION },
    });

    if (!permission) {
      this.logger.warn('Support permission not found in database');
      return [];
    }

    // Find all roles that have this permission
    const rolesWithPermission = await this.prisma.rolePermission.findMany({
      where: { permissionId: permission.id },
      select: { roleId: true },
    });

    const roleIds = rolesWithPermission.map((rp) => rp.roleId);

    if (roleIds.length === 0) {
      return [];
    }

    // Find all active users with these roles who have an email
    const supportStaff = await this.prisma.user.findMany({
      where: {
        roleId: { in: roleIds },
        isActive: true,
        email: { not: null },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Filter out null emails and cast to proper type
    return supportStaff.filter((staff): staff is { id: string; email: string; firstName: string | null; lastName: string | null } =>
      staff.email !== null
    );
  }

  /**
   * Notify all support staff about a new ticket
   */
  private async notifySupportStaffNewTicket(
    ticketNumber: string,
    subject: string,
    category: string,
    priority: string,
    userName: string,
  ): Promise<void> {
    const supportStaff = await this.getSupportStaff();

    if (supportStaff.length === 0) {
      this.logger.warn('No support staff found to notify about new ticket');
      return;
    }

    this.logger.log(`Notifying ${supportStaff.length} support staff about new ticket ${ticketNumber}`);

    // Send email to each support staff member
    const emailPromises = supportStaff.map((staff) =>
      this.emailService.sendAdminNewTicketNotification(
        staff.email,
        ticketNumber,
        subject,
        category,
        priority,
        userName,
      ).catch((err) => {
        this.logger.error(`Failed to notify ${staff.email} about new ticket: ${err.message}`);
      })
    );

    await Promise.all(emailPromises);
  }

  /**
   * Notify assigned support staff about user reply
   */
  private async notifyAssignedStaffUserReply(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    content: string,
    userName: string,
  ): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        assignee: { select: { email: true, firstName: true } },
      },
    });

    if (!ticket?.assignee?.email) {
      // If no assignee, notify all support staff
      const supportStaff = await this.getSupportStaff();
      const emailPromises = supportStaff.map((staff) =>
        this.emailService.sendTicketUserReplyNotification(
          staff.email,
          ticketNumber,
          subject,
          content,
          userName,
        ).catch((err) => {
          this.logger.error(`Failed to notify ${staff.email} about user reply: ${err.message}`);
        })
      );
      await Promise.all(emailPromises);
      return;
    }

    // Notify assigned staff
    await this.emailService.sendTicketUserReplyNotification(
      ticket.assignee.email,
      ticketNumber,
      subject,
      content,
      userName,
    );
  }
}
