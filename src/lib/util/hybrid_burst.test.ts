import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeState } from './serde';
import { defaultState, inputStateStore, loadState } from './state';

vi.mock('$app/navigation', () => ({
  replaceState: vi.fn(),
  goto: vi.fn()
}));

vi.mock('./env', () => ({
  env: {
    rendererUrl: '',
    krokiRendererUrl: ''
  }
}));

vi.mock('./persist', () => ({
  localStorage: () => ({
    getValue: () => null,
    setValue: () => {},
    deleteValue: () => {}
  }),
  persist: (store: any) => store
}));

describe('loadState hybrid corruption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inputStateStore.set(defaultState);
  });

  it('should auto-heal hybrid burst object (numeric keys + proper keys)', () => {
    // Construct the hybrid object as reported by the user
    // { "0": "{", ..., "theme": "base" }
    // The proper theme is "dark" in the burst chars, but "base" in the property.

    // Construct burst config for {"theme": "dark"}
    const realConfigString = JSON.stringify({ theme: 'dark' });
    const hybridState: any = {
      ...defaultState,
      mermaid: {
        theme: 'base', // The confusing property
        otherProp: 'someValue'
      }
    };

    // Inject numeric keys
    for (let i = 0; i < realConfigString.length; i++) {
      (hybridState.mermaid as any)[i.toString()] = realConfigString[i];
    }

    const serialized = serializeState(hybridState);
    loadState(serialized);

    let currentState: any;
    inputStateStore.subscribe((s) => (currentState = s))();

    // We expect the restoration to prioritize the burst string (user's original intent: "dark")
    // over the potentially default/corrupted explicit property ("base").
    expect(currentState.mermaid).toContain('"theme": "dark"');
  });
});
