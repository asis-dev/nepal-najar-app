import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('escalations')
@Controller('escalations')
export class EscalationsController {}
