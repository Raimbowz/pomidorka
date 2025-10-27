import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Method } from '../../entities/method.entity';

export interface CreateMethodDto {
  name: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
  autoContinue?: boolean;
  warningBeforeEnd?: number;
  userId?: number;
}

@Injectable()
export class MethodService implements OnModuleInit {
  constructor(
    @InjectRepository(Method)
    private methodRepository: Repository<Method>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  private async seedDefaultTemplates() {
    const templates = [
      {
        name: 'Pomodoro',
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        cyclesBeforeLongBreak: 4,
        autoContinue: false,
        warningBeforeEnd: 1,
        isTemplate: true,
      },
      {
        name: '52/17',
        workDuration: 52,
        shortBreakDuration: 17,
        longBreakDuration: 17,
        cyclesBeforeLongBreak: 1,
        autoContinue: false,
        warningBeforeEnd: 2,
        isTemplate: true,
      },
      {
        name: 'Ultradian',
        workDuration: 90,
        shortBreakDuration: 20,
        longBreakDuration: 20,
        cyclesBeforeLongBreak: 1,
        autoContinue: false,
        warningBeforeEnd: 5,
        isTemplate: true,
      },
      {
        name: 'Short Focus',
        workDuration: 15,
        shortBreakDuration: 3,
        longBreakDuration: 10,
        cyclesBeforeLongBreak: 3,
        autoContinue: false,
        warningBeforeEnd: 1,
        isTemplate: true,
      },
    ];

    for (const template of templates) {
      const existing = await this.methodRepository.findOne({
        where: { name: template.name, isTemplate: true },
      });
      if (!existing) {
        await this.methodRepository.save(template);
      }
    }
  }

  async getTemplates(): Promise<Method[]> {
    return this.methodRepository.find({
      where: { isTemplate: true },
      order: { name: 'ASC' },
    });
  }

  async getUserMethods(userId: number): Promise<Method[]> {
    return this.methodRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Method | null> {
    return this.methodRepository.findOne({ where: { id } });
  }

  async create(dto: CreateMethodDto): Promise<Method> {
    const method = this.methodRepository.create({
      ...dto,
      isTemplate: false,
    });
    return this.methodRepository.save(method);
  }

  async createFromTemplate(templateId: number, userId: number, customName?: string): Promise<Method> {
    const template = await this.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const method = this.methodRepository.create({
      name: customName || template.name,
      workDuration: template.workDuration,
      shortBreakDuration: template.shortBreakDuration,
      longBreakDuration: template.longBreakDuration,
      cyclesBeforeLongBreak: template.cyclesBeforeLongBreak,
      autoContinue: template.autoContinue,
      warningBeforeEnd: template.warningBeforeEnd,
      userId,
      isTemplate: false,
    });

    return this.methodRepository.save(method);
  }

  async update(id: number, updates: Partial<CreateMethodDto>): Promise<Method> {
    await this.methodRepository.update(id, updates);
    const method = await this.findById(id);
    if (!method) {
      throw new Error('Method not found');
    }
    return method;
  }

  async delete(id: number): Promise<void> {
    await this.methodRepository.delete(id);
  }
}
