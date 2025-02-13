import { NestFactory } from '@nestjs/core';
import * as ngrok from '@ngrok/ngrok';
import { WsAdapter } from '@nestjs/platform-ws';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.PORT ?? 3000);

  if (process.env.WITH_NGROK) {
    await ngrok
      .connect({
        addr: process.env.PORT ?? 3000,
        authtoken: process.env.NGROK_AUTHTOKEN,
      })
      .then((listener) =>
        console.log(`Ingress established at: ${listener.url()}`),
      );
  }
}

bootstrap();
