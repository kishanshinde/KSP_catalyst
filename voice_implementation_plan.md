# Voice-Enabled Q&A Interaction (STT & TTS)

Implement bilingual (English + Kannada) voice-enabled querying (Speech-to-Text) and text reading (Text-to-Speech) using Zoho Catalyst Zia Services/Models, the browser HTML5 `MediaRecorder` API, and standard React hooks.

## User Review Required

> [!IMPORTANT]
> **Zia Voice Services Compatibility:** This plan assumes standard Zoho Catalyst Zia SDK functions (e.g. `app.zia().speechToText()` or raw Zia audio processing REST APIs) are enabled on your organization's Catalyst account. To ensure local offline developers can build/run this application safely, the backend and frontend will include an automatic mock/fallback mode (controlled via env/mock config).

> [!NOTE]
> **Audio Formats:** MediaRecorder in Chrome/Firefox natively outputs `audio/webm`. We will capture the audio as WebM, which Zoho Catalyst Zia services or standard audio converters handle.

---

## Open Questions

None at this stage. We have aligned on:
1. Client-side recording using HTML5 `MediaRecorder` API.
2. Direct streaming of speech audio blobs to the backend.
3. Backend automatic language detection (English/Kannada) via Catalyst Zia.
4. On-demand Text-to-Speech (TTS) via a speaker icon in individual AI message bubbles.

---

## Proposed Changes

### Backend Services

#### [NEW] [index.js](file:///d:/Project/KSP/KSP_catalyst/functions/speech-to-text/index.js)
Create an Express-based serverless function that accepts audio files via multipart/form-data, sends them to Zoho Catalyst Zia Speech-to-Text / Audio-to-Text services, and returns the transcribed text.

#### [NEW] [package.json](file:///d:/Project/KSP/KSP_catalyst/functions/speech-to-text/package.json)
Define dependencies for the `speech-to-text` microservice, including `busboy` (or `multer`) for file parsing, and standard `zcatalyst-sdk-node`.

#### [NEW] [index.js](file:///d:/Project/KSP/KSP_catalyst/functions/text-to-speech/index.js)
Create an Express-based serverless function that accepts a JSON body containing text, calls Zoho Catalyst Zia Text-to-Speech / Text-to-Audio services, and streams the resulting audio bytes back to the frontend.

#### [NEW] [package.json](file:///d:/Project/KSP/KSP_catalyst/functions/text-to-speech/package.json)
Define dependencies for the `text-to-speech` microservice.

#### [MODIFY] [catalyst.json](file:///d:/Project/KSP/KSP_catalyst/catalyst.json)
Register the new `speech-to-text` and `text-to-speech` serverless functions.

---

### Frontend Components

#### [MODIFY] [api.js](file:///d:/Project/KSP/KSP_catalyst/react-vite/src/services/api.js)
Add integration endpoints:
1. `transcribeAudio(audioBlob)`: Uploads a WebM audio blob using `FormData` to `/speech-to-text`.
2. `synthesizeSpeech(text)`: Posts a JSON text body to `/text-to-speech` and returns a raw binary `Blob` object.

#### [MODIFY] [VoiceButton.jsx](file:///d:/Project/KSP/KSP_catalyst/react-vite/src/components/common/VoiceButton.jsx)
Accept the click handler and animate the microphone icon using Framer Motion (pulsing scale and red glow opacity) while recording is in progress.

#### [MODIFY] [ChatInput.jsx](file:///d:/Project/KSP/KSP_catalyst/react-vite/src/components/chat/ChatInput.jsx)
Implement browser voice recording logic:
1. Setup state variables: `isRecording`, `isTranscribing`.
2. Implement recording handlers (`startRecording`, `stopRecording`, `cancelRecording`) using standard `MediaRecorder` API.
3. Call `api.transcribeAudio` on completion, populate the chat input field with the returned string, and restore standard inputs.

#### [MODIFY] [ChatMessage.jsx](file:///d:/Project/KSP/KSP_catalyst/react-vite/src/components/chat/ChatMessage.jsx)
1. Add an on-demand speaker/volume button (using a Lucide icon like `Volume2` or `VolumeX`).
2. Manage audio playback state locally (fetching, playing, paused).
3. Call `api.synthesizeSpeech`, convert the binary blob into a local URL using `URL.createObjectURL(blob)`, and play it using `new Audio(audioUrl)`.

---

## Verification Plan

### Automated Tests
*   Run `npm run build` or Vite build locally in `react-vite/` to verify that there are no static analysis or compilation errors.

### Manual Verification
1.  **Microphone Permission:** Click the microphone button in `ChatInput`. Verify the browser prompts for mic permissions and handles rejection gracefully (displaying an alert/toast).
2.  **STT (English & Kannada):** record voice in English and Kannada. Verify the button pulses red. Click again to stop, wait for transcribing loader, and ensure the correct transcribed text appears in the textarea.
3.  **TTS On-Demand Play:** Generate an AI response. Click the speaker icon on the AI message bubble. Confirm audio is generated and streams/plays successfully.
