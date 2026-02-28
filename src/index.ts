// @va/live-synth — Live coding music synthesizer
// Type text → parse into synth commands → loop playback → real-time mutation
//
// Architecture:
//   Editor (text input) → Parser (text→commands) → Engine (schedule+loop) → Audio (Web Audio/Tone.js)
//
// Coming soon: the amplifier will decompose this vision into reality.

export const VERSION = "0.1.0";
export const PROJECT_NAME = "live-synth";
