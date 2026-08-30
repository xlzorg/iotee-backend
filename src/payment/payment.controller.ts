import {
  Controller,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  Post,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { SubscribeDto } from '../user-settings/dto/user-settings.dto';

/**
 * Payment Controller
 * Handles Midtrans transactions and billing history
 */
@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  /**
   * Get User Transaction History
   * This is used by the Transaction Page to show history and pending payments
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user transaction history',
    description: 'Retrieve all past and pending transactions for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of transactions retrieved successfully',
    schema: {
      example: [
        {
          orderId: 'IOTEE-1-1M-45-1712756400000',
          snapToken: '5f3c...8e21',
          amount: '20000.00',
          status: 'pending',
          createdAt: '2026-04-15T10:00:00Z',
        },
        {
          orderId: 'IOTEE-2-3M-45-1612756400000',
          snapToken: 'a1b2...c3d4',
          amount: '40000.00',
          status: 'settlement',
          createdAt: '2026-03-10T08:30:00Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(@Req() req: any) {
    return this.paymentService.getTransactionHistory(req.user.userId);
  }

  @Post('transaction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Midtrans payment transaction token',
    description: 'Generate a Midtrans Snap token and save the initial transaction as pending in the database.',
  })
  @ApiBody({
    type: SubscribeDto,
    examples: {
      example1: {
        value: { packetType: 1 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Midtrans token generated and transaction saved',
    schema: {
      example: { 
        snapToken: 'YOUR_SNAP_TOKEN', 
        orderId: 'IOTEE-1-1M-45-1650000000000' 
      },
    },
  })
  async createTransaction(
    @Body() body: SubscribeDto,
    @Req() req: any,
  ) {
    return this.paymentService.createMidtransTransaction(req.user.userId, body.packetType);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Manual confirmation (Fallback)',
    description: 'Used if the webhook is delayed. Mark the user as subscribed based on orderId.',
  })
  @ApiBody({ type: SubscribeDto })
  @ApiResponse({ status: 200, description: 'Subscription confirmed' })
  async confirmSubscription(
    @Body() body: SubscribeDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.userSettingsService.confirmSubscription(
      req.user.userId,
      body.packetType,
      body.orderId,
    );
  }

  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Midtrans transaction status',
    description: 'Directly query Midtrans API for the current state of a specific order.',
  })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  async getStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getTransactionStatus(orderId);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Midtrans webhook handler',
    description: 'Receives async notifications from Midtrans. Updates both the transaction log and the user subscription status.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(@Req() req: any): Promise<{ message: string }> {
    const signature = req.headers['x-midtrans-signature'] || req.body.signature_key;
    if (!signature) {
      throw new UnauthorizedException('Missing Midtrans signature');
    }
    return this.paymentService.verifyMidtransWebhook(req.body, signature);
  }
}