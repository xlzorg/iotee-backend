import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for successful authentication responses (login, register, refresh).
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'The short-lived access token for API authentication.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'The long-lived refresh token used to obtain a new access token.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwianRpIjoiZGNjYjY3MjUtYjZkYS00ZDIzLTg0NTMtYjYyY2EyYjI2NGI5IiwiaWF0IjoxNTE2MjM5MDIyfQ.y_U_5ddLdeV5V_VgM5JStf6jGzGk3pZqJzJ-a-b-c-d',
  })
  refreshToken: string;
}

/**
 * DTO for the logout response.
 */
export class LogoutResponseDto {
  @ApiProperty({
    description: 'A message confirming successful logout.',
    example: 'Logout successful',
  })
  message: string;
}