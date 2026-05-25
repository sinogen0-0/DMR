<script lang="ts">
  /**
   * Ask View - Question Answering Interface
   * Record questions, process with ML, display answers with sources
   */

  import { onMount } from 'svelte';
  import OscilloscopeDisplay from '$lib/components/physical/OscilloscopeDisplay.svelte';
  import RetroButton from '$lib/components/physical/RetroButton.svelte';
  import { createAudioService, createTranscriptionService, answerService, type AnswerResult } from '$lib/services';
  import type { AnyDossier } from '$lib/types/dossier';

  // Services
  const audioService = createAudioService();
  const transcriptionService = createTranscriptionService();

  // State machine
  type ViewState = 'idle' | 'recording' | 'processing' | 'displaying' | 'error';
  let state: ViewState = 'idle';

  // Recording state
  let isRecording = false;
  let questionTranscript = '';
  let transcriptionConfidence = 0;

  // Answer state
  let currentAnswer: AnswerResult | null = null;

  // Conversation history (last 5 Q&A pairs)
  interface ConversationEntry {
    question: string;
    answer: string;
    timestamp: Date;
  }
  let conversationHistory: ConversationEntry[] = [];

  // ML model loading
  let isModelLoading = false;
  let modelReady = false;
  let loadingProgress = 0;

  // Error state
  let errorMessage = '';

  onMount(async () => {
    // Initialize answer service and start loading model in background
    isModelLoading = true;
    try {
      await answerService.initialize();
      modelReady = answerService.isReady();
      isModelLoading = false;
      console.log('[AskView] Answer service initialized');
    } catch (error) {
      console.error('[AskView] Failed to initialize:', error);
      isModelLoading = false;
      modelReady = false;
    }

    // Cleanup on unmount
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  });

  async function startRecording() {
    try {
      state = 'recording';
      isRecording = true;
      questionTranscript = '';
      transcriptionConfidence = 0;

      // Start audio recording
      await audioService.startRecording();

      // Start transcription
      const transcriptionSession = await transcriptionService.startTranscription((result) => {
        questionTranscript = result.text;
        transcriptionConfidence = result.confidence;
      });

      console.log('[AskView] Recording started');
    } catch (error) {
      console.error('[AskView] Failed to start recording:', error);
      state = 'error';
      errorMessage = 'Failed to start recording. Please check microphone permissions.';
      isRecording = false;
    }
  }

  async function stopRecording() {
    if (!isRecording) return;

    try {
      isRecording = false;

      // Stop transcription first
      await transcriptionService.stopTranscription();

      // Stop audio recording
      await audioService.stopRecording();

      console.log('[AskView] Recording stopped. Transcript:', questionTranscript);

      // Process the question
      if (questionTranscript.trim()) {
        await processQuestion(questionTranscript);
      } else {
        state = 'idle';
        errorMessage = 'No question detected. Please try again.';
      }
    } catch (error) {
      console.error('[AskView] Failed to stop recording:', error);
      state = 'error';
      errorMessage = 'Failed to process recording.';
    }
  }

  async function processQuestion(question: string) {
    state = 'processing';

    try {
      // Get answer from answer service
      const answer = await answerService.answerQuestion(question);

      currentAnswer = answer;
      state = 'displaying';

      // Add to conversation history
      conversationHistory = [
        {
          question,
          answer: answer.answer,
          timestamp: new Date(),
        },
        ...conversationHistory.slice(0, 4), // Keep last 5
      ];

      console.log('[AskView] Answer generated:', answer);
    } catch (error) {
      console.error('[AskView] Failed to answer question:', error);
      state = 'error';
      errorMessage = 'Failed to generate answer. Please try again.';
    }
  }

  function handleRecordClick() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function clearAnswer() {
    currentAnswer = null;
    questionTranscript = '';
    state = 'idle';
  }

  function navigateToDossier(dossierId: string) {
    window.location.href = `/dossiers/${dossierId}`;
  }

  // Format timestamp
  function formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // Get confidence color
  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.7) return 'var(--color-led-ready)';
    if (confidence >= 0.4) return 'var(--color-led-warning)';
    return 'var(--color-led-active)';
  }
</script>

<div class="ask-view">
  <!-- Oscilloscope Display (60%) -->
  <div class="display-section">
    <OscilloscopeDisplay className="ask-display">
      <div class="display-content">
        <!-- Header -->
        <div class="display-header">
          <div class="header-title crt-text-bright">FIELD LOG: INQUIRY</div>
          <div class="header-version crt-text-dim">FIELD_LOG_V1.0</div>
        </div>

        <!-- Status Line -->
        <div class="status-line crt-text">
          {#if isModelLoading}
            <span class="led pulse active" /> LOADING NEURAL CORE...
          {:else if !modelReady}
            <span class="led warning" /> FALLBACK MODE // KEYWORD_SEARCH
          {:else}
            <span class="led ready" /> NEURAL CORE READY
          {/if}
        </div>

        <div class="divider" />

        <!-- Main Content Area -->
        {#if state === 'idle'}
          <div class="idle-prompt crt-text">
            <p>&gt; READY FOR INQUIRY</p>
            <p class="crt-text-dim">&gt; PRESS RECORD TO BEGIN</p>
          </div>

        {:else if state === 'recording'}
          <div class="recording-state">
            <div class="recording-indicator">
              <span class="led pulse active" />
              <span class="crt-text-bright">RECORDING QUERY...</span>
            </div>
            {#if questionTranscript}
              <div class="transcript crt-text">
                <p>&gt; QUERY_INPUT: {questionTranscript}<span class="crt-cursor" /></p>
              </div>
            {/if}
          </div>

        {:else if state === 'processing'}
          <div class="processing-state crt-text">
            <p>&gt; PROCESSING QUERY...</p>
            <p>&gt; SEARCHING DOSSIER DATABASE...</p>
            <p>&gt; ANALYZING RESULTS...</p>
            <div class="processing-spinner">
              <span class="crt-cursor" />
            </div>
          </div>

        {:else if state === 'displaying' && currentAnswer}
          <div class="answer-display">
            <!-- Question -->
            <div class="question-section">
              <div class="section-label crt-text-dim">&gt; QUERY</div>
              <div class="question-text crt-text-bright">{questionTranscript}</div>
            </div>

            <div class="divider" />

            <!-- Answer -->
            <div class="answer-section">
              <div class="section-label crt-text-dim">&gt; RESPONSE</div>
              <div class="answer-text crt-text">
                {#each currentAnswer.answer.split('\n') as line}
                  <p>{line}</p>
                {/each}
              </div>
              <div class="confidence-indicator crt-text-dim">
                CONFIDENCE: 
                <span style="color: {getConfidenceColor(currentAnswer.confidence)}">
                  {Math.round(currentAnswer.confidence * 100)}%
                </span>
                {#if currentAnswer.method}
                  // METHOD: {currentAnswer.method.toUpperCase()}
                {/if}
              </div>
            </div>

            {#if currentAnswer.sources.length > 0}
              <div class="divider" />

              <!-- Sources -->
              <div class="sources-section">
                <div class="section-label crt-text-dim">&gt; SOURCES [{currentAnswer.sources.length}]</div>
                <div class="sources-list">
                  {#each currentAnswer.sources as source}
                    <button 
                      class="source-item crt-text" 
                      on:click={() => navigateToDossier(source.id)}
                    >
                      <span class="source-type">[{source.type}]</span>
                      <span class="source-name crt-text-bright">{source.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- New Query Button -->
            <div class="action-row">
              <button class="inline-button crt-text" on:click={clearAnswer}>
                &gt; NEW_QUERY
              </button>
            </div>
          </div>

        {:else if state === 'error'}
          <div class="error-state">
            <div class="error-indicator">
              <span class="led active" />
              <span class="crt-text" style="color: var(--color-button-record)">ERROR</span>
            </div>
            <div class="error-message crt-text">
              <p>&gt; {errorMessage}</p>
            </div>
            <button class="inline-button crt-text" on:click={clearAnswer}>
              &gt; RETRY
            </button>
          </div>
        {/if}

        <!-- Conversation History (if not currently displaying) -->
        {#if state === 'idle' && conversationHistory.length > 0}
          <div class="divider" />
          <div class="history-section">
            <div class="section-label crt-text-dim">&gt; RECENT_QUERIES [{conversationHistory.length}]</div>
            {#each conversationHistory.slice(0, 3) as entry}
              <div class="history-entry crt-text-dim">
                <div class="history-time">[{formatTimestamp(entry.timestamp)}]</div>
                <div class="history-question">{entry.question}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </OscilloscopeDisplay>
  </div>

  <!-- Control Panel (40%) -->
  <div class="controls-section">
    <div class="ask-controls">
      <RetroButton
        label={isRecording ? 'STOP' : 'RECORD'}
        variant={isRecording ? 'primary' : 'danger'}
        size="large"
        active={isRecording}
        disabled={isModelLoading}
        onClick={handleRecordClick}
      />
      
      {#if state === 'displaying'}
        <RetroButton
          label="CLEAR"
          variant="secondary"
          size="medium"
          onClick={clearAnswer}
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .ask-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-device-bg);
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  /* Display Section - 60% */
  .display-section {
    flex: 0 0 60%;
    min-height: 0;
  }

  .ask-display {
    height: 100%;
  }

  .display-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    height: 100%;
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

  .header-version {
    font-size: 0.7rem;
  }

  /* Status Line */
  .status-line {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.75rem;
  }

  .divider {
    height: 1px;
    background: var(--color-phosphor-green-dim);
    opacity: 0.3;
    box-shadow: 0 0 2px var(--color-phosphor-glow);
  }

  /* Idle State */
  .idle-prompt {
    font-size: 1rem;
    line-height: 1.6;
  }

  /* Recording State */
  .recording-state {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .recording-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .transcript {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  /* Processing State */
  .processing-state {
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .processing-spinner {
    margin-top: var(--spacing-md);
  }

  /* Answer Display */
  .answer-display {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    overflow-y: auto;
    flex: 1;
  }

  .section-label {
    font-size: 0.7rem;
    margin-bottom: var(--spacing-xs);
    letter-spacing: 0.1em;
  }

  .question-section {
    margin-bottom: var(--spacing-sm);
  }

  .question-text {
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .answer-section {
    margin-bottom: var(--spacing-sm);
  }

  .answer-text {
    font-size: 0.85rem;
    line-height: 1.5;
    margin-bottom: var(--spacing-sm);
  }

  .answer-text p {
    margin-bottom: var(--spacing-xs);
  }

  .confidence-indicator {
    font-size: 0.7rem;
    margin-top: var(--spacing-sm);
  }

  /* Sources */
  .sources-section {
    margin-bottom: var(--spacing-sm);
  }

  .sources-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
  }

  .source-item {
    background: transparent;
    border: 1px solid var(--color-phosphor-green-dim);
    color: var(--color-phosphor-green);
    font-family: var(--font-display);
    font-size: 0.75rem;
    padding: var(--spacing-xs) var(--spacing-sm);
    text-align: left;
    cursor: pointer;
    transition: all 100ms;
  }

  .source-item:hover {
    background: var(--color-crt-bg-light);
    border-color: var(--color-phosphor-green);
    box-shadow: 0 0 8px var(--color-phosphor-glow);
  }

  .source-type {
    opacity: 0.7;
    margin-right: var(--spacing-xs);
  }

  .source-name {
    font-weight: bold;
  }

  /* Action Row */
  .action-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }

  .inline-button {
    background: transparent;
    border: 1px solid var(--color-phosphor-green);
    color: var(--color-phosphor-green);
    font-family: var(--font-display);
    font-size: 0.75rem;
    padding: var(--spacing-xs) var(--spacing-sm);
    cursor: pointer;
    transition: all 100ms;
  }

  .inline-button:hover {
    background: var(--color-crt-bg-light);
    box-shadow: 0 0 8px var(--color-phosphor-glow);
  }

  /* Error State */
  .error-state {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .error-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .error-message {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  /* History */
  .history-section {
    margin-top: var(--spacing-md);
  }

  .history-entry {
    margin-top: var(--spacing-sm);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .history-time {
    opacity: 0.6;
  }

  .history-question {
    margin-top: var(--spacing-xs);
  }

  /* Controls Section - 40% */
  .controls-section {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md) 0;
  }

  .ask-controls {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }
</style>
