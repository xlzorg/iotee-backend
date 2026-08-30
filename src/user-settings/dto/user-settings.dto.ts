import { IsString, IsOptional, MaxLength, IsNotEmpty, IsBoolean, IsInt, Min, Max } from 'class-validator';

/**
 * Update User Settings DTO
 * @example
 * {
 *   "appName": "IoTEE3 Dashboard",
 *   "userName": "john_doe",
 *   "dashboardBg": "https://storage.example.com/bg.jpg",
 *   "coverLogo1": "https://storage.example.com/logo1.png",
 *   "coverLogo2": "https://storage.example.com/logo2.png",
 *   "coverLogo3": "https://storage.example.com/logo3.png",
 *   "coverLogo4": "https://storage.example.com/logo4.png",
 *   "coverLogo5": "https://storage.example.com/logo5.png"
 * }
 */
export class UpdateUserSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  userName?: string;

  @IsOptional()
  @IsString()
  dashboardBg?: string;

  @IsOptional()
  @IsString()
  coverLogo1?: string;

  @IsOptional()
  @IsString()
  coverLogo2?: string;

  @IsOptional()
  @IsString()
  coverLogo3?: string;

  @IsOptional()
  @IsString()
  coverLogo4?: string;

  @IsOptional()
  @IsString()
  coverLogo5?: string;
}

/**
 * User Settings Response DTO
 * @example
 * {
 *   "username": "john_doe",
 *   "app_name": "IoTEE3 Dashboard",
 *   "dashboard_bg_url": "https://storage.example.com/bg.jpg",
 *   "cover_logo_1_url": "https://storage.example.com/logo1.png",
 *   "cover_logo_2_url": "https://storage.example.com/logo2.png",
 *   "cover_logo_3_url": "https://storage.example.com/logo3.png",
 *   "cover_logo_4_url": "https://storage.example.com/logo4.png",
 *   "cover_logo_5_url": "https://storage.example.com/logo5.png",
 *   "packet": false,
 *   "packet_type": 1,
 *   "start_time": "2025-01-01T00:00:00.000Z",
 *   "end_time": "2026-01-01T00:00:00.000Z"
 * }
 */
export class UserSettingsDto {
  username: string;
  app_name: string;
  auth_provider: string;
  isPasswordSet: boolean;
  dashboard_bg_url?: string;
  cover_logo_1_url?: string;
  cover_logo_2_url?: string;
  cover_logo_3_url?: string;
  cover_logo_4_url?: string;
  cover_logo_5_url?: string;
  packet: boolean;
  packet_type: number;
  start_time: Date;
  end_time: Date;
}

export class SubscribeDto {
  @IsInt()
  @Min(0)
  @Max(4)
  packetType: number;

  @IsOptional()
  @IsString()
  orderId?: string;
}

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    oldPassword;

    @IsString()
    @IsNotEmpty()
    newPassword;
}
