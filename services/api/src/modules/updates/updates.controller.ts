import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('updates')
@Controller('updates')
export class UpdatesController {}
