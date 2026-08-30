import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getDashboardData(@Req() req) {
    console.log('[Dashboard] userId from token:', req.user); // ← add this sementara
    return this.dashboardService.getDashboardData(req.user.userId);
  }
}
