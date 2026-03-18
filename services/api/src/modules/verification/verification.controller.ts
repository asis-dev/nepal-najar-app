import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('verification')
@Controller('verification')
export class VerificationController {}
