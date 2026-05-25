# capacitor-audio-transcriber

Native Android Capacitor plugin for simultaneous audio recording and live speech transcription.

## Why This Plugin?

This plugin solves the microphone contention issue that occurs when using Web Speech API and MediaRecorder simultaneously in Android WebView. By managing both recording and transcription at the native Android level, it ensures smooth concurrent operation without hardware conflicts.

## Features

- ✅ Simultaneous audio recording and live transcription
- ✅ No microphone contention (single audio source, dual output)
- ✅ Real-time transcription events (interim and final results)
- ✅ Support for recording-only, transcription-only, or both modes
- ✅ Pause/resume recording capability
- ✅ Confidence scores for transcription results
- ✅ M4A/AAC audio output format

## Installation

```bash
npm install capacitor-audio-transcriber
npx cap sync
```

## API

### Methods

#### `startRecording(options)`

Start audio recording.

```typescript
const result = await AudioTranscriber.startRecording({
  language: 'en-US',
  sampleRate: 44100
});
// Returns: { sessionId: string }
```

#### `stopRecording()`

Stop recording and get the audio file.

```typescript
const result = await AudioTranscriber.stopRecording();
// Returns: { filePath: string, duration: number, size: number }
```

#### `pauseRecording()`

Pause the current recording.

```typescript
await AudioTranscriber.pauseRecording();
```

#### `resumeRecording()`

Resume a paused recording.

```typescript
await AudioTranscriber.resumeRecording();
```

#### `startTranscription(options)`

Start live speech transcription.

```typescript
await AudioTranscriber.startTranscription({
  language: 'en-US',
  continuous: true,
  partialResults: true
});
```

#### `stopTranscription()`

Stop transcription and get final result.

```typescript
const result = await AudioTranscriber.stopTranscription();
// Returns: { finalTranscript: string }
```

### Events

#### `transcriptionUpdate`

Fired when transcription text is updated (interim or final).

```typescript
AudioTranscriber.addListener('transcriptionUpdate', (event) => {
  console.log('Transcript:', event.transcript);
  console.log('Confidence:', event.confidence);
  console.log('Is final:', event.isFinal);
});
```

#### `recordingProgress`

Fired periodically during recording with progress updates.

```typescript
AudioTranscriber.addListener('recordingProgress', (event) => {
  console.log('Duration:', event.duration);
  console.log('File size:', event.size);
});
```

## Usage Example

```typescript
import { AudioTranscriber } from 'capacitor-audio-transcriber';

// Start recording and transcription simultaneously
async function startSession() {
  // Set up event listener
  AudioTranscriber.addListener('transcriptionUpdate', (event) => {
    console.log('Transcription:', event.transcript);
    if (event.isFinal) {
      console.log('Final result with confidence:', event.confidence);
    }
  });

  // Start recording
  const session = await AudioTranscriber.startRecording({
    language: 'en-US'
  });
  
  // Start transcription
  await AudioTranscriber.startTranscription({
    language: 'en-US',
    continuous: true,
    partialResults: true
  });
}

// Stop both
async function stopSession() {
  const transcript = await AudioTranscriber.stopTranscription();
  const recording = await AudioTranscriber.stopRecording();
  
  console.log('Recording saved to:', recording.filePath);
  console.log('Final transcript:', transcript.finalTranscript);
}
```

## Platform Support

- ✅ Android (API 22+)
- ⏳ iOS (planned)
- ⏳ Web (fallback to Web APIs)

## Requirements

### Android

- Minimum SDK: 22 (Android 5.1)
- Permissions: `RECORD_AUDIO`
- Google Mobile Services (for SpeechRecognizer)

## License

MIT
