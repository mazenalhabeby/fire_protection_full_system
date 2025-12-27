import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductImageDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'ABC Fire Extinguisher 5kg' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'abc-fire-extinguisher-5kg' })
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  priceHbct: number;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  priceFiat?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ type: () => [ProductImageDto] })
  @IsArray()
  @IsOptional()
  images?: ProductImageDto[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  initialStock?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceHbct?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceFiat?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdateInventoryDto {
  @ApiProperty()
  @IsNumber()
  stock: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  lowStock?: number;
}

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  priceHbct: string;

  @ApiPropertyOptional()
  priceFiat?: string | null;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiPropertyOptional()
  images?: ProductImageDto[];

  @ApiPropertyOptional()
  inventory?: {
    stock: number;
    reserved: number;
    available: number;
    lowStock: number;
    isLowStock?: boolean;
  } | null;
}

export class ProductQueryDto {
  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional()
  featured?: boolean;

  @ApiPropertyOptional()
  search?: string;
}
