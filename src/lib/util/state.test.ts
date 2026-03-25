import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeState } from './serde';
import { defaultState, inputStateStore, loadState } from './state';

// Mock dependencies
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

describe('loadState recovery suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inputStateStore.set(defaultState);
  });

  const serializeBurstObject = (obj: any) => {
    const str = JSON.stringify(obj);
    const burst: any = {};
    for (let i = 0; i < str.length; i++) {
      burst[i] = str[i];
    }
    return burst;
  };

  it('should load valid state correctly', () => {
    const validState = { ...defaultState, code: 'graph TD; A-->B;' };
    const serialized = serializeState(validState);
    loadState(serialized);

    let currentState: any;
    inputStateStore.subscribe((s) => (currentState = s))();
    expect(currentState.code).toBe(validState.code);
  });

  it('should auto-heal raw burst object in mermaid config', () => {
    const mermaidConfig = { theme: 'forest' };
    const burstConfig = serializeBurstObject(mermaidConfig);
    const corruptedState = { ...defaultState, mermaid: burstConfig };
    const serialized = serializeState(corruptedState as any);

    loadState(serialized);

    let currentState: any;
    inputStateStore.subscribe((s) => (currentState = s))();
    expect(currentState.mermaid).toContain('"theme": "forest"');
  });

  it('should auto-heal cemented burst object (stringified) in mermaid config', () => {
    const mermaidConfig = { theme: 'dark' };
    const burstConfig = serializeBurstObject(mermaidConfig);
    const cementedConfig = JSON.stringify(burstConfig);
    const corruptedState = { ...defaultState, mermaid: cementedConfig } as any;
    const serialized = serializeState(corruptedState);

    loadState(serialized);

    let currentState: any;
    inputStateStore.subscribe((s) => (currentState = s))();
    expect(currentState.mermaid).toContain('"theme": "dark"');
  });

  it('should auto-heal hybrid burst object (numeric keys + proper keys)', () => {
    const realConfigString = JSON.stringify({ theme: 'dark' });
    const hybridState: any = {
      ...defaultState,
      mermaid: {
        theme: 'base',
        themeVariables: { some: 'var' }
      }
    };

    for (let i = 0; i < realConfigString.length; i++) {
      (hybridState.mermaid as any)[i.toString()] = realConfigString[i];
    }

    const serialized = serializeState(hybridState);
    loadState(serialized);

    let currentState: any;
    inputStateStore.subscribe((s) => (currentState = s))();
    expect(currentState.mermaid).toContain('"theme": "dark"');
  });
});
