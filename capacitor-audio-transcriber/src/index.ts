import { registerPlugin } from '@capacitor/core';

import type { AudioTranscriberPlugin } from './definitions';

const AudioTranscriber = registerPlugin<AudioTranscriberPlugin>('AudioTranscriber', {
  web: () => import('./web').then(m => new m.AudioTranscriberWeb()),
});

export * from './definitions';
export { AudioTranscriber };
