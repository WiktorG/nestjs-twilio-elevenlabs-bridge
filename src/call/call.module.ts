import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CallController } from './call.controller';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [CallController],
  providers: [CallService, CallGateway],
})
export class CallModule {}
