import { IsOptional, IsInt, IsString, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ToLowerCase } from '../utils/transforms';

/**
 * Base pagination DTO that can be extended by other query DTOs.
 * Provides common pagination fields: page, limit.
 */
export class PaginationDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Pagination DTO with search capability.
 * Extends base pagination with a lowercase, trimmed search field.
 */
export class SearchablePaginationDto extends PaginationDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'Search term (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ToLowerCase()
  search?: string;
}

/**
 * Pagination DTO with status filter.
 * Extends base pagination with a status field.
 */
export class StatusFilterPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Filter by status' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}

/**
 * Pagination DTO with search and status filter.
 * Common combination for many admin queries.
 */
export class SearchableStatusPaginationDto extends SearchablePaginationDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Filter by status' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}

/**
 * Pagination DTO with user ID filter.
 * Useful for filtering records by user.
 */
export class UserFilterPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  userId?: string;
}
