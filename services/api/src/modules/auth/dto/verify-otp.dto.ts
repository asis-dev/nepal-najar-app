import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number (E.164) or email address',
    example: '+9779812345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(\+?[1-9]\d{6,14}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
    { message: 'identifier must be a valid phone number or email address' },
  )
  identifier: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '482913',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}
