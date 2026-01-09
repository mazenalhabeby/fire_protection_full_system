import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UsersService } from '../users/users.service';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only image files (JPEG, PNG, WebP, GIF) are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG, WebP, GIF). Max 5MB.',
        },
      },
      required: ['avatar'],
    },
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.id;

    // Process and save the avatar
    const avatarPaths = await this.uploadService.processAndSaveAvatar(file, userId);

    // Update user's profile image URL in database
    const updatedUser = await this.usersService.updateProfileImage(
      userId,
      avatarPaths.original,
    );

    return {
      message: 'Avatar uploaded successfully',
      profileImageUrl: avatarPaths.original,
      thumbnailUrl: avatarPaths.thumbnail,
      user: updatedUser,
    };
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user avatar' })
  async deleteAvatar(@Req() req: any) {
    const userId = req.user.id;

    // Delete avatar files
    await this.uploadService.deleteUserAvatars(userId);

    // Update user's profile image URL to null
    const updatedUser = await this.usersService.updateProfileImage(userId, null);

    return {
      message: 'Avatar deleted successfully',
      user: updatedUser,
    };
  }
}
