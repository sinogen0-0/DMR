<script lang="ts">
  import { taggingParams, DEFAULT_TAGGING_PARAMS, resetTaggingParams } from '$stores/taggingParamsStore';
  import type { RuleConfig } from '$stores/taggingParamsStore';

  let draft = JSON.parse(JSON.stringify($taggingParams));
  let activeTab: string = 'NPC';
  let saveStatus: '' | 'saved' | 'reset' = '';

  let addInputs: Record<string, string> = {};
  let addRaceInput = '';
  let addClassInput = '';
  let addPrepInput = '';

  const TYPE_LABELS: Record<string, string> = {
    NPC: 'NPC',
    PLAYER_CHARACTER: 'Player Character',
    LOCATION: 'Location',
    STORY_PLOT: 'Story Plot'
  };

  const WEIGHT_LABELS: Array<[keyof RuleConfig['weights'], string]> = [
    ['nameStartsWith', 'Name starts with'],
    ['nameContains', 'Name contains'],
    ['nameEndsWith', 'Name ends with'],
    ['contextKeyword', 'Context keyword'],
    ['contextPhrase', 'Context phrase']
  ];

  type KeywordField = 'nameStartsWith' | 'nameContains' | 'nameEndsWith' | 'contextKeywords' | 'contextPhrases';

  const KEYWORD_FIELDS: Array<[KeywordField, string]> = [
    ['nameStartsWith', 'Name starts with'],
    ['nameContains', 'Name contains'],
    ['nameEndsWith', 'Name ends with'],
    ['contextKeywords', 'Context keywords'],
    ['contextPhrases', 'Context phrases']
  ];

  function getRuleIndex(type: string): number {
    return draft.rules.findIndex((r: RuleConfig) => r.type === type);
  }

  function removeKeyword(type: string, field: KeywordField, index: number) {
    const ri = getRuleIndex(type);
    (draft.rules[ri][field] as string[]).splice(index, 1);
    draft = { ...draft };
  }

  function addKeyword(type: string, field: KeywordField) {
    const key = `${type}_${field}`;
    const val = (addInputs[key] ?? '').trim();
    if (!val) return;
    const ri = getRuleIndex(type);
    (draft.rules[ri][field] as string[]).push(val);
    addInputs[key] = '';
    draft = { ...draft };
  }

  function handleKeydownKeyword(e: KeyboardEvent, type: string, field: KeywordField) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(type, field);
    }
  }

  function removeIndicatorTerm(field: 'raceTerms' | 'classTerms' | 'locationPrepositions', index: number) {
    draft.indicators[field].splice(index, 1);
    draft = { ...draft };
  }

  function addIndicatorTerm(field: 'raceTerms' | 'classTerms' | 'locationPrepositions', value: string) {
    const val = value.trim();
    if (!val) return;
    draft.indicators[field].push(val);
    if (field === 'raceTerms') addRaceInput = '';
    else if (field === 'classTerms') addClassInput = '';
    else addPrepInput = '';
    draft = { ...draft };
  }

  function save() {
    taggingParams.set(JSON.parse(JSON.stringify(draft)));
    saveStatus = 'saved';
    setTimeout(() => {
      saveStatus = '';
    }, 2200);
  }

  function reset() {
    resetTaggingParams();
    draft = JSON.parse(JSON.stringify(DEFAULT_TAGGING_PARAMS));
    addInputs = {};
    addRaceInput = '';
    addClassInput = '';
    addPrepInput = '';
    saveStatus = 'reset';
    setTimeout(() => {
      saveStatus = '';
    }, 2200);
  }

  $: activeRule = draft.rules.find((r: RuleConfig) => r.type === activeTab);
  $: activeRuleIndex = getRuleIndex(activeTab);
</script>

<div class="tagging-panel">
  <div class="panel-header">
    <h2>Tagging Parameters</h2>
    <div class="header-actions">
      {#if saveStatus === 'saved'}
        <span class="status status-saved">Saved</span>
      {:else if saveStatus === 'reset'}
        <span class="status status-reset">Reset</span>
      {/if}
      <button class="btn btn-secondary" type="button" on:click={reset}>Reset</button>
      <button class="btn btn-primary" type="button" on:click={save}>Save</button>
    </div>
  </div>

  <div class="sections">
    <div class="section">
      <div class="section-header">Extraction Defaults</div>
      <div class="section-body">
        <div class="field-row">
          <div class="field-info">
            <label class="field-label">Min Confidence</label>
            <span class="field-hint">Entities below this score are discarded.</span>
          </div>
          <div class="slider-group">
            <input type="range" min="0" max="100" bind:value={draft.extraction.minConfidence} />
            <input type="number" min="0" max="100" class="number-input" bind:value={draft.extraction.minConfidence} />
          </div>
        </div>

        <div class="field-row">
          <div class="field-info">
            <label class="field-label">Max Entities</label>
            <span class="field-hint">Hard cap on returned entities.</span>
          </div>
          <input type="number" min="1" max="500" class="number-input" bind:value={draft.extraction.maxEntities} />
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">Classification Thresholds</div>
      <div class="section-body">
        <div class="field-row">
          <div class="field-info">
            <label class="field-label">Ambiguity Threshold</label>
          </div>
          <div class="slider-group">
            <input type="range" min="0" max="50" bind:value={draft.thresholds.ambiguous} />
            <input type="number" min="0" max="50" class="number-input" bind:value={draft.thresholds.ambiguous} />
          </div>
        </div>

        <div class="field-row">
          <div class="field-info">
            <label class="field-label">Low Evidence Threshold</label>
          </div>
          <div class="slider-group">
            <input type="range" min="0" max="100" bind:value={draft.thresholds.lowEvidence} />
            <input type="number" min="0" max="100" class="number-input" bind:value={draft.thresholds.lowEvidence} />
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">Entity Type Rules</div>
      <div class="rule-tabs">
        {#each draft.rules as rule (rule.type)}
          <button class="rule-tab" class:active={activeTab === rule.type} type="button" on:click={() => (activeTab = rule.type)}>
            {TYPE_LABELS[rule.type] ?? rule.type}
          </button>
        {/each}
      </div>

      {#if activeRule}
        <div class="rule-panel">
          <div class="subsection-label">Score Weights</div>
          <div class="weights-grid">
            {#each WEIGHT_LABELS as [wk, wLabel]}
              <div class="weight-field">
                <label class="weight-label">{wLabel}</label>
                <input type="number" min="0" max="100" class="number-input" bind:value={draft.rules[activeRuleIndex].weights[wk]} />
              </div>
            {/each}
          </div>

          {#each KEYWORD_FIELDS as [field, fieldLabel]}
            {@const arr = draft.rules[activeRuleIndex][field] as string[]}
            {@const inputKey = `${activeTab}_${field}`}
            <div class="keyword-block">
              <div class="subsection-label">{fieldLabel}</div>
              <div class="chips">
                {#each arr as kw, ki}
                  <span class="chip">
                    <span class="chip-text">{kw}</span>
                    <button class="chip-remove" type="button" on:click={() => removeKeyword(activeTab, field, ki)}>x</button>
                  </span>
                {/each}
                {#if arr.length === 0}
                  <span class="chips-empty">No entries</span>
                {/if}
              </div>
              <div class="add-row">
                <input
                  type="text"
                  class="text-input"
                  placeholder="Add entry and press Enter"
                  bind:value={addInputs[inputKey]}
                  on:keydown={(e) => handleKeydownKeyword(e, activeTab, field)}
                />
                <button class="btn btn-small" type="button" on:click={() => addKeyword(activeTab, field)}>Add</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="section">
      <div class="section-header">D&D Indicators</div>
      <div class="section-body">
        <div class="field-row">
          <div class="field-info"><label class="field-label">Race/Class -> NPC Bonus</label></div>
          <input type="number" min="0" max="50" class="number-input" bind:value={draft.indicators.raceClassNpcBonus} />
        </div>

        <div class="field-row">
          <div class="field-info"><label class="field-label">Race/Class -> PC Bonus</label></div>
          <input type="number" min="0" max="50" class="number-input" bind:value={draft.indicators.raceClassPcBonus} />
        </div>

        <div class="field-row">
          <div class="field-info"><label class="field-label">Location Preposition Bonus</label></div>
          <input type="number" min="0" max="50" class="number-input" bind:value={draft.indicators.locationPrepBonus} />
        </div>

        <div class="keyword-block">
          <div class="subsection-label">Race Terms</div>
          <div class="chips">
            {#each draft.indicators.raceTerms as term, i}
              <span class="chip">
                <span class="chip-text">{term}</span>
                <button class="chip-remove" type="button" on:click={() => removeIndicatorTerm('raceTerms', i)}>x</button>
              </span>
            {/each}
          </div>
          <div class="add-row">
            <input
              type="text"
              class="text-input"
              placeholder="Add race term"
              bind:value={addRaceInput}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addIndicatorTerm('raceTerms', addRaceInput);
                }
              }}
            />
            <button class="btn btn-small" type="button" on:click={() => addIndicatorTerm('raceTerms', addRaceInput)}>Add</button>
          </div>
        </div>

        <div class="keyword-block">
          <div class="subsection-label">Class Terms</div>
          <div class="chips">
            {#each draft.indicators.classTerms as term, i}
              <span class="chip">
                <span class="chip-text">{term}</span>
                <button class="chip-remove" type="button" on:click={() => removeIndicatorTerm('classTerms', i)}>x</button>
              </span>
            {/each}
          </div>
          <div class="add-row">
            <input
              type="text"
              class="text-input"
              placeholder="Add class term"
              bind:value={addClassInput}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addIndicatorTerm('classTerms', addClassInput);
                }
              }}
            />
            <button class="btn btn-small" type="button" on:click={() => addIndicatorTerm('classTerms', addClassInput)}>Add</button>
          </div>
        </div>

        <div class="keyword-block">
          <div class="subsection-label">Location Prepositions</div>
          <div class="chips">
            {#each draft.indicators.locationPrepositions as term, i}
              <span class="chip">
                <span class="chip-text">{term}</span>
                <button class="chip-remove" type="button" on:click={() => removeIndicatorTerm('locationPrepositions', i)}>x</button>
              </span>
            {/each}
          </div>
          <div class="add-row">
            <input
              type="text"
              class="text-input"
              placeholder="Add preposition"
              bind:value={addPrepInput}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addIndicatorTerm('locationPrepositions', addPrepInput);
                }
              }}
            />
            <button class="btn btn-small" type="button" on:click={() => addIndicatorTerm('locationPrepositions', addPrepInput)}>Add</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .tagging-panel {
    display: grid;
    gap: 1rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .panel-header h2 {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #9a442d;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .status {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }

  .status-saved { color: #4b654e; }
  .status-reset { color: #9a442d; }

  .btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.4rem 0.75rem;
    border: none;
    cursor: pointer;
  }

  .btn-primary {
    background: #9a442d;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #c4614a, inset -1px -1px 0 #6b2e1e;
  }

  .btn-secondary,
  .btn-small {
    background: #eee8d8;
    color: #363226;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  .btn-small {
    font-size: 0.68rem;
    padding: 0.34rem 0.62rem;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section {
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #363226;
    border-right: 1px solid #363226;
    background: #fff;
  }

  .section-header {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
    background: #eee8d8;
    padding: 0.48rem 0.85rem;
    border-bottom: 1px solid #b8ad98;
  }

  .section-body,
  .rule-panel {
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .field-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .field-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
  }

  .field-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8rem;
    color: #363226;
  }

  .field-hint {
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    color: #8a785e;
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-shrink: 0;
  }

  input[type='range'] {
    width: 120px;
    accent-color: #9a442d;
  }

  .number-input {
    width: 64px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.83rem;
    padding: 0.28rem 0.45rem;
    background: #eee8d8;
    border: none;
    color: #363226;
    text-align: center;
    box-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #b8ad98;
  }

  .rule-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #b8ad98;
    background: #eee8d8;
    overflow-x: auto;
  }

  .rule-tab {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: #8a785e;
    cursor: pointer;
    border-right: 1px solid #b8ad98;
    white-space: nowrap;
  }

  .rule-tab.active {
    background: #fff;
    color: #9a442d;
    font-weight: 700;
  }

  .subsection-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.64rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
    margin-bottom: 0.4rem;
    border-bottom: 1px solid #eee8d8;
    padding-bottom: 0.2rem;
  }

  .weights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.65rem;
  }

  .weight-field {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .weight-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    color: #6b6250;
  }

  .keyword-block {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-height: 2rem;
    padding: 0.32rem;
    background: #f9f5ef;
    box-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #b8ad98;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    padding: 0.2rem 0.35rem 0.2rem 0.5rem;
    background: #eee8d8;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  .chip-text {
    font-family: 'Inter', sans-serif;
    font-size: 0.74rem;
    color: #363226;
  }

  .chip-remove {
    font-size: 0.82rem;
    line-height: 1;
    background: none;
    border: none;
    color: #9a442d;
    cursor: pointer;
    padding: 0 0.08rem;
  }

  .chips-empty {
    font-family: 'Inter', sans-serif;
    font-size: 0.7rem;
    color: #b8ad98;
    padding: 0.1rem 0.25rem;
  }

  .add-row {
    display: flex;
    gap: 0.45rem;
  }

  .text-input {
    flex: 1;
    font-family: 'Inter', sans-serif;
    font-size: 0.78rem;
    padding: 0.3rem 0.55rem;
    background: #eee8d8;
    border: none;
    color: #363226;
    box-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #b8ad98;
  }

  .text-input::placeholder { color: #b8ad98; }

  .text-input:focus {
    outline: 1px solid #9a442d;
  }

  @media (max-width: 780px) {
    .field-row {
      flex-direction: column;
      align-items: stretch;
      gap: 0.55rem;
    }
  }
</style>
