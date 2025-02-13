/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

import { CallService } from './call.service';

@WebSocketGateway({ path: 'media-stream' })
export class CallGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;
  private logger: Logger = new Logger('CallGateway');
  constructor(private readonly callService: CallService) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(ws: WebSocket) {
    const elevenLabsWs = new WebSocket(
      `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
    );
    this.callService.initializeElevenLabsWebSocket(elevenLabsWs);
    this.callService.initializeTwilioWebSocket(ws);
  }

  handleDisconnect(ws: WebSocket) {
    this.logger.log('Client disconnected');
    this.callService.elevenLabsWs.close();
  }
}
