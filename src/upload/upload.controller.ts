import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload.dto';

/**
 * Upload Controller
 * Handles file upload endpoints
 */
@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload a file (image)
   */
  @Post()
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an image file',
    description:
      'Upload an image file to MinIO storage. Supported formats: JPEG, PNG, GIF. Max size: 5MB',
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
    example: {
      success: true,
      url: 'http://minio:9000/uploads/user-1-1710000000000.jpg',
      message: 'File uploaded successfully',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file too large',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ): Promise<UploadResponseDto> {
    return this.uploadService.uploadFile(req.user.userId, file);
  }
}
