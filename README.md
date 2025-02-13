# NestJS Twilio Elevenlabs bridge API

A [NestJS](https://nestjs.com) service that bridges [Twilio](https://twilio.com)
inbound phone calls to [ElevenLabs Conversational AI](https://elevenlabs.io). It
streams a caller's audio from Twilio to an ElevenLabs agent over a WebSocket and
streams the agent's generated speech back to the caller in real time. It can also
forward (redirect) the live call to another phone number on request.

It's designed as a small, readable starting point for building voice AI
applications on top of Twilio and ElevenLabs.

## How it works

```
Caller ──▶ Twilio number
              │  GET /twilio/inbound_call  → returns TwiML <Connect><Stream>
              ▼
   Twilio Media Stream (WebSocket)            ws /media-stream (CallGateway)
                                                        │
        ┌───────────────────────────────────────────────┐
        │                  CallService                    │
        │                                                 │
        │   caller audio  ──────────────────────────▶     │   (Twilio → ElevenLabs)
        │   generated speech  ◀──────────────────────     │   (ElevenLabs → Twilio)
        └───────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                          ElevenLabs Conversational AI
                                             (WebSocket, convai)
```

Audio flows in both directions over the `/media-stream` socket. The caller's audio
is forwarded up to ElevenLabs, and the agent's generated speech is streamed back
down to Twilio and played to the caller. `CallService` also relays interruptions
(to clear Twilio's audio buffer) and keep-alive pings.

1. Twilio receives an inbound call and requests `GET /twilio/inbound_call`.
2. The service responds with TwiML that tells Twilio to open a media stream to the
   `media-stream` WebSocket.
3. `CallGateway` accepts the Twilio WebSocket and opens an outbound WebSocket to the
   configured ElevenLabs agent.
4. `CallService` relays audio both ways: caller audio → ElevenLabs, generated audio
   → caller. It also handles interruptions, pings, and the `redirect_call` client
   tool (which forwards the call to `REDIRECT_TO_PHONE_NUMBER`).

### Endpoints

| Method | Path                    | Description                                                |
| ------ | ----------------------- | ---------------------------------------------------------- |
| GET    | `/twilio/inbound_call`  | Returns TwiML pointing Twilio at the `media-stream` socket |
| WS     | `/media-stream`         | WebSocket carrying the Twilio ⇄ ElevenLabs audio bridge    |
| GET    | `/twilio/forward`       | Stub endpoint (logs only)                                  |

## Use cases & extending

The interesting extension point is the **client tool call**. When the ElevenLabs
agent decides to invoke a tool, it sends a `client_tool_call` message over the
WebSocket. `CallService.handleElevenLabsMessage` (`src/call/call.service.ts`)
inspects `message.client_tool_call.tool_name` and runs your own logic in response.

The shipped example is `redirect_call`, which forwards the live call to another
number. You can branch on any tool name you define on the ElevenLabs agent and
hook in your own behavior, for example:

- **Run custom business logic** — look up an order, check availability, trigger a
  workflow, send a webhook.
- **Update a database / CRM** — persist the transcript, log the call outcome, or
  create a lead from what the agent collected.
- **Hand off to another agent** — close the current ElevenLabs WebSocket and open a
  new one against a different `agent_id` to switch conversation context mid-call.
- **Transfer / redirect the call** — as the built-in `redirect_call` tool does, via
  the Twilio REST API in `CallService.redirectCurrentCall`.
- **Send a result back to the agent** — reply with a `client_tool_result` message so
  the agent can continue the conversation using your tool's output.

To add a tool:

1. Define the tool on your agent in the ElevenLabs dashboard (this drives when the
   agent emits `client_tool_call`).
2. Add a `case` for its `tool_name` in `handleElevenLabsMessage`.
3. Implement the handler, and optionally send a `client_tool_result` back over
   `elevenLabsWs`.

## Prerequisites

- [Node.js](https://nodejs.org) 20+ and npm
- A [Twilio](https://twilio.com) account with a voice-capable phone number
- An [ElevenLabs](https://elevenlabs.io) account with a Conversational AI agent
- An [ngrok](https://ngrok.com) auth token (to expose your local server to Twilio)

## Setup

```bash
git clone <your-fork-url>
cd nestjs-twilio-elevenlabs-bridge
npm install
cp .env.example .env
```

Then fill in `.env`:

| Variable                   | Description                                                            |
| -------------------------- | --------------------------------------------------------------------- |
| `ELEVENLABS_API_KEY`       | ElevenLabs API key                                                    |
| `ELEVENLABS_AGENT_ID`      | ID of the ElevenLabs Conversational AI agent to connect calls to      |
| `TWILIO_ACCOUNT_SID`       | Twilio account SID                                                     |
| `TWILIO_AUTH_TOKEN`        | Twilio auth token                                                     |
| `NGROK_AUTHTOKEN`          | ngrok auth token (used when `WITH_NGROK=true`)                        |
| `REDIRECT_COUNTRY_CODE`    | Country code prepended to the redirect number (default `+48`)         |
| `REDIRECT_TO_PHONE_NUMBER` | Number the `redirect_call` tool forwards to (without the country code) |

## Running

```bash
npm start          # starts with ngrok (sets WITH_NGROK=true) and prints the public URL
npm run start:dev  # watch mode (no ngrok)
npm run start:prod # run the compiled build from dist/
```

By default the server listens on port `3000` (override with `PORT`).

## Connecting Twilio

1. Start the server with `npm start` and copy the ngrok URL it prints.
2. In the Twilio console, open your phone number's voice configuration.
3. Set the inbound call webhook to `https://<your-ngrok-url>/twilio/inbound_call`
   (HTTP GET).
4. Call the number to talk to your ElevenLabs agent.

> If call redirection doesn't work, check your Twilio Geo Permissions — see
> [error 13227](https://www.twilio.com/docs/api/errors/13227).

## Project structure

```
src/
  main.ts              # bootstrap (Nest app + optional ngrok ingress)
  app.module.ts        # root module
  call/
    call.controller.ts # /twilio HTTP endpoints
    call.gateway.ts    # /media-stream WebSocket gateway
    call.service.ts    # audio relay + redirect logic
    call.types.ts      # Twilio & ElevenLabs message types
```

## Testing

The project uses [Jest](https://jestjs.io). Unit specs live next to the code
(`*.spec.ts`) and end-to-end specs live in `test/`.

```bash
npm test           # run unit tests
npm run test:watch # re-run on change
npm run test:cov   # generate a coverage report (coverage/)
npm run test:e2e   # run end-to-end tests (test/jest-e2e.json)
```

Because the audio bridge depends on live Twilio and ElevenLabs WebSockets, the
fastest way to test that logic is to mock the `ws` `WebSocket` and assert on what
`CallService` forwards — feed it a Twilio `media` event and check the payload sent
to `elevenLabsWs`, or feed it an ElevenLabs `audio`/`client_tool_call` message and
check the response sent to `twilioWs`. The `is*Message` type guards in
`call.types.ts` make it easy to construct valid fixtures.

For a real end-to-end check, run `npm start`, point your Twilio number's webhook at
the printed ngrok URL (`/twilio/inbound_call`), call the number, and confirm
two-way audio with the agent.

## Scripts

```bash
npm run build    # compile to dist/
npm run lint     # eslint --fix
npm run format   # prettier
```

## Contributing

Contributions are welcome. Please run `npm run lint` and `npm run format` before
opening a pull request.

## License

[MIT](./LICENSE)
