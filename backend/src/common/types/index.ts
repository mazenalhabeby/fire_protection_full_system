/**
 * Common type definitions for the application
 */

/**
 * Authenticated user payload from JWT token
 */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: string;
  sessionId: string;
  refreshToken?: string;
}

/**
 * User response format used across the application
 */
export interface UserResponse {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  walletAddress: string | null;
  role: string;
  isEmailVerified: boolean;
  authProvider: string;
  createdAt: Date;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Common query filters
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Status filter for various entities
 */
export interface StatusFilter {
  status?: string;
}
