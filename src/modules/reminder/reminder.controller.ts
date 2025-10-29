import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ReminderService, CreateReminderDto, UpdateReminderDto } from './reminder.service';

@Controller('api/reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateReminderDto) {
    return this.reminderService.create(dto);
  }

  @Get('user/:userId')
  async findAllByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.reminderService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const reminder = await this.reminderService.findById(id);
    if (!reminder) {
      throw new Error('Reminder not found');
    }
    return reminder;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminderService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.reminderService.delete(id);
  }

  @Post(':id/toggle')
  async toggle(@Param('id', ParseIntPipe) id: number) {
    return this.reminderService.toggleActive(id);
  }

  @Get('user/:userId/stats')
  async getStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.reminderService.getUserStats(userId);
  }

  @Get(':id/history')
  async getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.reminderService.getReminderHistory(id, limit);
  }
}
