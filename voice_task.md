# Voice Q&A Implementation Task List

- [x] Create Backend Voice Services
    - [x] Create `functions/speech-to-text` directory with `package.json` and `index.js`
    - [x] Create `functions/text-to-speech` directory with `package.json` and `index.js`
    - [x] Register new functions inside `catalyst.json`
- [x] Implement API Service Layer
    - [x] Add `transcribeAudio` and `synthesizeSpeech` methods in `react-vite/src/services/api.js`
- [x] Implement Frontend Recording Component
    - [x] Update `VoiceButton.jsx` to animate and handle click states
    - [x] Update `ChatInput.jsx` with `MediaRecorder` logic and state variables (`isRecording`, `isTranscribing`)
- [x] Implement Frontend Text-to-Speech Playback
    - [x] Update `ChatMessage.jsx` to render speaker button and control HTML5 Audio playback state
- [x] Build & Verify
    - [x] Verify Vite build compilation
    - [x] Conduct manual checks of recording permission, STT correctness, and TTS playback
