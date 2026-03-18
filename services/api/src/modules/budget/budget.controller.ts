import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('budget')
@Controller('budget')
export class BudgetController {}
