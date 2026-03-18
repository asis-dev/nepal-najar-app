import { PartialType } from '@nestjs/swagger';
import { CreateBlockerDto } from './create-blocker.dto';

export class UpdateBlockerDto extends PartialType(CreateBlockerDto) {}
