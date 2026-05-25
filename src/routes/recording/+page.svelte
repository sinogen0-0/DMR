<script lang="ts">
  /**
   * Recording View - Twin Peaks Tape Deck Recorder
   * Physical device interface with REC/STOP buttons and oscilloscope display
   */

  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import OscilloscopeDisplay from '$lib/components/physical/OscilloscopeDisplay.svelte';
  import RetroButton from '$lib/components/physical/RetroButton.svelte';
  import { 
    createAudioService, 
    createTranscriptionService, 
    createStorageService,
    createExtractionService,
    createCategorizationService
  } from '$lib/services';
  import { soundService } from '$lib/services/soundService';
  import { hapticService } from '$lib/services/hapticService';
  import { isNative } from '$utils/platformDetector';
  import { Capacitor } from '@capacitor/core';
  import { DEVICE_LOG_EVENT_NAME, clearDeviceLogs, getDeviceLogs, logDevice, type DeviceLogEntry } from '$lib/utils/deviceLogger';
  import type { Recording } from '$lib/types';

  // Services
  let audioService = createAudioService();
  let transcriptionService = createTranscriptionService({ language: 'en-US' });
  let storageService = createStorageService();
  let extractionService = createExtractionService();
  let categorizationService = createCategorizationService();

  // Button states (only one can be pressed at a time, except STOP)
  type ButtonState = 'none' | 'rec';
  let activeButton: ButtonState = 'none';

  // Recording state
  let isRecording = false;
  let elapsedTime = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;
  
  // Carousel state for saved recordings
  let carouselIndex = 0;
  $: visibleRecording = savedRecordings[carouselIndex];
  
  function nextRecording() {
    if (carouselIndex < savedRecordings.length - 1) {
      carouselIndex++;
    }
  }
  
  function prevRecording() {
    if (carouselIndex > 0) {
      carouselIndex--;
    }
  }
  
  // Reset carousel when recordings change
  $: if (savedRecordings.length > 0 && carouselIndex >= savedRecordings.length) {
    carouselIndex = savedRecordings.length - 1;
  } else if (savedRecordings.length === 0) {
    carouselIndex = 0;
  }
  
  // Auto-scroll transcription to bottom when new text arrives
  $: if (currentTranscript && transcriptEndMarker) {
    setTimeout(() => {
      if (transcriptEndMarker) {
        transcriptEndMarker.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 50);
  }

  // Transcription state
  let currentTranscript = '';
  let transcriptionConfidence = 0;
  let isTranscribing = false;

  // Waveform visualization (simple amplitude bars)
  let waveformData: number[] = new Array(32).fill(0);

  // Microphone level monitoring
  let micLevel = 0; // 0-100
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let micStream: MediaStream | null = null;
  let micMonitorFrameId: number | null = null;
  let micMonitorActive = false;

  // Permission state
  let permissionGranted = false;
  let permissionChecking = false;
  let showPermissionModal = false;
  let canRequestPermission = true;
  let speechPermissionGranted = true;
  let speechCanRequest = true;
  let recordingPermissionEnabled = true;
  let transcriptionPermissionEnabled = true;
  let isNativePlatform = false;
  const recordingToggleStorageKey = 'recording.permission.toggle.recording';
  const transcriptionToggleStorageKey = 'recording.permission.toggle.transcription';
  let permissionTogglesLoaded = false;
  $: canRequestAnyPermission =
    (recordingPermissionEnabled && !permissionGranted && canRequestPermission) ||
    (transcriptionPermissionEnabled && isNativePlatform && !speechPermissionGranted && speechCanRequest);

  $: if (permissionTogglesLoaded && typeof window !== 'undefined') {
    localStorage.setItem(recordingToggleStorageKey, String(recordingPermissionEnabled));
    localStorage.setItem(transcriptionToggleStorageKey, String(transcriptionPermissionEnabled));
  }

  // Error state
  let errorMessage = '';

  // Processing state (after STOP is pressed)
  let isProcessing = false;
  let processingStage: 'saving' | 'transcribing' | 'extracting' | 'complete' | null = null;

  // Saved recordings list
  let savedRecordings: Recording[] = [];
  let loadingRecordings = false;
  let playingAudioId: string | null = null;
  let currentAudio: HTMLAudioElement | null = null;
  let deviceLogs: DeviceLogEntry[] = [];
  let showDebugConsole = true;
  
  // Transcription scroll reference
  let transcriptContainer: HTMLDivElement | null = null;
  let transcriptEndMarker: HTMLDivElement | null = null;
  
  // Test function to generate long text (Ctrl+Shift+T)
  function generateTestText() {
    const sentences = [
      "This is a test sentence to fill up the transcription area.",
      "We need to see if the auto-scroll functionality is working correctly.",
      "As more text is added, the container should automatically scroll to the bottom.",
      "The newest text should always remain visible to the user.",
      "Let's add more content to force the scrolling behavior.",
      "This will help us debug whether the scroll mechanism is functioning.",
      "Each new line should push the view downward automatically.",
      "The transcription area has a flex layout that should enable scrolling.",
      "We're testing the reactive statement that triggers on transcript updates.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
      "The quick brown fox jumps over the lazy dog multiple times in a row.",
      "Pack my box with five dozen liquor jugs and we'll call it a day.",
      "How vexingly quick daft zebras jump through the foggy morning mist.",
      "Sphinx of black quartz, judge my vow and see if it holds true.",
      "Waltz, bad nymph, for quick jigs vex in the moonlight hours.",
      "This should be enough text to trigger scrolling in the container."
    ];
    
    currentTranscript = sentences.join(' ');
    transcriptionConfidence = 0.95;
  }

  onMount(() => {
    isNativePlatform = Capacitor.isNativePlatform();
    loadPermissionToggles();
    deviceLogs = getDeviceLogs().slice(-30);
    const onDeviceLog = (event: Event) => {
      const customEvent = event as CustomEvent<DeviceLogEntry>;
      deviceLogs = [...deviceLogs, customEvent.detail].slice(-30);
    };
    window.addEventListener(DEVICE_LOG_EVENT_NAME, onDeviceLog as EventListener);
    
    // Add keyboard shortcut for test text (Ctrl+Shift+T for development)
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        generateTestText();
      }
    };
    window.addEventListener('keydown', handleKeyboard);

    void (async () => {
      await initializeServices();
      await checkPermissions();
      await loadSavedRecordings();
    })();

    // Timer for elapsed time
    timerId = setInterval(() => {
      if (isRecording) {
        elapsedTime = audioService.getElapsedTime();
      }
    }, 100);

    return () => {
      window.removeEventListener(DEVICE_LOG_EVENT_NAME, onDeviceLog as EventListener);
      window.removeEventListener('keydown', handleKeyboard);
      if (timerId) clearInterval(timerId);
      if (audioContext) void audioContext.close();
      if (micStream) micStream.getTracks().forEach(track => track.stop());
    };
  });

  async function initializeServices() {
    try {
      await storageService.initialize();
    } catch (error) {
      console.error('[RecordingView] Failed to initialize services:', error);
    }
  }

  function loadPermissionToggles() {
    if (typeof window === 'undefined') {
      return;
    }

    const savedRecordingToggle = localStorage.getItem(recordingToggleStorageKey);
    const savedTranscriptionToggle = localStorage.getItem(transcriptionToggleStorageKey);

    if (savedRecordingToggle !== null) {
      recordingPermissionEnabled = savedRecordingToggle === 'true';
    }

    if (savedTranscriptionToggle !== null) {
      transcriptionPermissionEnabled = savedTranscriptionToggle === 'true';
    }

    permissionTogglesLoaded = true;
  }

  async function loadSavedRecordings() {
    loadingRecordings = true;
    try {
      const recordings = await storageService.listRecordings();
      console.log('[RecordingView] Loaded recordings:', recordings.length);
      recordings.forEach((rec, i) => {
        console.log(`[RecordingView] Recording ${i}:`, {
          id: rec.id,
          hasBlob: !!rec.blob,
          hasBlobUrl: !!rec.blobUrl,
          blobSize: rec.blob?.size,
          size: rec.size,
          duration: rec.duration,
          format: rec.format,
          timestamp: new Date(rec.timestamp).toLocaleString()
        });
      });
      
      // Sort by most recent (show all recordings, even without transcriptions)
      savedRecordings = recordings
        .sort((a, b) => b.timestamp - a.timestamp);
      logDevice('RecordingView', 'saved recordings loaded', { count: savedRecordings.length });
    } catch (error) {
      console.error('[RecordingView] Failed to load recordings:', error);
      logDevice('RecordingView', 'loadSavedRecordings failed', { error: String(error) }, 'error');
    } finally {
      loadingRecordings = false;
    }
  }

  async function checkPermissions() {
    permissionChecking = true;
    try {
      if (recordingPermissionEnabled) {
        const result = await audioService.checkMicrophonePermission();
        permissionGranted = result.status === 'granted';
        canRequestPermission = result.canRequest;

        console.log('[RecordingView] Mic permission check result:', result);

        if (!permissionGranted && !result.canRequest) {
          errorMessage = result.reason || 'Microphone permission is disabled. Open device settings to enable it.';
        }
      } else {
        permissionGranted = true;
        canRequestPermission = false;
      }

      if (transcriptionPermissionEnabled && isNativePlatform) {
        try {
          const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
          const availability = await SpeechRecognition.available();
          if (!availability.available) {
            speechPermissionGranted = false;
            speechCanRequest = false;
          } else {
            const permission = await SpeechRecognition.checkPermissions();
            speechPermissionGranted = permission.speechRecognition === 'granted';
            speechCanRequest = permission.speechRecognition !== 'denied';
          }
        } catch (error) {
          console.warn('[RecordingView] Speech permission check failed:', error);
          speechPermissionGranted = false;
          speechCanRequest = true;
        }
      } else {
        speechPermissionGranted = true;
        speechCanRequest = false;
      }
      
      // Keep modal visible whenever a required permission is missing.
      showPermissionModal =
        (recordingPermissionEnabled && !permissionGranted) ||
        (transcriptionPermissionEnabled && isNativePlatform && !speechPermissionGranted);
    } catch (error) {
      console.error('[RecordingView] Permission check failed:', error);
      permissionGranted = false;
      canRequestPermission = false;
      speechPermissionGranted = false;
      speechCanRequest = false;
      showPermissionModal = true; // Show modal on error too
    } finally {
      permissionChecking = false;
    }
  }

  async function openDeviceSettings() {
    // Haptic + sound feedback
    await hapticService.buttonPress('action');
    soundService.playButtonClick('action');

    try {
      if (Capacitor.isNativePlatform()) {
        const { App } = await import('@capacitor/app');
        await App.openSettings();
        errorMessage = 'Opened app settings. Enable microphone permission, then return and tap Retry Check.';
        return;
      }

      errorMessage = 'Please enable microphone access from your browser site settings.';
    } catch (error: any) {
      errorMessage = error?.message || 'Unable to open settings automatically.';
    }
  }

  async function requestPermissions() {
    console.log('[RecordingView] Requesting required permissions...');
    
    // Haptic + sound feedback
    await hapticService.buttonPress('action');
    soundService.playButtonClick('action');
    
    permissionChecking = true;
    errorMessage = '';
    
    try {
      if (recordingPermissionEnabled && !permissionGranted) {
        const result = await audioService.requestMicrophonePermission();
        console.log('[RecordingView] Mic permission request result:', result);

        if (result.granted) {
          permissionGranted = true;
          canRequestPermission = true;
        } else {
          permissionGranted = false;
          canRequestPermission = false;
          errorMessage = result.reason || 'Microphone permission denied. Open device settings to enable it.';
        }
      }

      if (transcriptionPermissionEnabled && isNativePlatform && !speechPermissionGranted) {
        try {
          const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
          const speechRequest = await SpeechRecognition.requestPermissions();
          speechPermissionGranted = speechRequest.speechRecognition === 'granted';
          speechCanRequest = !speechPermissionGranted;
        } catch (speechError: any) {
          speechPermissionGranted = false;
          speechCanRequest = false;
          errorMessage = speechError?.message || 'Speech recognition permission denied. Open settings to enable it.';
        }
      }

      showPermissionModal =
        (recordingPermissionEnabled && !permissionGranted) ||
        (transcriptionPermissionEnabled && isNativePlatform && !speechPermissionGranted);

      if (!showPermissionModal) {
        soundService.playConfirm(); // Success sound
      } else {
        soundService.playError();
      }
    } catch (error: any) {
      console.error('[RecordingView] Permission request failed:', error);
      soundService.playError();
      errorMessage = error.message || 'Failed to request microphone permission.';
      permissionGranted = false;
      canRequestPermission = false;
      showPermissionModal = true;
    } finally {
      permissionChecking = false;
    }
  }

  async function handleToggleRecording() {
    if (isRecording) {
      // Stop recording
      await stopRecording();
      activeButton = 'none';
    } else {
      // Start recording
      console.log('[RecordingView] Toggle button pressed, permissionGranted:', permissionGranted);

      if (!recordingPermissionEnabled) {
        errorMessage = 'Recording is disabled in permission modal. Enable microphone recording to continue.';
        showPermissionModal = true;
        return;
      }

      // Always refresh permission status in case it changed in system settings.
      await checkPermissions();
      
      // If permission not granted, show the permission modal and wait for user action.
      if (!permissionGranted) {
        console.log('[RecordingView] Permission not granted, showing modal...');
        showPermissionModal = true;
        return;
      }

      if (activeButton === 'rec') {
        // Already recording, do nothing
        return;
      }

      // Start new recording
      await startRecording();
      if (isRecording) {
        activeButton = 'rec';
      } else {
        activeButton = 'none';
      }
    }
  }

  async function stopTranscriptionSafely(timeoutMs: number = 2500) {
    try {
      await Promise.race([
        transcriptionService.stopTranscription(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Transcription stop timeout')), timeoutMs);
        }),
      ]);
    } catch (error) {
      logDevice('RecordingView', 'stopTranscriptionSafely timeout/failure', { error: String(error) }, 'warn');
      console.warn('[RecordingView] stopTranscriptionSafely timeout/failure:', error);
    } finally {
      isTranscribing = false;
    }
  }

  async function startRecording() {
    errorMessage = '';
    
    try {
      const nativePlatform = isNative();
      console.log('[RecordingView] Starting recording:', {
        permissionGranted,
        nativePlatform,
        beforeState: audioService.getRecordingState(),
      });

      // Reset transcript state before starting either engine.
      currentTranscript = '';
      transcriptionConfidence = 0;

      // Start recorder first so record button does not bounce on speech engine failures.
      await audioService.startRecording();
      console.log('[RecordingView] audioService.startRecording() resolved:', {
        afterState: audioService.getRecordingState(),
      });

      // Start mic monitoring after recording has started.
      // On native platforms, this is best-effort and must never fail the recording flow.
      if (!nativePlatform) {
        await startMicrophoneMonitoring();
      } else {
        setTimeout(() => {
          void startMicrophoneMonitoring(true);
        }, 200);
      }

      isRecording = true;
      elapsedTime = 0;

      // Start waveform animation
      startWaveformAnimation();

      // Start transcription after recorder is running.
      // Native speech startup can be transiently busy, so retry briefly.
      if (transcriptionPermissionEnabled && transcriptionService.isSupported()) {
        if (nativePlatform) {
          let transcriptionStarted = false;
          for (let attempt = 1; attempt <= 3 && !transcriptionStarted && isRecording; attempt++) {
            transcriptionStarted = await startTranscription();
            if (!transcriptionStarted && attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, 250));
            }
          }

          if (!transcriptionStarted) {
            errorMessage = 'Live transcription could not start. Recording will continue.';
          }
        } else {
          const started = await startTranscription();
          if (!started) {
            errorMessage = 'Live transcription could not start. Recording will continue.';
          }
        }
      }

      console.log('[RecordingView] ✅ Recording started successfully');
    } catch (error) {
      console.error('[RecordingView] ❌ Failed to start recording:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[RecordingView] startRecording failure context:', {
        state: audioService.getRecordingState(),
        nativePlatform: isNative(),
        permissionGranted,
      });
      
      // More specific error messages
      if (errorMsg.includes('permission') || errorMsg.includes('Permission')) {
        errorMessage = '🎤 Microphone access denied. Click the lock icon in the address bar and allow microphone access.';
      } else if (errorMsg.toLowerCase().includes('busy')) {
        errorMessage = 'Speech recognizer is busy. Close other voice apps and try again.';
      } else if (errorMsg.includes('NotAllowedError')) {
        errorMessage = '🎤 Microphone blocked. Check your browser settings.';
      } else if (errorMsg.includes('NotFoundError')) {
        errorMessage = '🎤 No microphone found. Please connect a microphone.';
      } else {
        errorMessage = `Failed to start recording: ${errorMsg}`;
      }

      // If speech was started but recorder failed, stop speech so future runs are clean.
      if (isTranscribing) {
        await stopTranscriptionSafely(1200);
      }
      
      isRecording = false;
      stopMicrophoneMonitoring();
      activeButton = 'none';
      soundService.playError();
    }
  }

  async function stopRecording() {
    try {
      logDevice('RecordingView', 'stopRecording() start', {
        stateBeforeStop: audioService.getRecordingState(),
        elapsedTime,
      });
      console.log('[RecordingView] Stopping recording:', {
        stateBeforeStop: audioService.getRecordingState(),
        elapsedTime,
      });
      isProcessing = true;
      processingStage = 'saving';
      const wasTranscribing = isTranscribing;
      const nativePlatform = isNative();

      // On native, stop recorder first to release the mic before stopping speech recognition.
      let recordedAudio: Recording;
      if (nativePlatform) {
        recordedAudio = await audioService.stopRecording();
        logDevice('RecordingView', 'audioService.stopRecording() success', {
          phase: 'native-pre-transcription-stop',
          id: recordedAudio.id,
          format: recordedAudio.format,
          size: recordedAudio.size,
          duration: recordedAudio.duration,
        });

        if (wasTranscribing) {
          await stopTranscriptionSafely();
        }
      } else {
        // On web, keep existing order.
        if (wasTranscribing) {
          await stopTranscriptionSafely();
        }

        recordedAudio = await audioService.stopRecording();
        logDevice('RecordingView', 'audioService.stopRecording() success', {
          phase: 'web-post-transcription-stop',
          id: recordedAudio.id,
          format: recordedAudio.format,
          size: recordedAudio.size,
          duration: recordedAudio.duration,
        });
      }

      // Stop microphone monitoring
      stopMicrophoneMonitoring();

      // Stop waveform
      stopWaveformAnimation();

      console.log('[RecordingView] audioService.stopRecording() result:', {
        id: recordedAudio.id,
        format: recordedAudio.format,
        duration: recordedAudio.duration,
        size: recordedAudio.size,
        hasBlob: !!recordedAudio.blob,
        hasBlobUrl: !!recordedAudio.blobUrl,
      });
      isRecording = false;
      elapsedTime = 0;

      const savedRecord: Recording = {
        id: recordedAudio.id,
        timestamp: recordedAudio.timestamp,
        duration: recordedAudio.duration,
        format: recordedAudio.format,
        size: recordedAudio.size || 0,
        blob: recordedAudio.blob,
        blobUrl: recordedAudio.blobUrl,
        transcription: currentTranscript || undefined,
        transcriptionStatus: currentTranscript ? 'completed' : (wasTranscribing ? 'failed' : 'none'),
        transcriptionError: !currentTranscript && wasTranscribing ? 'No speech detected or permission denied' : undefined,
      };

      // Save recording (critical path)
      await storageService.saveRecording(savedRecord);
      logDevice('RecordingView', 'storageService.saveRecording() success', {
        id: savedRecord.id,
      });
      console.log('[RecordingView] saveRecording() completed:', {
        id: savedRecord.id,
        format: savedRecord.format,
        size: savedRecord.size,
      });

      // Reload saved recordings list (non-critical, fallback to optimistic UI update)
      try {
        await loadSavedRecordings();
      } catch (loadError) {
        console.error('[RecordingView] loadSavedRecordings() failed after save:', loadError);
        logDevice('RecordingView', 'loadSavedRecordings failed after save; optimistic insert', {
          error: String(loadError),
          id: savedRecord.id,
        }, 'warn');
        savedRecordings = [savedRecord, ...savedRecordings.filter((r) => r.id !== savedRecord.id)];
      }

      // Process recording (extract entities, categorize)
      if (currentTranscript.trim()) {
        try {
          await processRecording(recordedAudio.id, currentTranscript);
        } catch (processError) {
          console.error('[RecordingView] processRecording() failed:', processError);
          processingStage = 'complete';
          setTimeout(() => {
            isProcessing = false;
            processingStage = null;
          }, 1500);
        }
      } else {
        processingStage = 'complete';
        setTimeout(() => {
          isProcessing = false;
          processingStage = null;
        }, 1500);
      }

      console.log('[RecordingView] Recording stopped and saved');
      logDevice('RecordingView', 'stopRecording() complete', { savedCount: savedRecordings.length });
    } catch (error) {
      console.error('[RecordingView] Failed to stop recording:', error);
      logDevice('RecordingView', 'stopRecording() failed', { error: String(error) }, 'error');
      console.error('[RecordingView] stopRecording failure context:', {
        state: audioService.getRecordingState(),
        isRecording,
      });
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorMessage = `Failed to stop and save recording: ${errorMsg}`;
      isProcessing = false;
      processingStage = null;
    }
  }

  async function startTranscription(): Promise<boolean> {
    try {
      isTranscribing = true;
      logDevice('RecordingView', 'startTranscription() called');

      await transcriptionService.startTranscription((result) => {
        currentTranscript = result.text;
        transcriptionConfidence = result.confidence;
        logDevice('RecordingView', 'transcription update', {
          textLength: result.text.length,
          preview: result.text.slice(0, 80),
          isFinal: result.isFinal,
        });
        console.log('[RecordingView] Transcription update:', { 
          text: result.text.substring(0, 50), 
          confidence: result.confidence,
          isFinal: result.isFinal 
        });
      });

      return true;
    } catch (error) {
      console.error('[RecordingView] Transcription failed:', error);
      logDevice('RecordingView', 'startTranscription() failed', { error: String(error) }, 'error');
      isTranscribing = false;
      if (error instanceof Error && error.message.includes('permission')) {
        errorMessage = 'Transcription requires microphone permission';
      } else if (error instanceof Error) {
        errorMessage = `Live transcription failed: ${error.message}`;
      } else {
        errorMessage = 'Live transcription failed to start';
      }

      return false;
    }
  }

  async function processRecording(recordingId: string, transcript: string) {
    try {
      processingStage = 'extracting';

      // Extract entities
      const entities = await extractionService.extractFromText(transcript);

      // Categorize entities
      const categorizedEntities = [];
      for (const entity of entities) {
        const result = await categorizationService.categorizeEntity(entity.text, transcript);
        categorizedEntities.push({
          ...entity,
          type: result.type,
          confidence: result.confidence,
        });
      }

      // Update recording with extracted entities
      await storageService.updateRecording(recordingId, {
        extractedEntities: categorizedEntities,
      });

      processingStage = 'complete';

      // Navigate to review if entities found
      if (categorizedEntities.length > 0) {
        setTimeout(() => {
          goto(`/transcriptions/${recordingId}/review`);
        }, 1000);
      } else {
        setTimeout(() => {
          isProcessing = false;
          processingStage = null;
        }, 1500);
      }
    } catch (error) {
      console.error('[RecordingView] Processing failed:', error);
      processingStage = 'complete';
      setTimeout(() => {
        isProcessing = false;
        processingStage = null;
      }, 1500);
    }
  }

  function startWaveformAnimation() {
    // Note: Waveform data is now updated by microphone monitoring in real-time
    // This function is kept for compatibility but doesn't do anything
    // since real audio data is used from the analyser node
  }

  function stopWaveformAnimation() {
    // Waveform data is cleared by stopMicrophoneMonitoring()
    waveformData = new Array(32).fill(0);
  }

  async function startMicrophoneMonitoring(nonBlocking: boolean = false) {
    try {
      // Clean up any previous monitor session before starting a new one.
      stopMicrophoneMonitoring();

      // Create separate stream for monitoring.
      // On native, keep this best-effort so recording can continue even if this fails.
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      
      // Create audio context and analyser
      audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(micStream);
      source.connect(analyser);
      
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const timeData = new Uint8Array(analyser.fftSize);
      
      // Monitor mic level continuously
      const monitorLevel = () => {
        if (!analyser) return;
        
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        
        // Use RMS from time-domain signal for a stable mic-level meter.
        let sumSquares = 0;
        for (const sample of timeData) {
          const normalized = (sample - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        micLevel = Math.min(100, Math.round(rms * 180));
        
        // Update waveform with real audio data
        const step = Math.max(1, Math.floor(freqData.length / 32));
        waveformData = Array.from({ length: 32 }, (_, i) => {
          const value = freqData[i * step] || 0;
          return value / 255;
        });

        micMonitorFrameId = requestAnimationFrame(monitorLevel);
      };
      
      monitorLevel();
      micMonitorActive = true;
      console.log('[RecordingView] ✅ Microphone monitoring started');
    } catch (error) {
      console.error('[RecordingView] Failed to start mic monitoring:', error);
      micMonitorActive = false;
      if (!nonBlocking) {
        // Don't throw - this is just for visualization
      }
    }
  }

  function stopMicrophoneMonitoring() {
    if (micMonitorFrameId !== null) {
      cancelAnimationFrame(micMonitorFrameId);
      micMonitorFrameId = null;
    }
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    analyser = null;
    micMonitorActive = false;
    micLevel = 0;
    console.log('[RecordingView] Microphone monitoring stopped');
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function getProcessingMessage(): string {
    switch (processingStage) {
      case 'saving':
        return 'SAVING RECORDING...';
      case 'transcribing':
        return 'TRANSCRIBING AUDIO...';
      case 'extracting':
        return 'EXTRACTING ENTITIES...';
      case 'complete':
        return 'COMPLETE';
      default:
        return '';
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function truncateText(text: string, maxLength: number = 80): string {
    if (!text) return '[No transcription]';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  function openRecording(id: string) {
    goto(`/transcriptions/${id}`);
  }

  function toggleAudioPlayback(recording: Recording) {
    console.log('[RecordingView] Toggle playback for:', recording.id, {
      hasBlob: !!recording.blob,
      hasBlobUrl: !!recording.blobUrl,
      blobSize: recording.blob?.size,
      size: recording.size,
      format: recording.format,
      duration: recording.duration
    });

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // If clicking the same recording, just stop
    if (playingAudioId === recording.id) {
      playingAudioId = null;
      return;
    }

    // Create and play new audio
    if (recording.blob || recording.blobUrl || recording.path) {
      const audioUrl = recording.blobUrl
        || (recording.blob ? URL.createObjectURL(recording.blob) : undefined)
        || (recording.path ? Capacitor.convertFileSrc(recording.path) : undefined);

      if (!audioUrl) {
        console.warn('[RecordingView] Unable to resolve audio URL for playback');
        return;
      }
      console.log('[RecordingView] Creating Audio element with URL:', audioUrl);
      
      currentAudio = new Audio(audioUrl);
      currentAudio.volume = 1.0; // Ensure volume is max
      playingAudioId = recording.id;

      currentAudio.onloadedmetadata = () => {
        console.log('[RecordingView] Audio metadata loaded:', {
          duration: currentAudio!.duration,
          readyState: currentAudio!.readyState,
          volume: currentAudio!.volume,
          muted: currentAudio!.muted
        });
      };

      currentAudio.onended = () => {
        console.log('[RecordingView] Audio playback ended');
        playingAudioId = null;
        currentAudio = null;
      };

      currentAudio.onerror = (e) => {
        console.error('[RecordingView] Audio playback error:', e, currentAudio?.error);
        playingAudioId = null;
        currentAudio = null;
        errorMessage = 'Failed to play audio';
      };

      console.log('[RecordingView] Starting playback...');
      currentAudio.play()
        .then(() => {
          console.log('[RecordingView] ✅ Playback started successfully');
        })
        .catch(err => {
          console.error('[RecordingView] ❌ Playback failed:', err);
          errorMessage = `Playback error: ${err.message}`;
        });
    } else {
      console.warn('[RecordingView] No blob or blobUrl available for playback');
    }
  }

  function getTranscriptionStatusLabel(status?: string): string {
    switch (status) {
      case 'processing': return '⏳ Processing...';
      case 'completed': return '';
      case 'failed': return '⚠ Transcription failed';
      case 'none': return '🎤 Audio only';
      default: return '⏳ Pending transcription';
    }
  }

  function formatDebugTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  function clearDebugConsole() {
    clearDeviceLogs();
    deviceLogs = [];
    logDevice('RecordingView', 'debug console cleared');
  }
</script>

<div class="recording-view">
  <!-- Microphone Permission Prompt (if needed) -->
  {#if showPermissionModal && !permissionChecking}
    <div class="permission-overlay">
      <div class="permission-modal">
        <div class="modal-icon">🎤</div>
        <div class="modal-title">Permissions Required</div>
        <div class="modal-message">
          Enable the capabilities you want, then grant the required permissions.
        </div>

        <div class="permission-toggles">
          <label class="permission-toggle-row">
            <span class="toggle-copy">
              <span class="toggle-title">Microphone Recording</span>
              <span class="toggle-status crt-text-dim">
                {#if !recordingPermissionEnabled}
                  OFF
                {:else if permissionGranted}
                  GRANTED
                {:else}
                  REQUIRED
                {/if}
              </span>
            </span>
            <input type="checkbox" bind:checked={recordingPermissionEnabled} on:change={checkPermissions} />
          </label>

          <label class="permission-toggle-row">
            <span class="toggle-copy">
              <span class="toggle-title">Speech Recognition</span>
              <span class="toggle-status crt-text-dim">
                {#if !transcriptionPermissionEnabled}
                  OFF
                {:else if speechPermissionGranted || !isNativePlatform}
                  GRANTED
                {:else}
                  REQUIRED
                {/if}
              </span>
            </span>
            <input type="checkbox" bind:checked={transcriptionPermissionEnabled} on:change={checkPermissions} />
          </label>
        </div>

        {#if canRequestAnyPermission}
          <button class="permission-button" on:click={requestPermissions}>
            Grant Permissions
          </button>
        {:else}
          <button class="permission-button" on:click={openDeviceSettings}>
            Open Settings
          </button>
        {/if}
        <button class="permission-button secondary" on:click={checkPermissions}>
          Retry Check
        </button>
        <div class="modal-hint crt-text-dim">
          {#if canRequestAnyPermission}
            Android may prompt once for microphone and once for speech recognition.
          {:else}
            If prompts are blocked, enable permissions in device settings, then tap Retry Check.
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Display Section (70%) -->
  <div class="display-section">
    <!-- Oscilloscope Display (Status, Timer, Waveform) -->
    <OscilloscopeDisplay className="recording-display">
      <div class="display-content">
        <!-- Header -->
        <div class="display-header">
          <div class="header-title crt-text-bright">FIELD LOG: RECORDER</div>
          <div class="status-indicator">
            {#if permissionChecking}
              <span class="led warning pulse"></span>
              <span class="crt-text-dim">CHECKING...</span>
            {:else if permissionGranted}
              <span class="led ready"></span>
              <span class="crt-text-dim">MIC READY</span>
            {:else}
              <span class="led active"></span>
              <span class="crt-text-dim">NO PERMISSION</span>
            {/if}
          </div>
        </div>

        <div class="divider"></div>

        <!-- Timer Display -->
        <div class="timer-display crt-text-bright">
          {formatTime(elapsedTime)}
        </div>

        <!-- Microphone Level Indicator -->
        {#if isRecording}
          <div class="mic-level-container">
            <span class="mic-level-label crt-text-dim">MIC</span>
            <div class="mic-level-bar">
              <div 
                class="mic-level-fill {micMonitorActive && micLevel > 5 ? 'active' : 'inactive'}"
                style="width: {micMonitorActive ? micLevel : 0}%;"
              ></div>
            </div>
            <span class="mic-level-value crt-text-dim">{micMonitorActive ? `${micLevel}%` : '--'}</span>
          </div>
        {/if}

        <!-- Waveform Visualization -->
        <div class="waveform">
          {#each waveformData as amplitude}
            <div 
              class="waveform-bar"
              style="height: {amplitude * 100}%;"
            ></div>
          {/each}
        </div>
      </div>
    </OscilloscopeDisplay>

    <!-- Transcription Area (Independent Scrolling) -->
    <div class="transcription-section">
      <div class="transcription-area" bind:this={transcriptContainer}>
        {#if isProcessing}
          <div class="processing-indicator crt-text">
            <span class="led pulse active"></span>
            <span>&gt; {getProcessingMessage()}</span>
          </div>
        {:else if currentTranscript}
          <div class="transcript-content">
            <div class="transcript-label crt-text-dim">&gt; TRANSCRIPTION</div>
            <div class="transcript-text crt-text">
              {currentTranscript}
              {#if isTranscribing}
                <span class="crt-cursor"></span>
              {/if}
            </div>
            {#if transcriptionConfidence > 0}
              <div class="confidence crt-text-dim">
                CONFIDENCE: {Math.round(transcriptionConfidence * 100)}%
              </div>
            {/if}
            <!-- Invisible marker at the end for auto-scroll -->
            <div bind:this={transcriptEndMarker} style="height: 1px;"></div>
          </div>
        {:else if isRecording && isTranscribing}
          <div class="waiting-for-speech crt-text-dim">
            &gt; LISTENING...
          </div>
        {:else if !isRecording}
          <div class="idle-message crt-text-dim">
            &gt; PRESS REC TO BEGIN
          </div>
        {/if}
      </div>

      {#if errorMessage}
        <div class="error-banner">
          <span class="led active"></span>
          <span class="crt-text" style="color: var(--color-button-record)">
            ERROR: {errorMessage}
          </span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Transcriptions Carousel -->
  <div class="transcriptions-carousel">
    <div class="carousel-header crt-text-dim">
      <button 
        class="carousel-nav" 
        on:click={prevRecording}
        disabled={carouselIndex === 0 || savedRecordings.length === 0}
      >◀</button>
      <div class="carousel-title">
        <span>SAVED TRANSCRIPTIONS</span>
        <span class="count-badge">{savedRecordings.length > 0 ? `${carouselIndex + 1}/${savedRecordings.length}` : '0'}</span>
      </div>
      <button 
        class="carousel-nav" 
        on:click={nextRecording}
        disabled={carouselIndex >= savedRecordings.length - 1 || savedRecordings.length === 0}
      >▶</button>
    </div>
    <div class="carousel-content">
      {#if loadingRecordings}
        <div class="list-empty crt-text-dim">&gt; LOADING...</div>
      {:else if savedRecordings.length === 0}
        <div class="list-empty crt-text-dim">&gt; NO TRANSCRIPTIONS YET</div>
      {:else if visibleRecording}
        <div class="transcription-item-container">
          <button
            class="transcription-item"
            class:has-transcription={visibleRecording.transcriptionStatus === 'completed'}
            class:failed={visibleRecording.transcriptionStatus === 'failed'}
            on:click={() => visibleRecording.transcriptionStatus === 'completed' ? openRecording(visibleRecording.id) : null}
            disabled={visibleRecording.transcriptionStatus !== 'completed'}
          >
            <div class="item-header">
              <span class="item-date crt-text-dim">{formatDate(visibleRecording.timestamp)}</span>
              <span class="item-duration crt-text-dim">{formatTime(visibleRecording.duration)}</span>
            </div>
            
            {#if visibleRecording.transcriptionStatus === 'completed' && visibleRecording.transcription}
              <div class="item-transcript crt-text">
                {truncateText(visibleRecording.transcription)}
              </div>
            {:else}
              <div class="item-status crt-text-dim">
                {getTranscriptionStatusLabel(visibleRecording.transcriptionStatus)}
              </div>
            {/if}
          </button>
          
          <!-- Audio playback button -->
          {#if visibleRecording.blob || visibleRecording.blobUrl || visibleRecording.path}
            <button
              class="audio-play-button"
              class:playing={playingAudioId === visibleRecording.id}
              on:click|stopPropagation={() => toggleAudioPlayback(visibleRecording)}
              title={playingAudioId === visibleRecording.id ? 'Stop' : 'Play audio'}
            >
              {playingAudioId === visibleRecording.id ? '⏸' : '▶'}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Controls Section -->
  <div class="controls-section">
    <button 
      class="toggle-rec-button" 
      class:recording={isRecording}
      disabled={isProcessing}
      on:click={handleToggleRecording}
    >
      <span class="button-face">
        <span class="button-label">{isRecording ? 'STOP' : 'RECORD'}</span>
        <span class="button-indicator" class:active={isRecording}></span>
      </span>
    </button>
  </div>

  <!-- Debug console hidden by default -->
  <!-- Uncomment to show debug logs: 
  <div class="debug-console" style="display: none;">
    ...
  </div>
  -->
</div>

<style>
  .recording-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-device-bg);
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    position: relative;
  }

  /* Permission Overlay */
  .permission-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 300ms ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .permission-modal {
    background: linear-gradient(180deg, #2a2a2a 0%, #1f1f1f 100%);
    border: 2px solid rgba(0, 255, 65, 0.3);
    border-radius: 12px;
    padding: 32px 28px;
    max-width: 340px;
    text-align: center;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.8),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 20px rgba(0, 255, 65, 0.2);
    animation: scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .modal-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
    filter: drop-shadow(0 0 8px rgba(0, 255, 65, 0.3));
  }

  .modal-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-phosphor-green);
    text-shadow: 0 0 8px rgba(0, 255, 65, 0.6);
    margin-bottom: 12px;
    letter-spacing: 0.05em;
  }

  .modal-message {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .permission-toggles {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  .permission-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(0, 255, 65, 0.25);
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .toggle-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .toggle-title {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-phosphor-green);
  }

  .toggle-status {
    font-size: 0.68rem;
    letter-spacing: 0.08em;
  }

  .permission-toggle-row input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: var(--color-phosphor-green);
    cursor: pointer;
  }

  .permission-button {
    width: 100%;
    padding: 14px 24px;
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-device-bg);
    background: var(--color-phosphor-green);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 4px 0 0 rgba(0, 180, 45, 1),
      0 6px 16px rgba(0, 255, 65, 0.4);
  }

  .permission-button.secondary {
    margin-top: 10px;
    background: transparent;
    color: var(--color-phosphor-green);
    border: 1px solid rgba(0, 255, 65, 0.4);
    box-shadow: none;
  }

  .permission-button:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 6px 0 0 rgba(0, 180, 45, 1),
      0 8px 20px rgba(0, 255, 65, 0.6);
  }

  .permission-button:active {
    transform: translateY(2px);
    box-shadow: 
      0 2px 0 0 rgba(0, 180, 45, 1),
      0 4px 12px rgba(0, 255, 65, 0.3);
  }

  .modal-hint {
    font-size: 0.75rem;
    margin-top: 16px;
    opacity: 0.6;
  }

  /* Display Section - Flexible */
  .display-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    min-height: 0;
  }

  /* Transcriptions Carousel */
  .transcriptions-carousel {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 65, 0.2);
    border-radius: 4px;
    overflow: hidden;
  }

  .carousel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    font-size: 0.7rem;
    font-weight: bold;
    letter-spacing: 0.1em;
    border-bottom: 1px solid rgba(0, 255, 65, 0.2);
    background: rgba(0, 0, 0, 0.4);
    gap: 8px;
  }

  .carousel-title {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  .carousel-nav {
    background: transparent;
    border: 1px solid rgba(0, 255, 65, 0.3);
    color: var(--color-phosphor-green);
    font-size: 1rem;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-family: var(--font-label);
    transition: all 50ms;
    border-radius: 0;
  }

  .carousel-nav:hover:not(:disabled) {
    background: rgba(0, 255, 65, 0.1);
    border-color: var(--color-phosphor-green);
  }

  .carousel-nav:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .carousel-content {
    padding: 8px;
  }

  .count-badge {
    background: rgba(0, 255, 65, 0.2);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
  }

  .list-empty {
    padding: var(--spacing-md);
    text-align: center;
    font-size: 0.85rem;
  }

  .transcription-item-container {
    position: relative;
    display: flex;
    gap: var(--spacing-xs);
    align-items: stretch;
  }

  .transcription-item {
    flex: 1;
    padding: var(--spacing-sm);
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 65, 0.15);
    border-radius: 4px;
    cursor: pointer;
    transition: all 150ms;
    text-align: left;
  }

  .transcription-item.has-transcription:hover {
    background: rgba(0, 255, 65, 0.1);
    border-color: rgba(0, 255, 65, 0.4);
    transform: translateX(2px);
  }

  .transcription-item:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .transcription-item.failed {
    border-color: rgba(255, 100, 100, 0.3);
  }

  .audio-play-button {
    width: 40px;
    height: auto;
    min-height: 100%;
    background: rgba(0, 255, 65, 0.15);
    border: 1px solid rgba(0, 255, 65, 0.3);
    border-radius: 4px;
    color: var(--color-phosphor-green);
    font-size: 1rem;
    cursor: pointer;
    transition: all 150ms;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .audio-play-button:hover {
    background: rgba(0, 255, 65, 0.25);
    border-color: rgba(0, 255, 65, 0.5);
    transform: scale(1.05);
  }

  .audio-play-button.playing {
    background: rgba(0, 255, 65, 0.3);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
    font-size: 0.7rem;
  }

  .item-date {
    font-weight: 600;
  }

  .item-duration {
    opacity: 0.7;
  }

  .item-transcript {
    font-size: 0.8rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-status {
    font-size: 0.75rem;
    font-style: italic;
    opacity: 0.8;
  }

  /* Scrollbar styling */
  .transcriptions-list::-webkit-scrollbar {
    width: 6px;
  }

  .transcriptions-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  .transcriptions-list::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 65, 0.3);
    border-radius: 3px;
  }

  .transcriptions-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 65, 0.5);
  }

  .recording-display {
    flex: 0 0 auto;
    min-height: 220px;
  }

  .display-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Header */
  .display-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title {
    font-size: 0.9rem;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.7rem;
  }

  .divider {
    height: 1px;
    background: var(--color-phosphor-green-dim);
    opacity: 0.3;
    box-shadow: 0 0 2px var(--color-phosphor-glow);
    margin: 2px 0;
  }

  /* Transcription Section (Independent from oscilloscope) */
  .transcription-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-crt-bg);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 
      0 0 20px rgba(0, 255, 65, 0.3),
      inset 0 0 40px rgba(0, 255, 65, 0.1),
      inset 0 0 0 1px rgba(0, 255, 65, 0.2);
    padding: 8px;
  }

  /* Timer */
  .timer-display {
    font-size: 2rem;
    text-align: center;
    letter-spacing: 0.1em;
    font-weight: bold;
    text-shadow: var(--shadow-text-glow);
  }

  /* Microphone Level Indicator */
  .mic-level-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 4px 8px;
    margin: 2px 0;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border-dim);
    border-radius: 4px;
  }

  .mic-level-label {
    font-size: 0.9rem;
    font-weight: bold;
    min-width: 40px;
  }

  .mic-level-bar {
    flex: 1;
    height: 20px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-border-dim);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }

  .mic-level-fill {
    height: 100%;
    transition: width 0.1s ease-out;
    border-radius: 1px;
  }

  .mic-level-fill.active {
    background: var(--color-phosphor-green);
    box-shadow: 0 0 8px var(--color-phosphor-glow);
  }

  .mic-level-fill.inactive {
    background: var(--color-error);
    box-shadow: 0 0 4px rgba(255, 0, 0, 0.5);
  }

  .mic-level-value {
    font-size: 0.85rem;
    min-width: 45px;
    text-align: right;
    font-family: 'Courier New', monospace;
  }

  /* Waveform */
  .waveform {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 60px;
    gap: 2px;
    padding: 4px 0;
  }

  .waveform-bar {
    flex: 1;
    background: var(--color-phosphor-green);
    box-shadow: 0 0 4px var(--color-phosphor-glow);
    min-height: 2px;
    transition: height 50ms linear;
  }

  /* Transcription */
  .transcription-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    scroll-behavior: smooth;
  }

  /* Scrollbar styling for transcription area */
  .transcription-area::-webkit-scrollbar {
    width: 6px;
  }

  .transcription-area::-webkit-scrollbar-track {
    background: var(--color-crt-bg-light);
  }

  .transcription-area::-webkit-scrollbar-thumb {
    background: var(--color-phosphor-green-dim);
    border-radius: 3px;
  }

  .transcription-area::-webkit-scrollbar-thumb:hover {
    background: var(--color-phosphor-green);
  }
  
  /* Scrollbar styling for transcription area */
  .transcription-area::-webkit-scrollbar {
    width: 6px;
  }

  .transcription-area::-webkit-scrollbar-track {
    background: var(--color-crt-bg-light);
  }

  .transcription-area::-webkit-scrollbar-thumb {
    background: var(--color-phosphor-green-dim);
    border-radius: 3px;
  }

  .transcription-area::-webkit-scrollbar-thumb:hover {
    background: var(--color-phosphor-green);
  }

  .transcript-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .transcript-label {
    font-size: 0.75rem;
    letter-spacing: 0.1em;
  }

  .transcript-text {
    font-size: 1rem;
    line-height: 1.6;
    font-family: var(--font-display);
    word-wrap: break-word;
    white-space: pre-wrap;
  }

  .confidence {
    font-size: 0.7rem;
    margin-top: var(--spacing-xs);
  }

  .waiting-for-speech,
  .idle-message {
    font-size: 1rem;
    text-align: center;
    padding: var(--spacing-lg);
  }

  .processing-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.9rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: rgba(255, 68, 0, 0.1);
    border: 1px solid var(--color-button-record);
    margin-top: var(--spacing-sm);
  }

  /* Controls Section - Fixed height for buttons */
  .controls-section {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--spacing-lg) 0;
  }
  
  .toggle-rec-button {
    position: relative;
    width: 200px;
    height: 80px;
    background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 3px solid var(--color-accent-coral);
    border-radius: 0;
    font-family: var(--font-label);
    font-size: 1.2rem;
    font-weight: bold;
    letter-spacing: 0.15em;
    color: var(--color-accent-coral);
    cursor: pointer;
    transition: none;
    box-shadow: 
      0 4px 0 0 rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .toggle-rec-button:hover:not(:disabled) {
    background: linear-gradient(180deg, #333 0%, #222 100%);
    box-shadow: 
      0 4px 0 0 rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .toggle-rec-button:active:not(:disabled),
  .toggle-rec-button.recording {
    transform: translateY(4px);
    box-shadow: 
      0 0 0 0 rgba(0, 0, 0, 0.5),
      inset 0 2px 8px rgba(0, 0, 0, 0.6);
    background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
  }

  .toggle-rec-button.recording {
    border-color: var(--color-terminal-border);
    color: var(--color-terminal-border);
  }

  .toggle-rec-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-face {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    width: 100%;
    height: 100%;
  }

  .button-label {
    font-size: 1.2rem;
    letter-spacing: 0.15em;
  }

  .button-indicator {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-radius: 0;
    background: transparent;
    transition: none;
  }

  .button-indicator.active {
    background: currentColor;
    animation: pulse-indicator 2s ease-in-out infinite;
  }

  @keyframes pulse-indicator {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .debug-console {
    border: 1px solid rgba(0, 255, 65, 0.25);
    background: rgba(0, 0, 0, 0.45);
    border-radius: 6px;
    padding: 8px;
    max-height: 220px;
  }

  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .debug-actions {
    display: flex;
    gap: 6px;
  }

  .debug-action {
    border: 1px solid rgba(0, 255, 65, 0.35);
    background: transparent;
    color: rgba(0, 255, 65, 0.9);
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .debug-logs {
    overflow: auto;
    max-height: 170px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .debug-line {
    font-size: 11px;
    line-height: 1.3;
    padding-bottom: 4px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
  }

  .debug-line.warn {
    color: #ffd27a;
  }

  .debug-line.error {
    color: #ff8f8f;
  }

  .debug-time {
    color: rgba(255, 255, 255, 0.65);
    margin-right: 6px;
  }

  .debug-source {
    color: rgba(0, 255, 65, 0.95);
    margin-right: 6px;
  }

  .debug-meta {
    margin: 4px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(255, 255, 255, 0.75);
  }

  /* Mobile Optimization for Small Displays (480x854 and similar) */
  @media (max-height: 900px) {
    /* Reduce overall container spacing */
    .recording-view {
      gap: 4px;
      padding: 4px;
    }

    /* Compress display section */
    .display-section {
      gap: 6px;
    }

    /* Compress oscilloscope display */
    .recording-display {
      min-height: 160px;
    }

    /* Reduce internal padding of oscilloscope component */
    .recording-display :global(.oscilloscope-content) {
      padding: 8px;
    }

    .display-content {
      gap: 2px;
    }

    /* Reduce header sizes */
    .display-header {
      margin-bottom: 2px;
    }

    .header-title {
      font-size: 0.75rem;
    }

    .status-indicator {
      gap: 4px;
      font-size: 0.65rem;
    }

    /* Compress timer */
    .timer-display {
      font-size: 1.5rem;
      padding: 4px 0;
    }

    /* Reduce mic level indicator */
    .mic-level-container {
      padding: 3px 6px;
      margin: 2px 0;
    }

    .mic-level-bar {
      height: 16px;
    }

    .mic-level-label {
      font-size: 0.75rem;
      min-width: 35px;
    }

    .mic-level-value {
      font-size: 0.75rem;
      min-width: 38px;
    }

    /* Compress waveform */
    .waveform {
      height: 45px;
      padding: 2px 0;
    }

    /* Compress transcription section */
    .transcription-section {
      padding: 6px;
    }

    .transcript-text {
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .transcript-label {
      font-size: 0.65rem;
    }

    .confidence {
      font-size: 0.65rem;
    }

    .waiting-for-speech,
    .idle-message {
      font-size: 0.8rem;
      padding: var(--spacing-md);
    }

    /* Compress carousel */
    .transcriptions-carousel {
      max-height: 100px;
    }

    .carousel-header {
      padding: 4px 6px;
      font-size: 0.65rem;
    }

    .carousel-nav {
      width: 28px;
      height: 28px;
      font-size: 0.9rem;
    }

    .carousel-content {
      padding: 6px;
    }

    .transcription-item {
      padding: 6px;
    }

    .item-header {
      font-size: 0.65rem;
      margin-bottom: 4px;
    }

    .item-transcript {
      font-size: 0.75rem;
    }

    .item-status {
      font-size: 0.7rem;
    }

    .audio-play-button {
      width: 36px;
      font-size: 0.9rem;
    }

    .count-badge {
      font-size: 0.65rem;
      padding: 2px 6px;
    }

    /* Compress controls section */
    .controls-section {
      padding: 6px 0;
    }

    .toggle-rec-button {
      width: 180px;
      height: 65px;
      border-width: 2px;
    }

    .toggle-rec-button:active:not(:disabled),
    .toggle-rec-button.recording {
      transform: translateY(3px);
    }

    .button-label {
      font-size: 1rem;
      letter-spacing: 0.12em;
    }

    .button-indicator {
      width: 10px;
      height: 10px;
    }

    /* Compress permission modal for mobile */
    .permission-modal {
      padding: 24px 20px;
      max-width: 300px;
    }

    .modal-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }

    .modal-title {
      font-size: 1rem;
      margin-bottom: 10px;
    }

    .modal-message {
      font-size: 0.85rem;
      margin-bottom: 20px;
    }

    .permission-button {
      padding: 12px 20px;
      font-size: 0.9rem;
    }

    .modal-hint {
      font-size: 0.7rem;
      margin-top: 14px;
    }
  }
</style>
