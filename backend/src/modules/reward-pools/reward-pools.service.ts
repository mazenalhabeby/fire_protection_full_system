import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePoolDto } from './dto';

@Injectable()
export class RewardPoolsService {
  constructor(private prisma: PrismaService) {}

  async getAllPools() {
    const pools = await this.prisma.rewardPool.findMany({
      orderBy: { name: 'asc' },
    });

    return pools.map((pool) => {
      const allocation = parseFloat(pool.allocation.toString());
      const reserved = parseFloat(pool.reserved.toString());
      const distributed = parseFloat(pool.distributed.toString());
      const available = allocation - reserved - distributed;

      return {
        id: pool.id,
        name: pool.name,
        description: pool.description,
        allocation: pool.allocation.toString(),
        reserved: pool.reserved.toString(),
        distributed: pool.distributed.toString(),
        available: available.toString(),
        isActive: pool.isActive,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt,
      };
    });
  }

  async getPoolById(id: string) {
    const pool = await this.prisma.rewardPool.findUnique({
      where: { id },
    });

    if (!pool) {
      throw new NotFoundException('Reward pool not found');
    }

    const allocation = parseFloat(pool.allocation.toString());
    const reserved = parseFloat(pool.reserved.toString());
    const distributed = parseFloat(pool.distributed.toString());
    const available = allocation - reserved - distributed;

    return {
      id: pool.id,
      name: pool.name,
      description: pool.description,
      allocation: pool.allocation.toString(),
      reserved: pool.reserved.toString(),
      distributed: pool.distributed.toString(),
      available: available.toString(),
      isActive: pool.isActive,
      createdAt: pool.createdAt,
      updatedAt: pool.updatedAt,
    };
  }

  async getPoolByName(name: string) {
    const pool = await this.prisma.rewardPool.findUnique({
      where: { name },
    });

    if (!pool) {
      throw new NotFoundException(`Reward pool '${name}' not found`);
    }

    const allocation = parseFloat(pool.allocation.toString());
    const reserved = parseFloat(pool.reserved.toString());
    const distributed = parseFloat(pool.distributed.toString());
    const available = allocation - reserved - distributed;

    return {
      id: pool.id,
      name: pool.name,
      description: pool.description,
      allocation: pool.allocation.toString(),
      reserved: pool.reserved.toString(),
      distributed: pool.distributed.toString(),
      available: available.toString(),
      isActive: pool.isActive,
    };
  }

  async updatePool(id: string, updateDto: UpdatePoolDto) {
    const pool = await this.prisma.rewardPool.findUnique({
      where: { id },
    });

    if (!pool) {
      throw new NotFoundException('Reward pool not found');
    }

    const updateData: Prisma.RewardPoolUpdateInput = {};

    if (updateDto.addAllocation !== undefined && updateDto.addAllocation > 0) {
      updateData.allocation = {
        increment: new Prisma.Decimal(updateDto.addAllocation),
      };
    }

    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description;
    }

    const updatedPool = await this.prisma.rewardPool.update({
      where: { id },
      data: updateData,
    });

    const allocation = parseFloat(updatedPool.allocation.toString());
    const reserved = parseFloat(updatedPool.reserved.toString());
    const distributed = parseFloat(updatedPool.distributed.toString());
    const available = allocation - reserved - distributed;

    return {
      id: updatedPool.id,
      name: updatedPool.name,
      description: updatedPool.description,
      allocation: updatedPool.allocation.toString(),
      reserved: updatedPool.reserved.toString(),
      distributed: updatedPool.distributed.toString(),
      available: available.toString(),
      isActive: updatedPool.isActive,
      createdAt: updatedPool.createdAt,
      updatedAt: updatedPool.updatedAt,
    };
  }

  async getPoolStats() {
    const pools = await this.prisma.rewardPool.findMany();

    let totalAllocation = 0;
    let totalReserved = 0;
    let totalDistributed = 0;

    const poolBreakdowns = pools.map((pool) => {
      const allocation = parseFloat(pool.allocation.toString());
      const reserved = parseFloat(pool.reserved.toString());
      const distributed = parseFloat(pool.distributed.toString());
      const available = allocation - reserved - distributed;
      const usagePercent =
        allocation > 0
          ? (((reserved + distributed) / allocation) * 100).toFixed(2)
          : '0.00';

      totalAllocation += allocation;
      totalReserved += reserved;
      totalDistributed += distributed;

      return {
        name: pool.name,
        allocation: allocation.toString(),
        reserved: reserved.toString(),
        distributed: distributed.toString(),
        available: available.toString(),
        usagePercent,
      };
    });

    return {
      totalAllocation: totalAllocation.toString(),
      totalReserved: totalReserved.toString(),
      totalDistributed: totalDistributed.toString(),
      totalAvailable: (totalAllocation - totalReserved - totalDistributed).toString(),
      pools: poolBreakdowns,
    };
  }

  async reserveFromPool(poolName: string, amount: number) {
    const pool = await this.prisma.rewardPool.findUnique({
      where: { name: poolName },
    });

    if (!pool) {
      throw new NotFoundException(`Reward pool '${poolName}' not found`);
    }

    const available =
      parseFloat(pool.allocation.toString()) -
      parseFloat(pool.reserved.toString()) -
      parseFloat(pool.distributed.toString());

    if (available < amount) {
      throw new BadRequestException(
        `Insufficient funds in pool. Available: ${available}, Requested: ${amount}`,
      );
    }

    await this.prisma.rewardPool.update({
      where: { name: poolName },
      data: {
        reserved: { increment: new Prisma.Decimal(amount) },
      },
    });

    return { success: true, reservedAmount: amount };
  }

  async distributeFromPool(poolName: string, amount: number) {
    const pool = await this.prisma.rewardPool.findUnique({
      where: { name: poolName },
    });

    if (!pool) {
      throw new NotFoundException(`Reward pool '${poolName}' not found`);
    }

    const reserved = parseFloat(pool.reserved.toString());

    if (reserved < amount) {
      throw new BadRequestException(
        `Insufficient reserved funds. Reserved: ${reserved}, Requested: ${amount}`,
      );
    }

    await this.prisma.rewardPool.update({
      where: { name: poolName },
      data: {
        reserved: { decrement: new Prisma.Decimal(amount) },
        distributed: { increment: new Prisma.Decimal(amount) },
      },
    });

    return { success: true, distributedAmount: amount };
  }
}
