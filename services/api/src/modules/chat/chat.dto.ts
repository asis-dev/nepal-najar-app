import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({ description: 'The user message to send to the AI' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Conversation ID to continue an existing conversation' })
  @IsString()
  @IsOptional()
  conversation_id?: string;
}
