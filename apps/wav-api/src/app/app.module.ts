import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma';
import { WavModule } from './wav';

@Module({
  imports: [PrismaModule, WavModule],
})
export class AppModule {}
