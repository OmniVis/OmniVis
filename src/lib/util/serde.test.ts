import { describe, expect, it } from 'vitest';
import { serializeState, deserializeState, type SerdeType } from './serde';
import { defaultState } from './state';
import type { State } from '$lib/types';

const verifySerde = (state: State, serde?: SerdeType): string => {
  const serialized = serializeState(state, serde);
  const deserialized = deserializeState(serialized);
  expect(deserialized).to.deep.equal(state);
  return serialized;
};

describe('Serde tests', () => {
  it('should serialize and deserialize with default serde', () => {
    expect(verifySerde(defaultState)).toMatchInlineSnapshot(
      `"pako:eNpNkMFugzAMhl_F8i6bRF-Aw6QCWy-ttkNPIz1Y4JCokEQhlE2Ud18ArVpO8a_vsy1PWNmaMUXZ2rFS5AOcC2H2Za687kNH_QV2u9c7HDhAZw3_wB2y54OFXlnntGlehMkWBPLpuDAMQWlzhVmYfFM_DEepKI_kgnWXR34ebczfSv2pYuN_ufK8GO-lpBQkwQ4q8pCTjwwm2HhdYxr8wAl27DtaSpyEARAYFHcsMI3fmiUNbRAozBw1R-bL2u7P9HZoFKaS2j5Wg6spcKGp8fRAbprH03ae9UoJ6n5f38hUXG_5xvG3sz5kVF2b2NUs2zzJ9S1j2Usbl4zS5qwT51-4eX5w"`
    );
  });

  it('should serialize and deserialize with base64 serde', () => {
    expect(verifySerde(defaultState, 'base64')).toMatchInlineSnapshot(
      `"base64:eyJjb2RlIjoiZmxvd2NoYXJ0IFREXG5BW0NocmlzdG1hc10gLS0-fCBHZXQgbW9uZXkgfCBCKEdvIHNob3BwaW5nKVxuQiAtLT4gQ3tMZXQgbWUgdGhpbmsgfVxuQyAtLT58IE9uZSB8IERbTGFwdG9wXVxuQyAtLT58IFR3byB8IEVbaVBob25lXVxuQyAtLT58IFRocmVlIHwgRltmYTogZmEgLSBjYXIgQ2FyXVxuIiwiZ3JpZCI6dHJ1ZSwibWVybWFpZCI6IntcbiAgXCJ0aGVtZVwiOiBcImRlZmF1bHRcIlxufSIsInBhblpvb20iOnRydWUsInJvdWdoIjpmYWxzZSwidXBkYXRlRGlhZ3JhbSI6dHJ1ZSwidmlld01vZGUiOiJjb2RlIiwiaXNBZHZhbmNlZE1vZGUiOnRydWUsImV4cG9ydEJhY2tncm91bmQiOiIjZmZmZmZmIiwicGVyZm9ybWFuY2VNb2RlIjpmYWxzZX0"`
    );
  });

  it('should serialize and deserialize with pako serde', () => {
    expect(verifySerde(defaultState, 'pako')).toMatchInlineSnapshot(
      `"pako:eNpNkMFugzAMhl_F8i6bRF-Aw6QCWy-ttkNPIz1Y4JCokEQhlE2Ud18ArVpO8a_vsy1PWNmaMUXZ2rFS5AOcC2H2Za687kNH_QV2u9c7HDhAZw3_wB2y54OFXlnntGlehMkWBPLpuDAMQWlzhVmYfFM_DEepKI_kgnWXR34ebczfSv2pYuN_ufK8GO-lpBQkwQ4q8pCTjwwm2HhdYxr8wAl27DtaSpyEARAYFHcsMI3fmiUNbRAozBw1R-bL2u7P9HZoFKaS2j5Wg6spcKGp8fRAbprH03ae9UoJ6n5f38hUXG_5xvG3sz5kVF2b2NUs2zzJ9S1j2Usbl4zS5qwT51-4eX5w"`
    );
  });

  it('should throw error for unrecognized serde', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expect(() => serializeState(defaultState, 'unknown')).toThrowError(
      'Unknown serde type: unknown'
    );
    expect(() => deserializeState('unknown:hello')).toThrowError('Unknown serde type: unknown');
  });
});
