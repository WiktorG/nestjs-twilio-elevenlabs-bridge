import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CallModule } from './call/call.module';

@Module({
  imports: [ConfigModule.forRoot(), CallModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
