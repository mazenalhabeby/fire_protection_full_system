import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  RoleResponseDto,
  PermissionGroupDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Get all roles with permissions and user counts
   */
  @Get()
  @RequirePermissions('roles.view')
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  /**
   * Get all available permissions grouped by module
   */
  @Get('permissions')
  @RequirePermissions('roles.view')
  async getAllPermissions(): Promise<PermissionGroupDto[]> {
    return this.rolesService.getAllPermissions();
  }

  /**
   * Get a single role by ID
   */
  @Get(':id')
  @RequirePermissions('roles.view')
  async findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  /**
   * Create a new role
   */
  @Post()
  @RequirePermissions('roles.create')
  async create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(dto);
  }

  /**
   * Update an existing role
   */
  @Patch(':id')
  @RequirePermissions('roles.edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto);
  }

  /**
   * Delete a role
   */
  @Delete(':id')
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.rolesService.delete(id);
  }

  /**
   * Assign a role to a user
   */
  @Patch('users/:userId/assign')
  @RequirePermissions('roles.assign')
  async assignRole(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ): Promise<{ message: string }> {
    await this.rolesService.assignRoleToUser(userId, dto.roleId);
    return { message: 'Role assigned successfully' };
  }

  /**
   * Remove role from a user
   */
  @Delete('users/:userId/role')
  @RequirePermissions('roles.assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(@Param('userId') userId: string): Promise<void> {
    return this.rolesService.removeRoleFromUser(userId);
  }
}
