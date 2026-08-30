import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import {
  UpdateUserSettingsDto,
  UserSettingsDto,
  ChangePasswordDto,
  SubscribeDto,
} from './dto/user-settings.dto';
import * as bcrypt from 'bcryptjs';

/**
 * User Settings Service
 * Handles user profile and settings management
 */
@Injectable()
export class UserSettingsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get user settings
   * @param userId - The user's ID
   * @returns User settings
   */
  async getUserSettings(userId: number): Promise<UserSettingsDto> {
      const numericId = typeof userId === 'string' ? parseInt(userId, 10) : userId; // ✅ Add this

    const query = `
      SELECT 
        u.username, 
        u.auth_provider,
        u.password_hash IS NOT NULL as "isPasswordSet",
        up.app_name, 
        up.dashboard_bg_url,
        up.cover_logo_1_url,
        up.cover_logo_2_url,
        up.cover_logo_3_url,
        up.cover_logo_4_url,
        up.cover_logo_5_url,
        u.packet,
        u.packet_type,
        u.start_time,
        u.end_time
      FROM users u 
      JOIN user_profiles up ON u.user_id = up.user_id 
      WHERE u.user_id = $1
    `;

    try {
      const result = await this.dbService.query(query, [numericId]);
      if (result.rows.length === 0) {
        throw new NotFoundException('User not found');
      }
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to fetch user settings: ${error.message}`);
    }
  }

  async confirmSubscription(userId: number, packetType: number, orderId?: string) {
    if (![1, 2, 3, 4].includes(packetType)) {
      throw new BadRequestException('packetType must be between 1 and 4');
    }

    const client = await this.dbService.getClient();
    try {
      await client.query('BEGIN');
      const now = new Date();
      const endDate = new Date(now);
      
      // Period map: Packet 1=1mo, 2=3mo, 3=6mo, 4=12mo
      const periodMap = { 1: 1, 2: 3, 3: 6, 4: 12 };
      const months = periodMap[packetType];
      endDate.setMonth(endDate.getMonth() + months);

      const updateQuery = `
        UPDATE users
        SET packet = true,
            packet_type = $1,
            start_time = $2,
            end_time = $3
        WHERE user_id = $4
      `;
      await client.query(updateQuery, [packetType, now, endDate, userId]);
      await client.query('COMMIT');
      return { message: 'Subscription confirmed successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Failed to confirm subscription: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update user settings
   * @param userId - The user's ID
   * @param updateSettingsDto - Updated settings
   * @returns Updated settings
   */
  async updateUserSettings(
    userId: number,
    updateSettingsDto: UpdateUserSettingsDto,
  ): Promise<{ message: string }> {
    const client = await this.dbService.getClient();

    try {
      await client.query('BEGIN');

      // Update username if provided
      if (updateSettingsDto.userName) {
        const usernameQuery = 'UPDATE users SET username = $1 WHERE user_id = $2';
        await client.query(usernameQuery, [
          updateSettingsDto.userName,
          userId,
        ]);
      }

      const dtoToDbMap = {
        appName: 'app_name',
        dashboardBg: 'dashboard_bg_url',
        coverLogo1: 'cover_logo_1_url',
        coverLogo2: 'cover_logo_2_url',
        coverLogo3: 'cover_logo_3_url',
        coverLogo4: 'cover_logo_4_url',
        coverLogo5: 'cover_logo_5_url',
      };

      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      for (const key in dtoToDbMap) {
        if (key in updateSettingsDto) {
          const dbField = dtoToDbMap[key];
          const value = updateSettingsDto[key];
          updateFields.push(`${dbField} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      }
      
      // Update user_profiles if there are fields to update
      if (updateFields.length > 0) {
        queryParams.push(userId);
        const profileUpdateQuery = `
          UPDATE user_profiles 
          SET ${updateFields.join(', ')}
          WHERE user_id = $${paramIndex}
        `;
        await client.query(profileUpdateQuery, queryParams);
      }

      await client.query('COMMIT');

      return { message: 'Settings updated successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update user settings: ${error.message}`);
    } finally {
      client.release();
    }
  }
  
  async changePassword(
      userId: number,
      changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
      const { oldPassword, newPassword } = changePasswordDto;

      const client = await this.dbService.getClient();
      try {
          const userQuery = 'SELECT password_hash FROM users WHERE user_id = $1';
          const userResult = await client.query(userQuery, [userId]);

          if (userResult.rows.length === 0) {
              throw new NotFoundException('User not found');
          }

          const user = userResult.rows[0];
          const isPasswordMatching = await bcrypt.compare(oldPassword, user.password_hash);

          if (!isPasswordMatching) {
              throw new UnauthorizedException('Incorrect old password');
          }

          const newPasswordHash = await bcrypt.hash(newPassword, 10);
          const updateQuery = 'UPDATE users SET password_hash = $1 WHERE user_id = $2';
          await client.query(updateQuery, [newPasswordHash, userId]);

          return { message: 'Password changed successfully' };
      } catch (error) {
          if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
              throw error;
          }
          throw new Error(`Failed to change password: ${error.message}`);
      } finally {
          client.release();
      }
  }

  async unlinkGoogle(userId: number): Promise<{ message: string }> {
    const client = await this.dbService.getClient();
    try {
      const userQuery = 'SELECT password_hash FROM users WHERE user_id = $1';
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const user = userResult.rows[0];
      if (!user.password_hash) {
        throw new UnauthorizedException('You cannot unlink your Google account without a password set.');
      }

      const updateQuery = `UPDATE users SET auth_provider = 'email', google_id = NULL WHERE user_id = $1`;
      await client.query(updateQuery, [userId]);

      return { message: 'Google account unlinked successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new Error(`Failed to unlink Google account: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
