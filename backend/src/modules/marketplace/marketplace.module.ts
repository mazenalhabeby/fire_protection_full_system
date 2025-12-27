import { Module } from '@nestjs/common';
import { CategoriesController } from './controllers/categories.controller';
import { ProductsController } from './controllers/products.controller';
import { OrdersController } from './controllers/orders.controller';
import { CategoriesService } from './services/categories.service';
import { ProductsService } from './services/products.service';
import { OrdersService } from './services/orders.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController, ProductsController, OrdersController],
  providers: [CategoriesService, ProductsService, OrdersService],
  exports: [CategoriesService, ProductsService, OrdersService],
})
export class MarketplaceModule {}
