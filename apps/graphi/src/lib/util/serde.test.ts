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
      `"pako:eNpNkEFugzAQRa8ycjetFC7AolKANptE7SKr4ixGMMZWwLaMCa0Id-8QVFSv7Of_vsaeROVqEqlQrRsrjSHCuZB2X-Y6mD522F8gSV7vcKAInbP0A3fIng8Oeu28N7Z5kTZbIpBPxyVDELWxV5ilzVf1wxJLRXlEH52_bPw8OuZvpfnUXPyP60CL8V4qTEEhJFBhgBwDZ8RO0Ld3IWZYXZvgBlvz9E_qsfiyCYZBDAPthOn39Q1tRfXp8ciVdhQ6XEJikhZAiqipIylS3takcGijFNLOXObRfjnX_ZmegnIsc-NaqLDtmfMUjd5Og68xUmGwCbipN0Pj6qwfPv8CJRN-cA"`
    );
  });

  it('should serialize and deserialize with base64 serde', () => {
    expect(verifySerde(defaultState, 'base64')).toMatchInlineSnapshot(
      `"base64:eyJjb2RlIjoiZmxvd2NoYXJ0IFREXG5BW0NocmlzdG1hc10gLS0-fCBHZXQgbW9uZXkgfCBCKEdvIHNob3BwaW5nKVxuQiAtLT4gQ3tMZXQgbWUgdGhpbmsgfVxuQyAtLT58IE9uZSB8IERbTGFwdG9wXVxuQyAtLT58IFR3byB8IEVbaVBob25lXVxuQyAtLT58IFRocmVlIHwgRltmYTogZmEgLSBjYXIgQ2FyXVxuIiwiZXhwb3J0QmFja2dyb3VuZCI6IiNmZmZmZmYiLCJncmlkIjp0cnVlLCJpc0FkdmFuY2VkTW9kZSI6dHJ1ZSwibWVybWFpZCI6IntcbiAgXCJ0aGVtZVwiOiBcImRlZmF1bHRcIlxufSIsInBhblpvb20iOnRydWUsInBlcmZvcm1hbmNlTW9kZSI6ZmFsc2UsInJvdWdoIjpmYWxzZSwidXBkYXRlRGlhZ3JhbSI6dHJ1ZSwidmlld01vZGUiOiJjb2RlIn0"`
    );
  });

  it('should serialize and deserialize with pako serde', () => {
    expect(verifySerde(defaultState, 'pako')).toMatchInlineSnapshot(
      `"pako:eNpNkEFugzAQRa8ycjetFC7AolKANptE7SKr4ixGMMZWwLaMCa0Id-8QVFSv7Of_vsaeROVqEqlQrRsrjSHCuZB2X-Y6mD522F8gSV7vcKAInbP0A3fIng8Oeu28N7Z5kTZbIpBPxyVDELWxV5ilzVf1wxJLRXlEH52_bPw8OuZvpfnUXPyP60CL8V4qTEEhJFBhgBwDZ8RO0Ld3IWZYXZvgBlvz9E_qsfiyCYZBDAPthOn39Q1tRfXp8ciVdhQ6XEJikhZAiqipIylS3takcGijFNLOXObRfjnX_ZmegnIsc-NaqLDtmfMUjd5Og68xUmGwCbipN0Pj6qwfPv8CJRN-cA"`
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
