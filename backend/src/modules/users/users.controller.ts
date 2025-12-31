import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto, UserChangePasswordDto, UpdateUsernameDto, CheckUsernameDto } from './dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns all users' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.usersService.findAll(page, limit);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: UserChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  // ============================================
  // USERNAME MANAGEMENT
  // ============================================

  @Get('username/check/:username')
  @ApiOperation({ summary: 'Check if username is available' })
  @ApiParam({ name: 'username', description: 'Username to check' })
  @ApiResponse({ status: 200, description: 'Returns availability status' })
  async checkUsernameAvailability(
    @Param('username') username: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.checkUsernameAvailability(username, userId);
  }

  @Patch('username')
  @ApiOperation({ summary: 'Set or update username' })
  @ApiResponse({ status: 200, description: 'Username updated successfully' })
  @ApiResponse({ status: 409, description: 'Username is already taken' })
  async updateUsername(
    @CurrentUser('id') userId: string,
    @Body() updateUsernameDto: UpdateUsernameDto,
  ) {
    return this.usersService.updateUsername(userId, updateUsernameDto);
  }

  @Get('lookup/username/:username')
  @ApiOperation({ summary: 'Find user by username (for transfers)' })
  @ApiParam({ name: 'username', description: 'Username to lookup' })
  @ApiResponse({ status: 200, description: 'Returns user info if found' })
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return { found: false, user: null };
    }
    return {
      found: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
          : `@${user.username}`,
      },
    };
  }

  @Get('lookup/id/:userId')
  @ApiOperation({ summary: 'Find user by ID (for transfers)' })
  @ApiParam({ name: 'userId', description: 'User ID to lookup' })
  @ApiResponse({ status: 200, description: 'Returns user info if found' })
  async findByUserId(@Param('userId') userId: string) {
    const user = await this.usersService.findByUserId(userId);
    if (!user) {
      return { found: false, user: null };
    }
    return {
      found: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
          : user.username ? `@${user.username}` : `User ${user.id.slice(0, 8)}`,
      },
    };
  }
}
