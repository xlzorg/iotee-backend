import { TokenResponseDto } from './auth.response.dto';

export class LoginResponseDto {
  tokens: TokenResponseDto;
  message: string;
}
