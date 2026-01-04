import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  OrderStatus,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderQueryDto } from '../dto';

@Injectable()
export class OrdersService {
  private readonly tokenPrice: number;

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

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').substring(0, 4).toUpperCase();
    return `HBC-${timestamp}-${random}`;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    // Validate and calculate totals
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { inventory: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Check stock and calculate totals
    let totalHbct = 0;
    let totalFiat = 0;
    const orderItems: {
      productId: string;
      quantity: number;
      unitPriceHbct: number;
      unitPriceFiat: number | null;
      productName: string;
    }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      const inventory = product.inventory;
      if (!inventory || inventory.stock - inventory.reserved < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${product.name}`,
        );
      }

      const unitPriceHbct = parseFloat(product.priceHbct.toString());
      const unitPriceFiat = product.priceFiat
        ? parseFloat(product.priceFiat.toString())
        : null;

      totalHbct += unitPriceHbct * item.quantity;
      if (unitPriceFiat) {
        totalFiat += unitPriceFiat * item.quantity;
      }

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPriceHbct,
        unitPriceFiat,
        productName: product.name,
      });
    }

    // Check user has sufficient balance if paying with HBCT
    if (dto.paymentMethod === 'HBCT') {
      const balance = await this.prisma.tokenBalance.findUnique({
        where: { userId },
      });

      if (
        !balance ||
        parseFloat(balance.availableBalance.toString()) < totalHbct
      ) {
        throw new BadRequestException('Insufficient token balance');
      }
    }

    // Create order
    const order = await this.prisma.$transaction(async (tx) => {
      // Reserve inventory
      for (const item of orderItems) {
        await tx.productInventory.update({
          where: { productId: item.productId },
          data: {
            reserved: { increment: item.quantity },
          },
        });
      }

      // Create order
      const newOrder = await tx.marketplaceOrder.create({
        data: {
          userId,
          orderNumber: this.generateOrderNumber(),
          status: OrderStatus.PENDING,
          totalHbct: new Prisma.Decimal(totalHbct),
          totalFiat: totalFiat > 0 ? new Prisma.Decimal(totalFiat) : null,
          currency: 'USD',
          paymentMethod: dto.paymentMethod,
          shippingName: dto.shipping.name,
          shippingEmail: dto.shipping.email,
          shippingPhone: dto.shipping.phone,
          shippingAddress: dto.shipping.address,
          shippingCity: dto.shipping.city,
          shippingState: dto.shipping.state,
          shippingZip: dto.shipping.zip,
          shippingCountry: dto.shipping.country,
          notes: dto.notes,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceHbct: new Prisma.Decimal(item.unitPriceHbct),
          unitPriceFiat: item.unitPriceFiat
            ? new Prisma.Decimal(item.unitPriceFiat)
            : null,
        })),
      });

      // If paying with HBCT, deduct immediately
      if (dto.paymentMethod === 'HBCT') {
        await tx.tokenBalance.update({
          where: { userId },
          data: {
            availableBalance: { decrement: new Prisma.Decimal(totalHbct) },
            totalBalance: { decrement: new Prisma.Decimal(totalHbct) },
          },
        });

        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.MARKETPLACE_PURCHASE,
            amount: new Prisma.Decimal(totalHbct),
            priceUsd: new Prisma.Decimal(this.tokenPrice),
            totalUsd: new Prisma.Decimal(totalHbct * this.tokenPrice),
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
            relatedOrderId: newOrder.id,
            metadata: {
              orderNumber: newOrder.orderNumber,
              itemCount: orderItems.length,
            },
          },
        });

        // Update order to PAID
        await tx.marketplaceOrder.update({
          where: { id: newOrder.id },
          data: {
            status: OrderStatus.PAID,
            paidAt: new Date(),
          },
        });

        // Reduce reserved, reduce stock
        for (const item of orderItems) {
          await tx.productInventory.update({
            where: { productId: item.productId },
            data: {
              stock: { decrement: item.quantity },
              reserved: { decrement: item.quantity },
            },
          });
        }
      }

      return newOrder;
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: dto.paymentMethod === 'HBCT' ? 'PAID' : order.status,
      totalHbct: totalHbct.toString(),
      message: 'Order created successfully',
    };
  }

  async getUserOrders(userId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceOrderWhereInput = { userId };
    if (status) {
      where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketplaceOrder.count({ where }),
    ]);

    return {
      orders: orders.map((order) => this.formatOrder(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(orderId: string, userId?: string) {
    const where: Prisma.MarketplaceOrderWhereInput = { id: orderId };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.marketplaceOrder.findFirst({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: Prisma.MarketplaceOrderUpdateInput = {
      status: dto.status as OrderStatus,
    };

    if (dto.trackingNumber) updateData.trackingNumber = dto.trackingNumber;
    if (dto.trackingUrl) updateData.trackingUrl = dto.trackingUrl;
    if (dto.notes) updateData.notes = dto.notes;

    if (dto.status === 'SHIPPED') {
      updateData.shippedAt = new Date();
    } else if (dto.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    return {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      message: 'Order status updated successfully',
    };
  }

  async cancelOrder(orderId: string, userId?: string) {
    const where: Prisma.MarketplaceOrderWhereInput = { id: orderId };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.marketplaceOrder.findFirst({
      where,
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['PENDING', 'PAID'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of order.items) {
        if (order.status === 'PENDING') {
          // Just release reserved
          await tx.productInventory.update({
            where: { productId: item.productId },
            data: {
              reserved: { decrement: item.quantity },
            },
          });
        } else {
          // Restore stock (was deducted on payment)
          await tx.productInventory.update({
            where: { productId: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          });
        }
      }

      // Refund if paid with HBCT
      if (order.status === 'PAID' && order.userId) {
        const refundAmount = parseFloat(order.totalHbct.toString());

        await tx.tokenBalance.update({
          where: { userId: order.userId },
          data: {
            availableBalance: { increment: new Prisma.Decimal(refundAmount) },
            totalBalance: { increment: new Prisma.Decimal(refundAmount) },
          },
        });

        await tx.transaction.create({
          data: {
            userId: order.userId,
            type: TransactionType.MARKETPLACE_REFUND,
            amount: new Prisma.Decimal(refundAmount),
            priceUsd: new Prisma.Decimal(this.tokenPrice),
            totalUsd: new Prisma.Decimal(refundAmount * this.tokenPrice),
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
            relatedOrderId: orderId,
            metadata: { reason: 'Order cancelled' },
          },
        });
      }

      // Update order status
      await tx.marketplaceOrder.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    return { message: 'Order cancelled successfully' };
  }

  async getAllOrders(query: OrderQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceOrderWhereInput = {};
    if (status) {
      where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketplaceOrder.count({ where }),
    ]);

    return {
      orders: orders.map((order) => ({
        ...this.formatOrder(order),
        user: order.user
          ? {
              email: order.user.email,
              name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalHbct: order.totalHbct.toString(),
      totalFiat: order.totalFiat?.toString(),
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      shipping: {
        name: order.shippingName,
        email: order.shippingEmail,
        phone: order.shippingPhone,
        address: order.shippingAddress,
        city: order.shippingCity,
        state: order.shippingState,
        zip: order.shippingZip,
        country: order.shippingCountry,
      },
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      items: order.items?.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.name,
        quantity: item.quantity,
        unitPriceHbct: item.unitPriceHbct.toString(),
        unitPriceFiat: item.unitPriceFiat?.toString(),
      })),
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      completedAt: order.completedAt,
    };
  }
}
