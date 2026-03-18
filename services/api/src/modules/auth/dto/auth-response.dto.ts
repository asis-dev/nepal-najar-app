import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived access token (JWT)' })
  access_token: string;

  @ApiProperty({ description: 'Long-lived refresh token (JWT)' })
  refresh_token: string;

  @ApiProperty({ description: 'Access token type', example: 'Bearer' })
  token_type: string;

  @ApiProperty({ description: 'Access token expiration in seconds', example: 900 })
  expires_in: number;
}

export class OtpRequestResponseDto {
  @ApiProperty({ description: 'Confirmation message' })
  message: string;

  @ApiProperty({ description: 'TTL in seconds before OTP expires', example: 300 })
  expires_in: number;

  @ApiPropertyOptional({ description: 'OTP code (only in development mode for testing)' })
  dev_otp?: string;
}

export class UserProfileDto {
  @ApiProperty({ description: 'User UUID' })
  id: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone_number: string | null;

  @ApiPropertyOptional({ description: 'Email address' })
  email: string | null;

  @ApiProperty({ description: 'Display name' })
  display_name: string;

  @ApiPropertyOptional({ description: 'Profile photo URL' })
  profile_photo_url: string | null;

  @ApiProperty({ description: 'Verification level' })
  verification_level: string;

  @ApiProperty({ description: 'Language preference' })
  language_preference: string;

  @ApiProperty({
    description: 'Roles assigned to the user',
    type: [String],
    example: ['project_officer'],
  })
  roles: string[];

  @ApiProperty({
    description: 'Government unit IDs the user is scoped to',
    type: [String],
  })
  government_unit_ids: string[];

  @ApiProperty({
    description: 'Permission keys aggregated from all roles',
    type: [String],
    example: ['project.create', 'project.update'],
  })
  permissions: string[];
}

export class LogoutResponseDto {
  @ApiProperty({ description: 'Confirmation message' })
  message: string;
}
