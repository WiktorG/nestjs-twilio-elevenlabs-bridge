import { Injectable } from '@nestjs/common';
import { Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebSocket } from 'ws';
import * as Twilio from 'twilio';

import {
  ElevenLabsServerMessage,
  isElevenLabsServerMessage,
  isTwilioMessage,
  TwilioServerMessage,
} from './call.types';

@Injectable()
export class CallService {
  twilioWs: WebSocket;
  elevenLabsWs: WebSocket;
  callSid: string;
  streamSid: string;

  getIncomingCall(@Req() req: Request, @Res() res: Response) {
    const response = new Twilio.twiml.VoiceResponse();

    response.connect().stream({
      name: 'Custom media stream',
      url: `wss://${req.headers.host}/media-stream`,
    });

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(response.toString());
  }

  redirectCurrentCall() {
    setTimeout(() => {
      const twilioClient = Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      const countryCode = process.env.REDIRECT_COUNTRY_CODE ?? '+48';
      const phoneNumber = encodeURIComponent(
        `${countryCode}${process.env.REDIRECT_TO_PHONE_NUMBER}`,
      );

      twilioClient
        .calls(this.callSid)
        .update({
          method: 'POST',
          url: `https://twimlets.com/forward?PhoneNumber=${phoneNumber}&Timeout=30s`,
        })
        .then((call) => {
          console.log(call);
        })
        .catch((error) => console.error(error));
    }, 5000);
  }

  initializeTwilioWebSocket(ws: WebSocket) {
    this.twilioWs = ws;

    this.twilioWs.on('message', (data: string) => {
      const message: unknown = JSON.parse(data);
      if (!isTwilioMessage(message)) return;

      this.handleTwilioMessage(message);
    });
  }

  handleTwilioMessage(message: TwilioServerMessage) {
    try {
      switch (message.event) {
        case 'start':
          // Store Stream SID when stream starts
          this.streamSid = message.streamSid;
          this.callSid = message.start.callSid;
          console.log(`[Twilio] Stream started with ID: ${this.streamSid}`);
          break;
        case 'media':
          // Route audio from Twilio to ElevenLabs
          if (this.elevenLabsWs.readyState === WebSocket.OPEN) {
            // data.media.payload is base64 encoded
            const audioMessage = {
              user_audio_chunk: Buffer.from(
                message.media.payload,
                'base64',
              ).toString('base64'),
            };
            this.elevenLabsWs.send(JSON.stringify(audioMessage));
          }
          break;
        case 'stop':
          // Close ElevenLabs WebSocket when Twilio stream stops
          this.elevenLabsWs.close();
          break;
        default:
          console.log(
            `[Twilio] Received unhandled event: ${JSON.stringify(message)}`,
          );
      }
    } catch (error) {
      console.error('[Twilio] Error processing message:', error);
    }
  }

  initializeElevenLabsWebSocket(ws: WebSocket) {
    this.elevenLabsWs = ws;

    this.elevenLabsWs.on('open', () => {
      console.log('[II] Connected to Conversational AI.');
    });

    this.elevenLabsWs.on('message', (data: string) => {
      try {
        const message: unknown = JSON.parse(data);
        if (!isElevenLabsServerMessage(message))
          throw new Error(
            `Unhandled message format ${JSON.stringify(message)}`,
          );

        this.handleElevenLabsMessage(message);
      } catch (error) {
        console.error('[II] Error parsing message:', error);
      }
    });

    // Handle errors from ElevenLabs WebSocket
    this.elevenLabsWs.on('error', (error) => {
      console.error('[II] WebSocket error:', error);
    });

    // Handle close event for ElevenLabs WebSocket
    this.elevenLabsWs.on('close', () => {
      console.log('[II] Disconnected.');
    });
  }

  handleElevenLabsMessage = (message: ElevenLabsServerMessage) => {
    switch (message.type) {
      case 'conversation_initiation_metadata':
        break;
      case 'client_tool_call':
        if (message.client_tool_call.tool_name === 'redirect_call') {
          this.redirectCurrentCall();
        }

        break;
      case 'audio':
        if (message.audio_event?.audio_base_64) {
          // Send audio data to Twilio
          const audioData = {
            event: 'media',
            streamSid: this.streamSid,
            media: {
              payload: message.audio_event.audio_base_64,
            },
          };
          this.twilioWs.send(JSON.stringify(audioData));
        }
        break;
      case 'interruption':
        // Clear Twilio's audio queue
        this.twilioWs.send(
          JSON.stringify({ event: 'clear', streamSid: this.streamSid }),
        );
        break;
      case 'ping':
        // Respond to ping events from ElevenLabs
        if (message.ping_event?.event_id) {
          const pongResponse = {
            type: 'pong',
            event_id: message.ping_event.event_id,
          };
          this.elevenLabsWs.send(JSON.stringify(pongResponse));
        }
        break;
    }
  };
}
