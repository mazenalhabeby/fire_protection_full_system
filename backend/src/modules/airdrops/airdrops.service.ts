import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  AirdropStatus,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  ParticipateDto,
  CompleteTaskDto,
} from './dto';

@Injectable()
export class AirdropsService {
  private readonly tokenPrice: number;
  private readonly airdropPoolName = 'Airdrop';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.tokenPrice = parseFloat(
      configService.get<string>('TOKEN_CURRENT_PRICE') ||
        configService.get<string>('TOKEN_PRESALE_PRICE') ||
        '0.03',
    );
  }

  async getActiveCampaigns() {
    const campaigns = await this.prisma.airdropCampaign.findMany({
      where: {
        status: AirdropStatus.ACTIVE,
        OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
      },
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      totalAllocation: campaign.totalAllocation.toString(),
      reserved: campaign.reserved.toString(),
      distributed: campaign.distributed.toString(),
      perUserAmount: campaign.perUserAmount?.toString(),
      maxParticipants: campaign.maxParticipants,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      tasks: campaign.tasks as { id: string; type: string; description: string }[],
      participantCount: campaign._count.entries,
      createdAt: campaign.createdAt,
    }));
  }

  async getCampaignById(id: string) {
    const campaign = await this.prisma.airdropCampaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      totalAllocation: campaign.totalAllocation.toString(),
      reserved: campaign.reserved.toString(),
      distributed: campaign.distributed.toString(),
      perUserAmount: campaign.perUserAmount?.toString(),
      maxParticipants: campaign.maxParticipants,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      tasks: campaign.tasks as { id: string; type: string; description: string }[],
      eligibility: campaign.eligibility,
      participantCount: campaign._count.entries,
      createdAt: campaign.createdAt,
    };
  }

  async createCampaign(createDto: CreateCampaignDto) {
    // Check airdrop pool has sufficient allocation
    const pool = await this.prisma.rewardPool.findUnique({
      where: { name: this.airdropPoolName },
    });

    if (!pool) {
      throw new BadRequestException('Airdrop pool not configured');
    }

    const available =
      parseFloat(pool.allocation.toString()) -
      parseFloat(pool.reserved.toString()) -
      parseFloat(pool.distributed.toString());

    if (available < createDto.totalAllocation) {
      throw new BadRequestException(
        `Insufficient funds in airdrop pool. Available: ${available}`,
      );
    }

    const campaign = await this.prisma.$transaction(async (tx) => {
      // Reserve from pool
      await tx.rewardPool.update({
        where: { name: this.airdropPoolName },
        data: {
          reserved: { increment: new Prisma.Decimal(createDto.totalAllocation) },
        },
      });

      // Create campaign
      return tx.airdropCampaign.create({
        data: {
          title: createDto.title,
          description: createDto.description,
          status: AirdropStatus.DRAFT,
          totalAllocation: new Prisma.Decimal(createDto.totalAllocation),
          reserved: new Prisma.Decimal(createDto.totalAllocation),
          perUserAmount: createDto.perUserAmount
            ? new Prisma.Decimal(createDto.perUserAmount)
            : null,
          maxParticipants: createDto.maxParticipants,
          startAt: createDto.startAt ? new Date(createDto.startAt) : null,
          endAt: createDto.endAt ? new Date(createDto.endAt) : null,
          tasks: (createDto.tasks as unknown) ?? [],
        },
      });
    });

    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      totalAllocation: campaign.totalAllocation.toString(),
      message: 'Campaign created successfully',
    };
  }

  async updateCampaign(id: string, updateDto: UpdateCampaignDto) {
    const campaign = await this.prisma.airdropCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updateData: Prisma.AirdropCampaignUpdateInput = {};

    if (updateDto.title) updateData.title = updateDto.title;
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description;
    if (updateDto.status)
      updateData.status = updateDto.status as AirdropStatus;
    if (updateDto.startAt) updateData.startAt = new Date(updateDto.startAt);
    if (updateDto.endAt) updateData.endAt = new Date(updateDto.endAt);

    const updated = await this.prisma.airdropCampaign.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      message: 'Campaign updated successfully',
    };
  }

  async participate(userId: string, campaignId: string, dto: ParticipateDto) {
    const campaign = await this.prisma.airdropCampaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: { select: { entries: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== AirdropStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    // Check dates
    const now = new Date();
    if (campaign.startAt && now < campaign.startAt) {
      throw new BadRequestException('Campaign has not started yet');
    }
    if (campaign.endAt && now > campaign.endAt) {
      throw new BadRequestException('Campaign has ended');
    }

    // Check max participants
    if (
      campaign.maxParticipants &&
      campaign._count.entries >= campaign.maxParticipants
    ) {
      throw new BadRequestException('Campaign is full');
    }

    // Check if already participating
    const existing = await this.prisma.airdropEntry.findUnique({
      where: {
        campaignId_walletAddress: {
          campaignId,
          walletAddress: dto.walletAddress,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already participating in this campaign');
    }

    // Calculate allocated amount
    const perUserAmount = campaign.perUserAmount
      ? parseFloat(campaign.perUserAmount.toString())
      : parseFloat(campaign.totalAllocation.toString()) /
        (campaign.maxParticipants || 1000);

    // Create entry
    const entry = await this.prisma.airdropEntry.create({
      data: {
        campaignId,
        userId,
        walletAddress: dto.walletAddress,
        allocatedAmount: new Prisma.Decimal(perUserAmount),
        isEligible: false, // Will be marked eligible after tasks complete
        tasksCompleted: {},
      },
    });

    return {
      id: entry.id,
      campaignId: entry.campaignId,
      walletAddress: entry.walletAddress,
      allocatedAmount: entry.allocatedAmount.toString(),
      isEligible: entry.isEligible,
      message: 'Successfully joined the campaign',
    };
  }

  async completeTask(userId: string, campaignId: string, dto: CompleteTaskDto) {
    const campaign = await this.prisma.airdropCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const entry = await this.prisma.airdropEntry.findFirst({
      where: { campaignId, userId },
    });

    if (!entry) {
      throw new NotFoundException('You are not participating in this campaign');
    }

    // Get current tasks completed
    const tasksCompleted = (entry.tasksCompleted as Record<string, boolean>) || {};
    tasksCompleted[dto.taskId] = true;

    // Check if all tasks are completed
    const tasks = (campaign.tasks as { id: string }[]) || [];
    const allTasksCompleted = tasks.every((task) => tasksCompleted[task.id]);

    await this.prisma.airdropEntry.update({
      where: { id: entry.id },
      data: {
        tasksCompleted,
        isEligible: allTasksCompleted,
      },
    });

    return {
      taskId: dto.taskId,
      completed: true,
      isEligible: allTasksCompleted,
      tasksCompleted,
    };
  }

  async distributeAirdrop(campaignId: string) {
    const campaign = await this.prisma.airdropCampaign.findUnique({
      where: { id: campaignId },
      include: {
        entries: {
          where: { isEligible: true, isDistributed: false },
          include: { user: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.entries.length === 0) {
      throw new BadRequestException('No eligible entries to distribute');
    }

    let totalDistributed = 0;
    const distributedEntries: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const entry of campaign.entries) {
        const amount = parseFloat(entry.allocatedAmount.toString());

        if (entry.userId) {
          // Add tokens to user's balance
          await tx.tokenBalance.upsert({
            where: { userId: entry.userId },
            create: {
              userId: entry.userId,
              availableBalance: new Prisma.Decimal(amount),
              lockedBalance: new Prisma.Decimal(0),
              totalBalance: new Prisma.Decimal(amount),
            },
            update: {
              availableBalance: { increment: new Prisma.Decimal(amount) },
              totalBalance: { increment: new Prisma.Decimal(amount) },
            },
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: entry.userId,
              type: TransactionType.AIRDROP,
              amount: new Prisma.Decimal(amount),
              priceUsd: new Prisma.Decimal(this.tokenPrice),
              totalUsd: new Prisma.Decimal(amount * this.tokenPrice),
              status: TransactionStatus.COMPLETED,
              completedAt: new Date(),
              relatedAirdropId: campaignId,
              metadata: {
                campaignTitle: campaign.title,
                entryId: entry.id,
              },
            },
          });
        }

        // Mark entry as distributed
        await tx.airdropEntry.update({
          where: { id: entry.id },
          data: { isDistributed: true },
        });

        totalDistributed += amount;
        distributedEntries.push(entry.id);
      }

      // Update campaign distributed amount
      await tx.airdropCampaign.update({
        where: { id: campaignId },
        data: {
          distributed: { increment: new Prisma.Decimal(totalDistributed) },
          reserved: { decrement: new Prisma.Decimal(totalDistributed) },
        },
      });

      // Update pool
      await tx.rewardPool.update({
        where: { name: this.airdropPoolName },
        data: {
          reserved: { decrement: new Prisma.Decimal(totalDistributed) },
          distributed: { increment: new Prisma.Decimal(totalDistributed) },
        },
      });
    });

    return {
      message: 'Airdrop distributed successfully',
      totalDistributed: totalDistributed.toString(),
      entriesProcessed: distributedEntries.length,
    };
  }

  async getUserEntries(userId: string) {
    const entries = await this.prisma.airdropEntry.findMany({
      where: { userId },
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((entry) => ({
      id: entry.id,
      campaignId: entry.campaignId,
      campaignTitle: entry.campaign.title,
      walletAddress: entry.walletAddress,
      allocatedAmount: entry.allocatedAmount.toString(),
      isEligible: entry.isEligible,
      isDistributed: entry.isDistributed,
      tasksCompleted: entry.tasksCompleted,
      createdAt: entry.createdAt,
    }));
  }

  async getAllCampaigns() {
    const campaigns = await this.prisma.airdropCampaign.findMany({
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      totalAllocation: campaign.totalAllocation.toString(),
      reserved: campaign.reserved.toString(),
      distributed: campaign.distributed.toString(),
      perUserAmount: campaign.perUserAmount?.toString(),
      maxParticipants: campaign.maxParticipants,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      participantCount: campaign._count.entries,
      createdAt: campaign.createdAt,
    }));
  }
}
