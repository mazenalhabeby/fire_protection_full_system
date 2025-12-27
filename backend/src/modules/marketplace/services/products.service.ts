import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateInventoryDto,
  ProductQueryDto,
} from '../dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getAll(query: ProductQueryDto) {
    const { categoryId, page = 1, limit = 20, featured, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          inventory: true,
          category: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => this.formatProduct(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        inventory: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        inventory: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  async create(dto: CreateProductDto) {
    // Check slug
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Product with this slug already exists');
    }

    // Check category exists
    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = await this.prisma.$transaction(async (tx) => {
      // Create product
      const newProduct = await tx.product.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          priceHbct: new Prisma.Decimal(dto.priceHbct),
          priceFiat: dto.priceFiat
            ? new Prisma.Decimal(dto.priceFiat)
            : null,
          currency: dto.currency ?? 'USD',
          isFeatured: dto.isFeatured ?? false,
        },
      });

      // Create images if provided
      if (dto.images && dto.images.length > 0) {
        await tx.productImage.createMany({
          data: dto.images.map((img, index) => ({
            productId: newProduct.id,
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary ?? index === 0,
            sortOrder: img.sortOrder ?? index,
          })),
        });
      }

      // Create inventory
      await tx.productInventory.create({
        data: {
          productId: newProduct.id,
          stock: dto.initialStock ?? 0,
        },
      });

      return newProduct;
    });

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      message: 'Product created successfully',
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priceHbct !== undefined)
      updateData.priceHbct = new Prisma.Decimal(dto.priceHbct);
    if (dto.priceFiat !== undefined)
      updateData.priceFiat = new Prisma.Decimal(dto.priceFiat);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      message: 'Product updated successfully',
    };
  }

  async updateInventory(id: string, dto: UpdateInventoryDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const inventory = await this.prisma.productInventory.upsert({
      where: { productId: id },
      create: {
        productId: id,
        stock: dto.stock,
        lowStock: dto.lowStock ?? 5,
      },
      update: {
        stock: dto.stock,
        ...(dto.lowStock !== undefined && { lowStock: dto.lowStock }),
      },
    });

    return {
      productId: id,
      stock: inventory.stock,
      reserved: inventory.reserved,
      available: inventory.stock - inventory.reserved,
      lowStock: inventory.lowStock,
      message: 'Inventory updated successfully',
    };
  }

  async delete(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.orderItems.length > 0) {
      // Soft delete instead
      await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Product deactivated (has order history)' };
    }

    await this.prisma.$transaction([
      this.prisma.productImage.deleteMany({ where: { productId: id } }),
      this.prisma.productInventory.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);

    return { message: 'Product deleted successfully' };
  }

  async getFeatured(limit = 6) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: limit,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        inventory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => this.formatProduct(p));
  }

  private formatProduct(product: any) {
    const inventory = product.inventory;
    return {
      id: product.id,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceHbct: product.priceHbct.toString(),
      priceFiat: product.priceFiat?.toString(),
      currency: product.currency,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      images: product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
      })),
      inventory: inventory
        ? {
            stock: inventory.stock,
            reserved: inventory.reserved,
            available: inventory.stock - inventory.reserved,
            lowStock: inventory.lowStock,
            isLowStock: inventory.stock - inventory.reserved <= inventory.lowStock,
          }
        : null,
    };
  }
}
