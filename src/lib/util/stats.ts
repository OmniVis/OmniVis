import { browser } from '$app/environment';
import type PlausibleInstance from 'plausible-tracker';
import { env } from './env';

export let plausible: ReturnType<typeof PlausibleInstance> | undefined;

export const initAnalytics = async (): Promise<void> => {
  if (!env.analyticsUrl || !browser || plausible) {
    return;
  }

  try {
    const { default: Plausible } = await import('plausible-tracker');
    plausible = Plausible({
      // All tracked stats are public and available at https://p.mermaid.live/mermaid.live
      apiHost: env.analyticsUrl,
      domain: env.domain,
      hashMode: false
    });
  } catch (error) {
    console.log(error);
    console.info('Analytics blocked ;)');
  }
};

export const countLines = (code: string): number => {
  return (code.match(/\n/g)?.length ?? 0) + 1;
};

export const saveStatistics = ({
  code,
  renderTime,
  isRough,
  diagramType
}: {
  code: string;
  renderTime: number;
  isRough: boolean;
  diagramType?: string;
}): void => {
  if (!diagramType) {
    return;
  }
  const length = countLines(code);
  const lengthBucket = getBucket(length);
  const renderTimeMsBucket = getBucket(renderTime);
  logEvent('render', { diagramType, isRough, lengthBucket, renderTimeMsBucket });
};

const getBucket = (length: number): string => {
  const buckets = [
    [10, '0-10'],
    [25, '10-25'],
    [50, '25-50'],
    [100, '50-100'],
    [200, '100-200'],
    [500, '200-500'],
    [700, '500-700'],
    [1000, '700-1000'],
    [1500, '1000-1500'],
    [2500, '1500-2500'],
    [4500, '2500-4500'],
    [7000, '4500-7000'],
    [10_000, '7000-10000']
  ] as const;

  for (const [threshold, label] of buckets) {
    if (length < threshold) {
      return label;
    }
  }

  return '10000+';
};

export type AnalyticsEvent =
  | 'bannerClick'
  | 'copyClipboard'
  | 'copyMarkdown'
  | 'download'
  | 'history'
  | 'loadGist'
  | 'loadSampleDiagram'
  | 'migration'
  | 'mobileViewToggle'
  | 'panZoom'
  | 'pwaInstalled'
  | 'render'
  | 'renderDiagram'
  | 'themeChange'
  | 'version';

// analytics disabled for internal version
export const logEvent = (
  name: AnalyticsEvent,
  data?: Record<string, string | number | boolean>
): void => {
  void name;
  void data;
};
