import {
  Controller,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  Put,
  Post,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserSettingsService } from './user-settings.service';
import {
  UpdateUserSettingsDto,
  UserSettingsDto,
  ChangePasswordDto,
  SubscribeDto,
} from './dto/user-settings.dto';

/**
 * User Settings Controller
 * Handles user profile management endpoints
 */
@ApiTags('User Settings')
@Controller('settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  /**
   * Get user settings
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user settings',
    description: 'Retrieve the authenticated user\'s profile settings',
  })
  @ApiResponse({
    status: 200,
    description: 'User settings',
    type: UserSettingsDto,
    example: {
      username: 'john_doe',
      app_name: 'IoTEE3 Dashboard',
      dashboard_bg_url: 'https://storage.example.com/bg.jpg',
      cover_logo_1_url: 'https://storage.example.com/logo1.png',
      cover_logo_2_url: 'https://storage.example.com/logo2.png',
      cover_logo_3_url: 'https://storage.example.com/logo3.png',
      cover_logo_4_url: 'https://storage.example.com/logo4.png',
      cover_logo_5_url: 'https://storage.example.com/logo5.png',
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserSettings(@Req() req: any): Promise<UserSettingsDto> {
    return this.userSettingsService.getUserSettings(req.user.userId);
  }

  /**
   * Update user settings
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update user settings',
    description: 'Update the authenticated user\'s profile and preferences',
  })
  @ApiBody({
    type: UpdateUserSettingsDto,
    examples: {
      example1: {
        value: {
          appName: 'My IoTEE3 Dashboard',
          userName: 'john_updated',
          dashboardBg: 'https://storage.example.com/new-bg.jpg',
          coverLogo1: 'https://storage.example.com/new-logo1.png',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    schema: {
      example: { message: 'Settings updated successfully' },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserSettings(
    @Body() updateSettingsDto: UpdateUserSettingsDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.userSettingsService.updateUserSettings(
      req.user.userId,
      updateSettingsDto,
    );
  }



  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
      summary: 'Change user password',
      description: 'Allows an authenticated user to change their password.',
  })
  @ApiBody({
      type: ChangePasswordDto,
      examples: {
          example1: {
              value: {
                  oldPassword: 'current_password',
                  newPassword: 'new_strong_password',
              },
          },
      },
  })
  @ApiResponse({
      status: 200,
      description: 'Password changed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect old password' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async changePassword(
      @Body() changePasswordDto: ChangePasswordDto,
      @Req() req: any,
  ): Promise<{ message: string }> {
      return this.userSettingsService.changePassword(
          req.user.userId,
          changePasswordDto,
      );
  }



  @Post('unlink-google')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Unlink Google account',
    description: 'Allows an authenticated user to unlink their Google account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Google account unlinked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unlinkGoogle(@Req() req: any): Promise<{ message: string }> {
    return this.userSettingsService.unlinkGoogle(req.user.userId);
  }
}
