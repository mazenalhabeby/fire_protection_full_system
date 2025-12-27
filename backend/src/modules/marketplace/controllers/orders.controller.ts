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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { OrdersService } from '../services/orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderQueryDto,
} from '../dto';

@ApiTags('Marketplace - Orders')
@Controller('marketplace/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  async getUserOrders(
    @Request() req: { user: { userId: string } },
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.getUserOrders(req.user.userId, query);
  }

  @Get('all')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get all orders (Admin)' })
  async getAllOrders(@Query() query: OrderQueryDto) {
    return this.ordersService.getAllOrders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async getOrderById(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create order' })
  async createOrder(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(req.user.userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update order status (Admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(id, req.user.userId);
  }
}
