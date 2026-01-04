import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PERMISSIONS_KEY,
  PermissionMetadata,
} from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  // Cache user permissions for the duration of a request
  private permissionCache: Map<string, string[]> = new Map();

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionMeta = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!permissionMeta || !permissionMeta.permissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Get user's permissions
    const userPermissions = await this.getUserPermissions(user.id);

    // Attach permissions to request for use in controllers
    request.userPermissions = userPermissions;

    const { permissions: requiredPermissions, mode } = permissionMeta;

    let hasAccess = false;

    if (mode === 'all') {
      // User must have ALL required permissions
      hasAccess = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
    } else {
      // User must have at least ONE of the required permissions
      hasAccess = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
    }

    if (!hasAccess) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        required: requiredPermissions,
        mode,
      });
    }

    return true;
  }

  /**
   * Get all permissions for a user based on their RBAC role
   * SECURITY: Legacy admin backdoor removed - all users must have proper RBAC roles
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    // Check cache first
    if (this.permissionCache.has(userId)) {
      return this.permissionCache.get(userId)!;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roleId: true,
        adminRole: {
          select: {
            isActive: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // If user has no role or role is inactive, return empty permissions
    if (!user?.adminRole || !user.adminRole.isActive) {
      return [];
    }

    const permissions = user.adminRole.permissions.map(
      (rp) => rp.permission.code,
    );

    // Cache the permissions
    this.permissionCache.set(userId, permissions);

    return permissions;
  }

  /**
   * Clear cache for a specific user (call after role changes)
   */
  clearUserCache(userId: string): void {
    this.permissionCache.delete(userId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }
}
