import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleResponseDto,
  PermissionDto,
  PermissionGroupDto,
} from './dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private permissionsGuard: PermissionsGuard,
  ) {}

  /**
   * Get all roles with their permissions
   */
  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  }

  /**
   * Get a single role by ID
   */
  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Create a new role
   */
  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check for duplicate name or slug
    const existing = await this.prisma.role.findFirst({
      where: {
        OR: [{ name: dto.name }, { slug: dto.slug }],
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.name === dto.name
          ? 'A role with this name already exists'
          : 'A role with this slug already exists',
      );
    }

    // Verify all permission IDs exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('Some permission IDs are invalid');
    }

    // Create role with permissions
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        color: dto.color,
        isSystem: false,
        permissions: {
          create: dto.permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Update an existing role
   */
  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check for duplicate name
    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    // If updating permissions, verify all IDs exist
    if (dto.permissionIds) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
      });

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('Some permission IDs are invalid');
      }
    }

    // Update role
    const updatedRole = await this.prisma.$transaction(async (tx) => {
      // Update basic role info
      const updated = await tx.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          color: dto.color,
          isActive: dto.isActive,
        },
      });

      // Update permissions if provided
      if (dto.permissionIds) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Create new permissions
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }

      // Clear permission cache for all users with this role
      const usersWithRole = await tx.user.findMany({
        where: { roleId: id },
        select: { id: true },
      });

      for (const user of usersWithRole) {
        this.permissionsGuard.clearUserCache(user.id);
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      });
    });

    return {
      ...updatedRole!,
      permissions: updatedRole!.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Delete a role
   */
  async delete(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${role._count.users} assigned user(s). Reassign users first.`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
  }

  /**
   * Get all permissions grouped by module
   */
  async getAllPermissions(): Promise<PermissionGroupDto[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group by module
    const groupedMap = new Map<string, PermissionDto[]>();

    for (const permission of permissions) {
      if (!groupedMap.has(permission.module)) {
        groupedMap.set(permission.module, []);
      }
      groupedMap.get(permission.module)!.push(permission);
    }

    return Array.from(groupedMap.entries()).map(([module, perms]) => ({
      module,
      permissions: perms,
    }));
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!role.isActive) {
      throw new BadRequestException('Cannot assign an inactive role');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });

    // Clear permission cache for this user
    this.permissionsGuard.clearUserCache(userId);
  }

  /**
   * Remove role from a user
   */
  async removeRoleFromUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: null },
    });

    // Clear permission cache for this user
    this.permissionsGuard.clearUserCache(userId);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    return this.permissionsGuard.getUserPermissions(userId);
  }

  /**
   * Check if user has specific permission(s)
   */
  async hasPermission(
    userId: string,
    permissions: string | string[],
    mode: 'all' | 'any' = 'all',
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    const requiredPermissions = Array.isArray(permissions)
      ? permissions
      : [permissions];

    if (mode === 'all') {
      return requiredPermissions.every((p) => userPermissions.includes(p));
    }

    return requiredPermissions.some((p) => userPermissions.includes(p));
  }
}
