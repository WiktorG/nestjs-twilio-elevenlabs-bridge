/** TWILIO TYPES -- START */

// Message received from Twilio indicating the start of a media stream
interface Start {
  event: 'start';
  streamSid: string;
  start: {
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
  };
}

// Message received from Twilio indicating a media sample
interface Media {
  event: 'media';
  streamSid: string;
  media: {
    payload: string; // Base64 encoded audio data
    track: string;
    timestamp: {
      start: number;
      end: number;
    };
    sequenceNumber: number;
    samples: {
      type: string;
      encoding: string;
      sampleRate: number;
      bitsPerSample: number;
      channels: number;
    };
  };
}

// Message received from Twilio indicating the end of a media stream
interface Stop {
  event: 'stop';
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
}

// Union type representing all possible messages that can be received from Twilio
export type TwilioServerMessage = Start | Media | Stop;

export function isTwilioMessage(
  message: unknown,
): message is TwilioServerMessage {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('event' in message) ||
    typeof message.event !== 'string'
  )
    return false;

  return ['start', 'media', 'stop'].includes(message.event);
}

/** TWILIO TYPES -- END */

/** ELEVEN LABS TYPES -- START */
// Message sent by the client to initiate a conversation
interface ConversationInitiationClientData {
  type: 'conversation_initiation_client_data';
  conversation_config_override?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      first_message?: string;
      language?: string;
    };
    tts?: {
      voice_id?: string;
    };
  };
  custom_llm_extra_body?: {
    temperature?: number;
    max_tokens?: number;
  };
  dynamic_variables?: Record<string, string>;
}

// Message received from the server containing conversation metadata
interface ConversationInitiationMetadata {
  type: 'conversation_initiation_metadata';
  conversation_initiation_metadata_event: {
    conversation_id: string;
    agent_output_audio_format: string;
    user_input_audio_format: string;
  };
}

// Message sent by the client containing a chunk of user audio
interface UserAudioChunk {
  user_audio_chunk: string; // Base64 encoded audio data
}

// Message received from the server with the user's transcribed text
interface UserTranscript {
  type: 'user_transcript';
  user_transcription_event: {
    user_transcript: string;
  };
}

// Message received from the server with the agent's response text
interface AgentResponse {
  type: 'agent_response';
  agent_response_event: {
    agent_response: string;
  };
}

interface AgentResponseCorrection {
  type: 'agent_response_correction';
  correction_event: {
    corrected_response: string;
  };
}

// Message received from the server with the agent's audio response
interface AudioResponse {
  type: 'audio';
  audio_event: {
    audio_base_64: string; // Base64 encoded audio data
    event_id: number;
  };
}

// Message received from the server indicating a ping
interface Ping {
  type: 'ping';
  ping_event: {
    event_id: number;
    ping_ms: number;
  };
}

// Message sent by the client in response to a ping
interface Pong {
  type: 'pong';
  event_id: number;
}

// Message received from the server requesting the client to perform a tool call
interface ClientToolCall {
  type: 'client_tool_call';
  client_tool_call: {
    tool_name: string;
    tool_call_id: string;
    parameters: Record<string, string>;
  };
}

// Message sent by the client with the result of a tool call
interface ClientToolResult {
  type: 'client_tool_result';
  tool_call_id: string;
  result: string;
  is_error: boolean;
}

// Message received from the server with internal VAD (Voice Activity Detection) score
interface InternalVadScore {
  type: 'internal_vad_score';
  vad_event: {
    score: number;
  };
}

// Message received from the server with internal turn probability
interface InternalTurnProbability {
  type: 'internal_turn_probability';
  turn_event: {
    probability: number;
  };
}

// Message received from the server with a tentative agent response
interface InternalTentativeAgentResponse {
  type: 'internal_tentative_agent_response';
  tentative_agent_response_internal_event: {
    tentative_agent_response: string;
  };
}

// Message received from the server indicating an interruption event
interface Interruption {
  type: 'interruption';
  interruption_event: {
    reason: string;
  };
}

// Union type representing all possible messages that can be received from the server
export type ElevenLabsServerMessage =
  | ConversationInitiationMetadata
  | UserTranscript
  | AgentResponse
  | AgentResponseCorrection
  | AudioResponse
  | Ping
  | ClientToolCall
  | InternalVadScore
  | InternalTurnProbability
  | InternalTentativeAgentResponse
  | Interruption;

export function isElevenLabsServerMessage(
  message: unknown,
): message is ElevenLabsServerMessage {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    typeof message.type !== 'string'
  )
    return false;

  return [
    'conversation_initiation_metadata',
    'user_transcript',
    'agent_response',
    'audio',
    'ping',
    'client_tool_call',
    'internal_vad_score',
    'internal_turn_probability',
    'internal_tentative_agent_response',
    'interruption',
  ].includes(message.type);
}

// Union type representing all possible messages that can be sent by the client
export type ElevenLabsClientMessage =
  | ConversationInitiationClientData
  | UserAudioChunk
  | Pong
  | ClientToolResult;

/** ELEVEN LABS TYPES --  END */
