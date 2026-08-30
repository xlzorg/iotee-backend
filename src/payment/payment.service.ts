import { Injectable, InternalServerErrorException, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import * as crypto from 'crypto';

/**
 * Payment Service
 * Handles Midtrans payment processing and verification
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dbService: DatabaseService,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  /**
   * Create a Midtrans transaction token for payment
   * @param userId - User ID requesting payment
   * @param packetType - Type of subscription packet (1-4)
   * @returns Snap token and order ID
   */
  /**
   * Create Midtrans Transaction & Save to Database
   */
  async createMidtransTransaction(userId: number, packetType: number) {
    if (![1, 2, 3, 4].includes(packetType)) {
      throw new BadRequestException('Invalid packet type');
    }

    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    const baseUrl = 'https://app.sandbox.midtrans.com'; // Change for production

    // 1. Calculate Details
    const priceMap = { 1: 20000, 2: 40000, 3: 68000, 4: 120000 };
    const periodMap = { 1: 1, 2: 3, 3: 6, 4: 12 };
    const grossAmount = priceMap[packetType];
    const orderId = `IOTEE-${packetType}-${periodMap[packetType]}M-${userId}-${Date.now()}`;

    try {
      // 2. Fetch User Info
      const userRes = await this.dbService.query('SELECT email, username FROM users WHERE user_id = $1', [userId]);
      if (userRes.rows.length === 0) throw new BadRequestException('User not found');
      const user = userRes.rows[0];

      // 3. Request Token from Midtrans
      const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: grossAmount },
          customer_details: { first_name: user.username, email: user.email },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new InternalServerErrorException(data.error_messages?.[0] || 'Midtrans Error');

      // 4. PERSISTENCE: Save to our internal transactions table
      const saveQuery = `
        INSERT INTO transactions (order_id, user_id, snap_token, amount, status, packet_type)
        VALUES ($1, $2, $3, $4, 'pending', $5)
      `;
      await this.dbService.query(saveQuery, [orderId, userId, data.token, grossAmount, packetType]);

      return { snapToken: data.token, orderId };
    } catch (error) {
      throw new InternalServerErrorException(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Verify Midtrans webhook signature and process payment
   * @param payload - Webhook payload from Midtrans
   * @param signature - Webhook signature header
   * @returns Confirmation message
   */
 /**
   * Improved Webhook: Verifies signature and updates TWO tables
   */
  async verifyMidtransWebhook(payload: any, signature: string): Promise<{ message: string }> {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    
    // 1. Signature Verification
    const signatureString = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
    const expectedSignature = crypto.createHash('sha512').update(signatureString).digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid signature');
    }

    const orderId = payload.order_id;
    const status = payload.transaction_status;

    // 2. Update Transaction Log Table
    await this.dbService.query(
      'UPDATE transactions SET status = $1 WHERE order_id = $2',
      [status, orderId]
    );

    // 3. If Paid, Update User Subscription
    if (status === 'settlement' || status === 'capture') {
      const parts = orderId.split('-');
      const packetType = parseInt(parts[1], 10);
      const userId = parseInt(parts[3], 10);
      
      return this.userSettingsService.confirmSubscription(userId, packetType, orderId);
    }

    return { message: `Status updated to ${status}` };
  }

  /**
   * Get transaction status from Midtrans
   * @param orderId - Order ID to check
   * @returns Transaction status details
   */
  async getTransactionStatus(orderId: string): Promise<any> {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const baseUrl = isProduction ? 'https://app.sandbox.midtrans.com' : 'https://api.sandbox.midtrans.com';

    if (!serverKey) {
      throw new InternalServerErrorException('Midtrans server key is not configured');
    }

    try {
      const response = await fetch(`${baseUrl}/v2/${orderId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new InternalServerErrorException(`Midtrans API error: ${errorText}`);
      }

      const data = await response.json();
      return {
        orderId: data.order_id,
        transactionStatus: data.transaction_status,
        transactionId: data.transaction_id,
        fraudStatus: data.fraud_status,
        grossAmount: data.gross_amount,
        paymentType: data.payment_type,
        merchantId: data.merchant_id,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to get transaction status: ${error.message}`);
    }
  }

/**
   * Fetch Transaction History for the UI
   */
  async getTransactionHistory(userId: number) {
    const query = `
      SELECT 
        order_id as "orderId", 
        snap_token as "snapToken", 
        amount, 
        status, 
        created_at as "createdAt"
      FROM transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.dbService.query(query, [userId]);
    return result.rows;
  }

}
