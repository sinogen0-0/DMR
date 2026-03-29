<script lang="ts">
  import { createTranscriptionService } from '$services';
  import type { TranscriptionSession } from '$services';
  import { onMount } from 'svelte';

  let transcriptionService: ReturnType<typeof createTranscriptionService> | null = null;
  let isSupported: boolean = false;
  let isTranscribing: boolean = false;
  let currentTranscript: string = '';
  let finalTranscript: string = '';
  let confidence: number = 0;
  let error: string | null = null;
  let testAudioBlob: Blob | null = null;
  let transcriptionMessage: string = '';

  onMount(() => {
    transcriptionService = createTranscriptionService({
      language: 'en-US',
      autoConvert: true,
    });
    
    isSupported = transcriptionService.isSupported();
    
    if (isSupported) {
      // Subscribe to result updates
      transcriptionService.onResult((session: TranscriptionSession) => {
        currentTranscript = session.transcript;
        confidence = session.confidence;
        isTranscribing = session.isTranscribing;
        
        if (!session.isTranscribing) {
          finalTranscript = session.transcript;
          transcriptionMessage = `✅ Transcription complete! Confidence: ${confidence}%`;
        }
      });

      // Subscribe to errors
      transcriptionService.onError((err: string) => {
        error = err;
        isTranscribing = false;
        transcriptionMessage = '';
      });
    }
  });

  async function startTestTranscription() {
    if (!transcriptionService || !isSupported) {
      error = 'Transcription not supported in this browser';
      return;
    }

    error = null;
    currentTranscript = '';
    finalTranscript = '';
    confidence = 0;
    transcriptionMessage = '🎤 Listening... Speak now!';
    
    // Note: In a real scenario, you'd get the blob from a recording
    // This creates a mock scenario where the Web Speech API listens directly
    try {
      // Create a minimal recording object for the API
      const mockRecording = {
        id: `test_${Date.now()}`,
        timestamp: Date.now(),
        duration: 30, // 30 seconds max
        format: 'opus' as const,
        size: 0,
      };

      // Create an empty blob for the API (Web Speech API doesn't actually need it for listening)
      const emptyBlob = new Blob([], { type: 'audio/wav' });

      const result = await transcriptionService.transcribeAudioBlob(
        mockRecording.id,
        emptyBlob,
        mockRecording
      );

      transcriptionMessage = '';
      finalTranscript = result.transcript;
      confidence = Math.round(result.confidence * 100);
    } catch (e) {
      error = `${e}`;
      transcriptionMessage = '';
      isTranscribing = false;
    }
  }

  function stopTranscription() {
    if (transcriptionService) {
      transcriptionService.stopTranscription();
      isTranscribing = false;
    }
  }

  function clearResults() {
    currentTranscript = '';
    finalTranscript = '';
    confidence = 0;
    error = null;
    transcriptionMessage = '';
  }
</script>

<div class="transcription-test-container">
  <h1>🎤 Web Speech API Transcription Test</h1>

  {#if !isSupported}
    <div class="error-banner">
      <p>❌ Web Speech API Not Supported</p>
      <p style="font-size: 0.875rem; margin-top: 0.5rem;">
        Your browser doesn't support Web Speech API.
        <strong>Supported browsers:</strong> Chrome, Edge, Safari
      </p>
    </div>
  {:else}
    <div class="success-banner">
      <p>✅ Web Speech API is supported!</p>
    </div>

    <div class="controls-section">
      <div class="button-group">
        {#if !isTranscribing}
          <button class="btn btn-primary" on:click={startTestTranscription}>
            🎤 Start Transcription
          </button>
        {:else}
          <button class="btn btn-danger" on:click={stopTranscription}>
            ⏹️ Stop
          </button>
        {/if}
        <button class="btn btn-secondary" on:click={clearResults}>
          🗑️ Clear
        </button>
      </div>

      {#if transcriptionMessage}
        <div class="info-message">
          {transcriptionMessage}
        </div>
      {/if}

      {#if error}
        <div class="error-banner">
          <p>❌ {error}</p>
        </div>
      {/if}
    </div>

    <div class="results-section">
      <div class="result-box interim">
        <h3>Interim Transcript (Real-time)</h3>
        <p class="transcript-text">
          {currentTranscript || '<speak to see interim results...>'}
        </p>
      </div>

      <div class="result-box final">
        <h3>Final Transcript</h3>
        <p class="transcript-text">
          {finalTranscript || '<waiting for final result...>'}
        </p>
        {#if confidence > 0}
          <p class="confidence">Confidence: {confidence}%</p>
        {/if}
      </div>
    </div>

    <div class="info-section">
      <h3>How to Test:</h3>
      <ol>
        <li>Click "Start Transcription" button</li>
        <li>Speak clearly into your microphone</li>
        <li>See interim results update in real-time</li>
        <li>Stop speaking to get final transcription</li>
        <li>Check confidence score (higher = more accurate)</li>
      </ol>

      <h3>Tips:</h3>
      <ul>
        <li>Use Chrome or Edge for best support</li>
        <li>Speak clearly and at normal volume</li>
        <li>Quiet environment works best</li>
        <li>Test with short sentences first</li>
        <li>Long pauses will end the transcription</li>
      </ul>
    </div>
  {/if}
</div>

<style>
  .transcription-test-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2rem;
    color: #1a1510;
    margin-bottom: 1.5rem;
  }

  .error-banner {
    background-color: #f5e6e0;
    border-left: 4px solid #9a442d;
    padding: 1rem;
    margin: 1rem 0;
  }

  .error-banner p {
    margin: 0;
    color: #5c2818;
  }

  .success-banner {
    background-color: #e8f5e9;
    border-left: 4px solid #4b654e;
    padding: 1rem;
    margin: 1rem 0;
  }

  .success-banner p {
    margin: 0;
    color: #2d3d30;
  }

  .info-message {
    background-color: #e8f0f8;
    border-left: 4px solid #6b8caa;
    padding: 1rem;
    margin: 1rem 0;
    color: #3d5574;
  }

  .controls-section {
    background-color: #fef9f0;
    border: 1px solid #e8dcc8;
    padding: 1.5rem;
    margin: 1.5rem 0;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border: none;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s ease;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.05em;
  }

  .btn-primary {
    background-color: #9a442d;
    color: #fef9f0;
    box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.5);
  }

  .btn-primary:hover {
    background-color: #7d3622;
  }

  .btn-danger {
    background-color: #b85d5d;
    color: #fef9f0;
    box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.5);
  }

  .btn-danger:hover {
    background-color: #a04848;
  }

  .btn-secondary {
    background-color: #999999;
    color: #fef9f0;
    box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.5);
  }

  .btn-secondary:hover {
    background-color: #808080;
  }

  .results-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin: 1.5rem 0;
  }

  @media (max-width: 600px) {
    .results-section {
      grid-template-columns: 1fr;
    }
  }

  .result-box {
    background-color: #fef9f0;
    border: 1px solid #e8dcc8;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-box h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #363226;
    margin: 0;
    letter-spacing: 0.05em;
  }

  .transcript-text {
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #363226;
    margin: 0;
    min-height: 80px;
    line-height: 1.6;
    background: #ffffff;
    padding: 1rem;
    border: 1px inset #d0c4b4;
  }

  .interim .transcript-text {
    color: #9a7c5c;
    font-style: italic;
  }

  .confidence {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: #9a442d;
    margin: 0;
    font-weight: 500;
  }

  .info-section {
    background-color: #f9f5f0;
    border: 1px solid #e8dcc8;
    padding: 1.5rem;
    margin-top: 1.5rem;
  }

  .info-section h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #363226;
    margin-top: 0;
    letter-spacing: 0.05em;
  }

  .info-section ol,
  .info-section ul {
    font-family: 'Inter', sans-serif;
    color: #6b5344;
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  .info-section li {
    margin-bottom: 0.5rem;
  }
</style>
