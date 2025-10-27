import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByTelegramId(telegramUserId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { telegramUserId },
      relations: ['defaultMethod'],
    });
  }

  async create(telegramUserId: number, timezone?: string): Promise<User> {
    const user = this.userRepository.create({
      telegramUserId,
      timezone: timezone || 'UTC',
      settings: {
        enableWarnings: true,
        soundEnabled: true,
        language: 'ru',
      },
    });
    return this.userRepository.save(user);
  }

  async findOrCreate(telegramUserId: number, timezone?: string): Promise<User> {
    let user = await this.findByTelegramId(telegramUserId);
    if (!user) {
      user = await this.create(telegramUserId, timezone);
    }
    return user;
  }

  async updateSettings(userId: number, settings: Partial<User['settings']>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    user.settings = { ...user.settings, ...settings };
    return this.userRepository.save(user);
  }

  async setDefaultMethod(userId: number, methodId: number): Promise<User> {
    await this.userRepository.update(userId, { defaultMethodId: methodId });
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['defaultMethod'] });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateTimezone(userId: number, timezone: string): Promise<User> {
    await this.userRepository.update(userId, { timezone });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
