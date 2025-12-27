import { PaginatedResponse, PaginationParams } from '../types';

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Normalized pagination parameters with defaults
 */
export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Normalizes pagination parameters with defaults and limits
 */
export function normalizePagination(params?: PaginationParams): NormalizedPagination {
  const page = Math.max(1, params?.page || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params?.limit || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}

/**
 * Creates Prisma skip/take object from pagination params
 */
export function toPrismaPage(params?: PaginationParams): { skip: number; take: number } {
  const { skip, take } = normalizePagination(params);
  return { skip, take };
}

/**
 * Creates a paginated response from items and total count
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: NormalizedPagination | PaginationParams,
): PaginatedResponse<T> {
  const { page, limit } = 'skip' in pagination
    ? pagination
    : normalizePagination(pagination);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Helper type for Prisma count + findMany pattern
 */
export interface PaginatedQueryResult<T> {
  items: T[];
  total: number;
}

/**
 * Creates a paginated response from a query result
 */
export function paginateResult<T>(
  result: PaginatedQueryResult<T>,
  pagination: NormalizedPagination | PaginationParams,
): PaginatedResponse<T> {
  return createPaginatedResponse(result.items, result.total, pagination);
}

/**
 * Type for custom field names in paginated response
 * Useful when API expects different field names (e.g., 'deposits' instead of 'items')
 */
export type CustomPaginatedResponse<T, K extends string> = Omit<PaginatedResponse<T>, 'items'> & {
  [key in K]: T[];
};

/**
 * Creates a paginated response with a custom field name for items
 */
export function createCustomPaginatedResponse<T, K extends string>(
  items: T[],
  total: number,
  pagination: NormalizedPagination | PaginationParams,
  itemsFieldName: K,
): CustomPaginatedResponse<T, K> {
  const { page, limit } = 'skip' in pagination
    ? pagination
    : normalizePagination(pagination);

  return {
    [itemsFieldName]: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  } as CustomPaginatedResponse<T, K>;
}
