import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
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
}
