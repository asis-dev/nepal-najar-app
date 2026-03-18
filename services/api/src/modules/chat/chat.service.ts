import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
  }

  async chat(message: string, conversationId?: string) {
    const url = `${this.aiServiceUrl}/api/v1/ai/chat`;

    const body: Record<string, unknown> = { message };
    if (conversationId) {
      body.conversation_id = conversationId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(
          `AI service returned ${response.status}: ${errorText}`,
        );
        return {
          error: true,
          status: response.status,
          message: `AI service returned status ${response.status}`,
        };
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.logger.error('AI service is unreachable', error.message);
        return {
          error: true,
          message: 'AI service is currently unavailable. Please try again later.',
        };
      }

      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        this.logger.error('AI service request timed out');
        return {
          error: true,
          message: 'AI service request timed out. Please try again later.',
        };
      }

      this.logger.error('Unexpected error calling AI service', error);
      return {
        error: true,
        message: 'An unexpected error occurred while contacting the AI service.',
      };
    }
  }
}
