import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const typeormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'focusbot',
  password: process.env.DB_PASSWORD || 'focusbot_password',
  database: process.env.DB_DATABASE || 'focusbot',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
};

export default typeormConfig;

export const AppDataSource = new DataSource(typeormConfig);
