import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './chat.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a message to the AI assistant' })
  @ApiBody({ type: ChatRequestDto })
  async chat(@Body() dto: ChatRequestDto) {
    return this.chatService.chat(dto.message, dto.conversation_id);
  }
}
