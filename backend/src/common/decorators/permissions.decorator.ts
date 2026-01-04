import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../guards/permissions.guard';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route.
 * Can accept a single permission or an array of permissions.
 *
 * @example
 * // Require a single permission
 * @RequirePermissions('users.view')
 *
 * @example
 * // Require multiple permissions (ALL must be present)
 * @RequirePermissions('users.view', 'users.edit')
 *
 * @example
 * // Require any of multiple permissions (use RequireAnyPermission instead)
 * @RequireAnyPermission('users.edit', 'users.delete')
 */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, { permissions, mode: 'all' }),
    UseGuards(PermissionsGuard),
  );

/**
 * Decorator to require ANY of the specified permissions (at least one).
 *
 * @example
 * @RequireAnyPermission('users.edit', 'users.delete')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, { permissions, mode: 'any' }),
    UseGuards(PermissionsGuard),
  );

/**
 * Type definition for permission metadata
 */
export interface PermissionMetadata {
  permissions: string[];
  mode: 'all' | 'any';
}
