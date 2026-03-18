import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventMap } from './event-payloads';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a type-safe domain event with an automatic timestamp.
   * The timestamp on the payload is set at emit-time if not already present.
   */
  emit<K extends keyof DomainEventMap>(
    eventName: K,
    payload: Omit<DomainEventMap[K], 'timestamp'> & { timestamp?: Date },
  ): void {
    const enrichedPayload = {
      ...payload,
      timestamp: payload.timestamp ?? new Date(),
    };

    this.logger.debug(`Emitting domain event: ${eventName}`);
    this.eventEmitter.emit(eventName, enrichedPayload);
  }
}
