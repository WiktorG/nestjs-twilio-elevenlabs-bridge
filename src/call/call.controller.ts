import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CallService } from './call.service';

@Controller({ path: 'twilio' })
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Get('forward')
  forwardCall() {
    console.log('Endpoint was hit!');
  }

  @Get('inbound_call')
  incomingCall(@Req() req: Request, @Res() res: Response) {
    this.callService.getIncomingCall(req, res);
  }
}
