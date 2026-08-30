/**
 * Upload Response DTO
 * @example
 * {
 *   "success": true,
 *   "url": "https://dashboard.iotee.id/storage/uploads/user-1-1710000000000.jpg"
 * }
 */
export class UploadResponseDto {
  success: boolean;
  url: string;
  message?: string;
}
