
import { IsString, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    token: string;

    @IsString()
    @IsNotEmpty()
    password;
}

export class SetPasswordDto {
    @IsString()
    @IsNotEmpty()
    password;

    @IsString()
    @IsNotEmpty()
    username: string;
}
