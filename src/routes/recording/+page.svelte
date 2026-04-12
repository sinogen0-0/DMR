<script lang="ts">
  import { goto } from '$app/navigation';
  import { createAudioService, createExtractionService, createStorageService, createTranscriptionService } from '$services';
  import type { TranscriptionSession } from '$services';
  import { CapacitorSpeechService } from '$lib/services/audio/capacitorSpeechService';
  import { isNative } from '$utils/platformDetector';
  import { onMount } from 'svelte';

  let audioService: ReturnType<typeof createAudioService> | null = null;
  let transcriptionService: ReturnType<typeof createTranscriptionService> | null = null;
  let capacitorSpeechService: CapacitorSpeechService | null = null;
  let recording = false;
  let paused = false;
  let elapsedTime = 0;
  type DisplayTag = {
    name: string;
    type: 'NPC' | 'PLAYER_CHARACTER' | 'LOCATION' | 'STORY_PLOT';
    status: 'linked' | 'needs_review';
    mentionContexts: string[];
  };
  let recordingList: Array<{
    id: string;
    duration: number;
    timestamp: number;
    playbackUrl?: string;
    transcription?: string;
    transcriptionTags?: DisplayTag[];
  }> = [];
  let error: string | null = null;
  let permissionStatus: 'pending' | 'granted' | 'denied' | 'unknown' = 'pending';
  let permissionDescription = '';
  let checkingPermission = false;
  let databaseMessage = '';

  // Transcription state
  let isTransriptionSupported: boolean = false;
  let isTranscribing: boolean = false;
  let selectedRecordingId: string | null = null;
  let interimTranscript: string = '';
  let finalTranscript: string = '';
  let transcriptionConfidence: number = 0;
  let editedTranscript: string = '';
  let transcriptionError: string | null = null;
  let isSavingTranscription: boolean = false;

  // Auto-transcription state
  let isAutoTranscribing: boolean = false;
  let showTranscribingSpinner: boolean = false;
  let autoTranscribeSpinnerTimeout: ReturnType<typeof setTimeout> | null = null;
  let webTranscriptionPromise: Promise<void> | null = null;

  onMount(async () => {
    audioService = createAudioService();
    transcriptionService = createTranscriptionService({
      language: 'en-US',
    });
    capacitorSpeechService = new CapacitorSpeechService('en-US');
    
    isTransriptionSupported = transcriptionService.isSupported();

    // Check initial permission status
    await checkPermissionStatus();

    // Load saved recordings from storage
    await loadSavedRecordings();

    // Setup transcription listeners
    if (transcriptionService && isTransriptionSupported) {
      transcriptionService.onResult((session: TranscriptionSession) => {
        interimTranscript = session.transcript;
        transcriptionConfidence = session.confidence;
        isTranscribing = session.isTranscribing;
        
        if (!session.isTranscribing) {
          finalTranscript = session.transcript;
          editedTranscript = session.transcript;
        }
      });

      transcriptionService.onError((err: string) => {
        transcriptionError = err;
        isTranscribing = false;
      });
    }
  });

  async function loadSavedRecordings() {
    try {
      const storage = createStorageService();
      await storage.initialize();
      const savedRecordings = await storage.listRecordings({ limit: 50 });
      
      console.log('🔍 Loaded recordings:', savedRecordings);
      
      // Map storage recordings to display format
      const mappedRecordings = savedRecordings.map(rec => ({
        id: rec.id,
        duration: rec.duration,
        timestamp: rec.timestamp,
        playbackUrl: rec.blobUrl,
        transcription: rec.transcription,
        transcriptionTags: rec.transcriptionTags,
      }));
      
      console.log('🎵 Playback URLs:', mappedRecordings.map(r => ({ id: r.id, url: r.playbackUrl })));
      
      recordingList = mappedRecordings.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('Failed to load saved recordings:', e);
      // Don't show error to user for this operation, just fail gracefully
    }
  }

  async function checkPermissionStatus() {
    if (!audioService) return;

    checkingPermission = true;
    try {
      const permResult = await audioService.checkMicrophonePermission();
      permissionStatus = permResult.status as 'granted' | 'denied' | 'unknown';
      permissionDescription = await audioService.getPermissionStatusDescription();
    } catch (e) {
      permissionStatus = 'unknown';
      permissionDescription = `Error checking permission: ${e}`;
    } finally {
      checkingPermission = false;
    }
  }

  let timerId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    timerId = setInterval(() => {
      if (recording && !paused && audioService) {
        elapsedTime = audioService.getElapsedTime();
      }
    }, 100);

    return () => {
      if (timerId !== null) {
        clearInterval(timerId);
      }
    };
  });

  async function startRecording() {
    error = null;
    try {
      if (!audioService) {
        error = 'Audio service not initialized';
        return;
      }

      await audioService.startRecording();
      await checkPermissionStatus();
      recording = true;
      paused = false;
      elapsedTime = 0;

      // On web, run live transcription in parallel with recording.
      if (!isNative()) {
        startWebParallelTranscription();
      }
    } catch (e) {
      error = `${e}`;
      recording = false;
      await checkPermissionStatus();
    }
  }

  function startWebParallelTranscription() {
    if (!transcriptionService || !isTransriptionSupported) {
      return;
    }

    isAutoTranscribing = true;
    showTranscribingSpinner = false;
    if (autoTranscribeSpinnerTimeout) {
      clearTimeout(autoTranscribeSpinnerTimeout);
    }
    autoTranscribeSpinnerTimeout = setTimeout(() => {
      if (isAutoTranscribing) {
        showTranscribingSpinner = true;
      }
    }, 100);

    isTranscribing = true;
    interimTranscript = '';
    finalTranscript = '';
    editedTranscript = '';
    transcriptionError = null;
    transcriptionConfidence = 0;

    const liveRecordingId = `live-${Date.now()}`;
    const emptyBlob = new Blob([], { type: 'audio/wav' });
    const mockRecording = {
      id: liveRecordingId,
      timestamp: Date.now(),
      duration: 30,
      format: 'opus' as const,
      size: 0,
    };

    webTranscriptionPromise = transcriptionService
      .transcribeAudioBlob(liveRecordingId, emptyBlob, mockRecording)
      .then((result) => {
        finalTranscript = result.transcript;
        editedTranscript = result.transcript;
        transcriptionConfidence = Math.round((result.confidence || 0) * 100);
      })
      .catch((e) => {
        transcriptionError = `${e instanceof Error ? e.message : String(e)}`;
      })
      .finally(() => {
        isAutoTranscribing = false;
        showTranscribingSpinner = false;
        if (autoTranscribeSpinnerTimeout) {
          clearTimeout(autoTranscribeSpinnerTimeout);
        }
        isTranscribing = false;
      });
  }

  async function finalizeWebParallelTranscription(recordingId: string) {
    selectedRecordingId = recordingId;

    if (transcriptionService && isTranscribing) {
      transcriptionService.stopTranscription();
    }

    if (webTranscriptionPromise) {
      await webTranscriptionPromise;
      webTranscriptionPromise = null;
    }

    if (editedTranscript.trim()) {
      await saveTranscription();
    } else {
      databaseMessage = '✅ Recording saved to database. No speech captured for transcription.';
      setTimeout(() => {
        databaseMessage = '';
      }, 3000);
    }
  }

  function pauseRecording() {
    error = null;
    try {
      if (!audioService) {
        error = 'Audio service not initialized';
        return;
      }

      audioService.pauseRecording();
      paused = true;
    } catch (e) {
      error = `Failed to pause recording: ${e}`;
    }
  }

  function resumeRecording() {
    error = null;
    try {
      if (!audioService) {
        error = 'Audio service not initialized';
        return;
      }

      audioService.resumeRecording();
      paused = false;
    } catch (e) {
      error = `Failed to resume recording: ${e}`;
    }
  }

  async function stopRecording() {
    error = null;
    try {
      if (!audioService) {
        error = 'Audio service not initialized';
        return;
      }

      const recordedAudio = await audioService.stopRecording();
      const playbackUrl = recordedAudio.blobUrl ?? undefined;

      recordingList = [
        {
          id: recordedAudio.id,
          duration: recordedAudio.duration,
          timestamp: recordedAudio.timestamp,
          playbackUrl,
        },
        ...recordingList,
      ];

      recording = false;
      paused = false;
      elapsedTime = 0;

      if (recordedAudio.blobUrl) {
        permissionDescription = '✅ Microphone access granted';
        permissionStatus = 'granted';
      }

      // Auto-save the recording to database
      try {
        const storage = createStorageService();
        await storage.initialize();
        
        const recordingToSave = {
          id: recordedAudio.id,
          timestamp: recordedAudio.timestamp,
          duration: recordedAudio.duration,
          format: 'opus' as const,
          size: recordedAudio.size || 0,
          blob: recordedAudio.blob,
          blobUrl: undefined,
          transcription: undefined,
          extractedEntities: undefined,
        };

        await storage.saveRecording(recordingToSave);
        databaseMessage = `✅ Recording automatically saved to database!`;
        
        if (isNative()) {
          if (!recordedAudio.blob) {
            databaseMessage = 'Recording saved, but no audio blob available for auto-transcription.';
            return;
          }
          // Mobile: Use Capacitor speech recognition on the audio file
          await autoTranscribeWithCapacitor(recordedAudio.id, recordedAudio.blob);
        } else {
          // Web: finalize the live parallel transcription started with recording.
          await finalizeWebParallelTranscription(recordedAudio.id);
        }
      } catch (storageError) {
        console.error('Failed to auto-save recording:', storageError);
        // Don't fail the stop operation if save fails
      }
    } catch (e) {
      error = `Failed to stop recording: ${e}`;
      recording = false;
      await checkPermissionStatus();
    }
  }

  async function autoTranscribeWithCapacitor(recordingId: string, blob: Blob) {
    if (!capacitorSpeechService) {
      console.error('Capacitor speech service not initialized');
      return;
    }

    isAutoTranscribing = true;
    showTranscribingSpinner = false;
    
    // Show spinner after 100ms if still transcribing
    autoTranscribeSpinnerTimeout = setTimeout(() => {
      if (isAutoTranscribing) {
        showTranscribingSpinner = true;
      }
    }, 100);

    selectedRecordingId = recordingId;
    finalTranscript = '';
    editedTranscript = '';
    transcriptionConfidence = 0;
    transcriptionError = null;

    try {
      const result = await capacitorSpeechService.transcribeAudioBlob(blob);
      finalTranscript = result.transcript;
      editedTranscript = result.transcript;
      transcriptionConfidence = Math.round(result.confidence * 100);
      
      // Auto-save the transcription and tags
      await saveTranscription();
    } catch (e) {
      transcriptionError = `Failed to transcribe audio: ${e instanceof Error ? e.message : String(e)}`;
      console.error('Capacitor transcription error:', e);
    } finally {
      isAutoTranscribing = false;
      showTranscribingSpinner = false;
      if (autoTranscribeSpinnerTimeout) {
        clearTimeout(autoTranscribeSpinnerTimeout);
      }
    }
  }

  async function startTranscription(recordingId: string) {
    if (!transcriptionService || !isTransriptionSupported) {
      transcriptionError = 'Web Speech API is not supported in your browser';
      return;
    }

    selectedRecordingId = recordingId;
    isTranscribing = true;
    interimTranscript = '';
    finalTranscript = '';
    editedTranscript = '';
    transcriptionError = null;
    transcriptionConfidence = 0;

    try {
      // Create minimal recording object for transcription service
      const mockRecording = {
        id: recordingId,
        timestamp: Date.now(),
        duration: 30,
        format: 'opus' as const,
        size: 0,
      };

      // Create an empty blob (Web Speech API uses microphone, not the blob)
      const emptyBlob = new Blob([], { type: 'audio/wav' });

      await transcriptionService.transcribeAudioBlob(
        recordingId,
        emptyBlob,
        mockRecording
      );
    } catch (e) {
      transcriptionError = `${e instanceof Error ? e.message : String(e)}`;
      isTranscribing = false;
    }
  }

  function stopTranscription() {
    if (transcriptionService && isTranscribing) {
      transcriptionService.stopTranscription();
      isTranscribing = false;
    }
  }

  async function saveTranscription() {
    if (!selectedRecordingId || !editedTranscript) {
      transcriptionError = 'No transcription to save';
      return;
    }

    isSavingTranscription = true;
    transcriptionError = null;

    try {
      const storage = createStorageService();
      await storage.initialize();

      // Get the recording to update
      const recording = await storage.loadRecording(selectedRecordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Update with transcription
      recording.transcription = editedTranscript;

      const extractionService = createExtractionService();
      const transcriptionTags = await extractionService.buildTranscriptionTags(editedTranscript, {
        minConfidence: 20,
        maxEntities: 50,
      });
      recording.transcriptionTags = transcriptionTags;
      recording.extractedEntities = transcriptionTags.map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        confidence: tag.confidence,
        mentions: tag.mentionContexts,
        source: tag.source,
      }));

      // Save back to storage
      await storage.saveRecording(recording);

      // Update the display
      recordingList = recordingList.map(rec => 
        rec.id === selectedRecordingId 
          ? {
              ...rec,
              transcription: editedTranscript,
              transcriptionTags: transcriptionTags.map(tag => ({
                name: tag.name,
                type: tag.type,
                status: tag.status,
                mentionContexts: tag.mentionContexts,
              }))
            }
          : rec
      );

      // Clear transcription UI
      selectedRecordingId = null;
      interimTranscript = '';
      finalTranscript = '';
      editedTranscript = '';
      transcriptionConfidence = 0;
      
      databaseMessage = `✅ Transcription saved with ${transcriptionTags.length} dossier tag${transcriptionTags.length === 1 ? '' : 's'}!`;
      setTimeout(() => { databaseMessage = ''; }, 3000);
    } catch (e) {
      transcriptionError = `Failed to save transcription: ${e}`;
    } finally {
      isSavingTranscription = false;
    }
  }

  function clearTranscription() {
    if (transcriptionService && isTranscribing) {
      transcriptionService.stopTranscription();
    }
    webTranscriptionPromise = null;
    selectedRecordingId = null;
    isTranscribing = false;
    interimTranscript = '';
    finalTranscript = '';
    editedTranscript = '';
    transcriptionConfidence = 0;
    transcriptionError = null;
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(String(hours).padStart(2, '0'));
    parts.push(String(minutes).padStart(2, '0'));
    parts.push(String(secs).padStart(2, '0'));

    return parts.join(':');
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function typeLabel(type: DisplayTag['type']): string {
    if (type === 'PLAYER_CHARACTER') return 'Character';
    if (type === 'STORY_PLOT') return 'Story Device';
    if (type === 'LOCATION') return 'Location';
    return 'NPC';
  }

  function openExtractionReview(recordingId: string): void {
    goto(`/transcriptions/${recordingId}/review`);
  }

  function openTranscriptView(recordingId: string): void {
    goto(`/transcriptions/${recordingId}`);
  }
</script>

<div class="recording-container">
  <h1>Audio Recording</h1>

  {#if checkingPermission}
    <div class="info-banner">
      <p>🔄 Checking microphone permission...</p>
    </div>
  {:else if permissionStatus === 'denied'}
    <div class="error-banner">
      <p>{permissionDescription}</p>
      <p style="font-size: 0.875rem; margin-top: 0.5rem;">
        To use audio recording, please enable microphone access in your browser or device settings.
      </p>
    </div>
  {:else if permissionStatus === 'unknown'}
    <div class="warning-banner">
      <p>⚠️ {permissionDescription}</p>
      <p style="font-size: 0.875rem; margin-top: 0.5rem;">
        Permission status could not be determined. Recording will request access when started.
      </p>
    </div>
  {:else}
    <div class="success-banner">
      <p>{permissionDescription}</p>
    </div>
  {/if}

  <div class="recording-controls">
      <div class="timer-display">
        <span class="timer">{formatTime(elapsedTime)}</span>
        <span class="status">{recording ? 'Recording' : paused ? 'Paused' : 'Ready'}</span>
      </div>

      <div class="button-group">
        {#if !recording}
          <button class="btn btn-primary" on:click={startRecording}>
            🎙️ Start Recording
          </button>
        {:else if !paused}
          <button class="btn btn-warning" on:click={pauseRecording}>
            ⏸️ Pause
          </button>
          <button class="btn btn-danger" on:click={stopRecording}>
            ⏹️ Stop
          </button>
        {:else}
          <button class="btn btn-success" on:click={resumeRecording}>
            ▶️ Resume
          </button>
          <button class="btn btn-danger" on:click={stopRecording}>
            ⏹️ Stop
          </button>
        {/if}
      </div>

      {#if error}
        <div class="error-banner">
          <p>❌ {error}</p>
        </div>
      {/if}

      {#if databaseMessage}
        <div class="success-banner">
          <p>{databaseMessage}</p>
        </div>
      {/if}
    </div>

    {#if recordingList.length > 0}
      <div class="recordings-list">
        <div class="recordings-header">
          <h2>Saved Recordings</h2>
          <button class="btn btn-secondary" on:click={loadSavedRecordings} title="Refresh the list of saved recordings">
            🔄 Reload
          </button>
        </div>
        <div class="recordings-table">
          {#each recordingList as rec (rec.id)}
            <div class="recording-item">
              <div class="recording-info">
                <div class="recording-id">{rec.id}</div>
                <div class="recording-meta">
                  <span class="duration">Duration: {formatTime(rec.duration)}</span>
                  <span class="time">Recorded: {formatDate(rec.timestamp)}</span>
                </div>
              </div>
              {#if rec.playbackUrl}
                <audio controls src={rec.playbackUrl} class="audio-preview"></audio>
              {:else}
                <div class="no-playback">No playback URL available for this clip.</div>
              {/if}
              
              {#if rec.transcription}
                <div class="transcription-display">
                  <p class="transcription-label">📝 Transcription:</p>
                  <p class="transcription-text">{rec.transcription}</p>
                </div>
              {/if}

              {#if rec.transcriptionTags && rec.transcriptionTags.length > 0}
                <div class="tag-display">
                  <p class="transcription-label">🏷️ Dossier Tags:</p>
                  <div class="tag-list">
                    {#each rec.transcriptionTags as tag}
                      <div class="tag-chip" class:review={tag.status === 'needs_review'}>
                        <span class="tag-name">{tag.name}</span>
                        <span class="tag-type">{typeLabel(tag.type)}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="recording-actions">
                {#if !selectedRecordingId || selectedRecordingId !== rec.id}
                  <button 
                    class="btn btn-primary"
                    on:click={() => startTranscription(rec.id)}
                    disabled={isTranscribing}
                    title="Start transcription from microphone"
                  >
                    🎤 Transcribe
                  </button>
                {/if}

                {#if rec.transcription || (rec.transcriptionTags && rec.transcriptionTags.length > 0)}
                  <button
                    class="btn btn-secondary"
                    on:click={() => openTranscriptView(rec.id)}
                    title="View transcript with linked dossier references"
                  >
                    📜 View Transcript
                  </button>
                  <button
                    class="btn btn-success"
                    on:click={() => openExtractionReview(rec.id)}
                    title="Review extracted entities for this transcription"
                  >
                    🧾 Review Extractions
                  </button>
                {/if}
              </div>
            </div>

            <!-- Transcription UI for selected recording -->
            {#if selectedRecordingId === rec.id}
              <div class="transcription-ui">
                <div class="transcription-section">
                  <h3>Transcription in Progress</h3>
                  
                  {#if showTranscribingSpinner}
                    <div class="spinner-container">
                      <div class="spinner"></div>
                      <p>Transcribing audio...</p>
                    </div>
                  {/if}
                  
                  {#if !isAutoTranscribing && !isTransriptionSupported}
                    <div class="error-banner">
                      <p>❌ Web Speech API not supported in this browser</p>
                      <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                        Use Chrome, Edge, or Safari for transcription support.
                      </p>
                    </div>
                  {:else if transcriptionError}
                    <div class="error-banner">
                      <p>❌ {transcriptionError}</p>
                    </div>
                  {:else}
                    <div>
                      {#if isTranscribing && !isAutoTranscribing}
                        <div class="info-banner">
                          <p>🎤 Listening... Speak now!</p>
                        </div>
                      {/if}

                      <!-- Interim results -->
                      {#if interimTranscript || isTranscribing}
                        <div class="transcript-box interim">
                          <p class="transcript-label">Interim (Real-time):</p>
                          <p class="transcript-text">
                            {interimTranscript || '(listening...)'}
                          </p>
                        </div>
                      {/if}

                      <!-- Final results -->
                      {#if finalTranscript}
                        <div class="transcript-box final">
                          <p class="transcript-label">Final Transcription:</p>
                          <p class="confidence">Confidence: {transcriptionConfidence}%</p>
                          <textarea 
                            class="transcript-edit"
                            bind:value={editedTranscript}
                            placeholder="Edit transcription here..."
                          ></textarea>
                        </div>
                      {/if}

                      <!-- Action buttons -->
                      <div class="transcription-buttons">
                        {#if isTranscribing}
                          <button class="btn btn-danger" on:click={stopTranscription}>
                            ⏹️ Stop Transcription
                          </button>
                        {:else if finalTranscript}
                          <button 
                            class="btn btn-primary" 
                            on:click={saveTranscription}
                            disabled={isSavingTranscription}
                          >
                            {isSavingTranscription ? '💾 Saving...' : '💾 Save Transcription'}
                          </button>
                        {/if}
                        <button class="btn btn-secondary" on:click={clearTranscription}>
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
</div>

<style>
  .recording-container {
    padding: 2rem;
    max-width: 600px;
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
    border-radius: 0;
  }

  .error-banner p {
    margin: 0;
    color: #5c2818;
  }

  .warning-banner {
    background-color: #f9ede8;
    border-left: 4px solid #d4a574;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0;
  }

  .warning-banner p {
    margin: 0;
    color: #7d6c47;
  }

  .info-banner {
    background-color: #e8f0f8;
    border-left: 4px solid #6b8caa;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0;
  }

  .info-banner p {
    margin: 0;
    color: #3d5574;
  }

  .success-banner {
    background-color: #e8f5e9;
    border-left: 4px solid #4b654e;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0;
  }

  .success-banner p {
    margin: 0;
    color: #2d3d30;
  }

  .recording-controls {
    background-color: #fef9f0;
    border: 1px solid #e8dcc8;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .timer-display {
    text-align: center;
    margin-bottom: 2rem;
  }

  .timer {
    display: block;
    font-family: 'Courier New', monospace;
    font-size: 3rem;
    color: #9a442d;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .status {
    display: block;
    font-size: 0.875rem;
    color: #6b5344;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
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

  .btn-primary:active {
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2), inset -2px -2px 4px rgba(255, 255, 255, 0.5);
  }

  .btn-warning {
    background-color: #d4a574;
    color: #1a1510;
    box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.5);
  }

  .btn-warning:hover {
    background-color: #c5935d;
  }

  .btn-success {
    background-color: #4b654e;
    color: #fef9f0;
    box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.5);
  }

  .btn-success:hover {
    background-color: #3a5238;
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

  .recordings-list {
    margin-top: 2rem;
  }

  .recordings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .recordings-list h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.25rem;
    color: #1a1510;
    margin-bottom: 0;
  }

  .recordings-table {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .recording-item {
    background-color: #fef9f0;
    border: 1px solid #e8dcc8;
    padding: 1rem;
    display: grid;
    gap: 0.75rem;
  }

  .audio-preview {
    width: 100%;
    outline: none;
  }

  .no-playback {
    color: #8b7355;
    font-size: 0.875rem;
    background: #fff6ec;
    border: 1px solid #e8dcc8;
    padding: 0.5rem;
  }

  .recording-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recording-id {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #6b5344;
    word-break: break-all;
  }

  .recording-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #8b7355;
  }

  .duration {
    font-weight: 500;
  }

  .time {
    font-size: 0.8125rem;
  }

  /* Transcription UI Styles */
  .transcription-display {
    background-color: #f0f8f5;
    border-left: 4px solid #4b654e;
    padding: 0.75rem;
    margin: 0.5rem 0;
  }

  .transcription-label {
    font-weight: 600;
    color: #1a1510;
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
  }

  .transcription-text {
    color: #3d5574;
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.4;
  }

  .recording-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .transcription-ui {
    background-color: #f9f4f0;
    border: 1px solid #e8dcc8;
    padding: 1rem;
    margin-top: 0.75rem;
    grid-column: 1 / -1;
  }

  .transcription-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .transcription-section h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    color: #1a1510;
    margin: 0;
  }

  .transcript-box {
    background-color: #fff6ec;
    border: 1px solid #e8dcc8;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .transcript-box.interim {
    border-left: 4px solid #d4a574;
    background-color: #fef9f5;
  }

  .transcript-box.final {
    border-left: 4px solid #9a442d;
    background-color: #fef4f0;
  }

  .transcript-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #6b5344;
    margin: 0;
  }

  .transcript-text {
    font-size: 0.9375rem;
    color: #3d5574;
    margin: 0;
    line-height: 1.5;
    font-style: italic;
  }

  .confidence {
    font-size: 0.8125rem;
    color: #7d6c47;
    margin: 0;
    font-weight: 500;
  }

  .transcript-edit {
    font-family: 'Inter', sans-serif;
    font-size: 0.9375rem;
    padding: 0.75rem;
    border: 1px solid #d4a574;
    background-color: #fef9f0;
    color: #1a1510;
    resize: vertical;
    min-height: 100px;
    line-height: 1.5;
  }

  .transcript-edit:focus {
    outline: none;
    border-color: #9a442d;
    box-shadow: inset 0 0 0 2px rgba(154, 68, 45, 0.1);
  }

  .transcription-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn:disabled:hover {
    background-color: inherit;
  }

  .tag-display {
    background-color: #eef6ff;
    border-left: 4px solid #6b8caa;
    padding: 0.75rem;
    margin: 0.5rem 0;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #ffffff;
    border: 1px solid #d1dbe8;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .tag-chip.review {
    border-color: #d4a574;
    background: #fff7ec;
  }

  .tag-name {
    font-weight: 600;
    color: #3d5574;
  }

  .tag-type {
    color: #6b6250;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.6875rem;
  }

  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem 1rem;
    background-color: #f0f8f5;
    border: 1px solid #d1dbe8;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e8dcc8;
    border-top-color: #9a442d;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .spinner-container p {
    color: #3d5574;
    font-size: 0.9375rem;
    margin: 0;
  }
</style>
