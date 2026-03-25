<script lang="ts">
  import CopyButton from '../CopyButton.svelte';
  import { Button } from '../ui/button';
  import { Input } from '../ui/input';
  import { Separator } from '../ui/separator';
  import * as ToggleGroup from '../ui/toggle-group';
  import { waitForRender } from '../../util/autoSync';
  import { inputStateStore, stateStore } from '../../util/state';
  import { activeFileHandle, activeVirtualFileId } from '../../util/fileSystem';
  import { siteFiles } from '../../util/siteWorkspace.svelte';
  import { logEvent } from '../../util/stats';
  import dayjs from 'dayjs';
  import { toBase64 } from 'js-base64';
  import DownloadIcon from '~icons/material-symbols/download';
  import WidthIcon from '~icons/material-symbols/width-rounded';
  import PaletteIcon from '~icons/material-symbols/palette';
  import PrintIcon from '~icons/material-symbols/print';

  const FAVersion = '6.7.2';
  const FONT_AWESOME_URL = `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${FAVersion}/css/all.min.css`;

  let imageSizeMode: string = $state('auto');
  let isTransparent = $state(false);
  let exportBackground = $state('#ffffff');

  $effect(() => {
    const state = stateStore as unknown as { exportBackground?: string };
    if (typeof window !== 'undefined' && state.exportBackground) {
      exportBackground = state.exportBackground;
    }
  });

  $effect(() => {
    const state = stateStore as unknown as { exportBackground?: string };
    if (typeof window !== 'undefined' && state.exportBackground !== exportBackground) {
      inputStateStore.update((s: Record<string, unknown>) => ({ ...s, exportBackground }));
    }
  });

  let imageSize = $state(1080);

  const getSvgElement = (): SVGSVGElement | null => {
    if (typeof document === 'undefined') return null;
    const svgElement = document.querySelector('#container svg')?.cloneNode(true);
    if (!svgElement) return null;
    const element = svgElement as SVGSVGElement;
    element.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    return element;
  };

  const getBase64SVG = (svg?: SVGSVGElement, width?: number, height?: number): string => {
    let svgToUse: SVGSVGElement | null = svg ?? null;
    if (svgToUse) {
      svgToUse = svgToUse.cloneNode(true) as SVGSVGElement;
    } else {
      svgToUse = getSvgElement();
    }

    if (!svgToUse) return '';

    if (height) {
      svgToUse.setAttribute('height', `${height}px`);
    }
    if (width) {
      svgToUse.setAttribute('width', `${width}px`);
    }

    if (!isTransparent) {
      svgToUse.style.backgroundColor = exportBackground;
    } else {
      svgToUse.style.backgroundColor = 'transparent';
    }

    const svgString = svgToUse.outerHTML
      .replaceAll('<br>', '<br/>')
      .replaceAll(/<img([^>]*)>/g, (m: string, g: string) => `<img ${g} />`);

    return toBase64(`<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="${FONT_AWESOME_URL}" type="text/css"?>
${svgString}`);
  };

  const exportImage = async (
    event: Event,
    exporter: (context: CanvasRenderingContext2D, image: HTMLImageElement) => () => void
  ) => {
    if (typeof window === 'undefined') return;
    (
      inputStateStore as unknown as {
        update: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void;
      }
    ).update((s) => ({ ...s, panZoom: false }));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await waitForRender();
    const canvas = document.createElement('canvas');
    const svg = document.querySelector<SVGSVGElement>('#container svg');
    if (!svg) return;

    const box = svg.getBoundingClientRect();

    if (imageSizeMode === 'width') {
      const ratio = box.height / box.width;
      canvas.width = imageSize;
      canvas.height = imageSize * ratio;
    } else if (imageSizeMode === 'height') {
      const ratio = box.width / box.height;
      canvas.width = imageSize * ratio;
      canvas.height = imageSize;
    } else {
      const multiplier = 2;
      canvas.width = box.width * multiplier;
      canvas.height = box.height * multiplier;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    if (!isTransparent) {
      context.fillStyle = exportBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    const image = new Image();
    image.addEventListener('load', () => {
      exporter(context, image)();
      (
        inputStateStore as unknown as {
          update: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void;
        }
      ).update((s) => ({ ...s, panZoom: true }));
    });
    image.src = `data:image/svg+xml;base64,${getBase64SVG(svg, canvas.width, canvas.height)}`;
    event.stopPropagation();
    event.preventDefault();
  };

  const getFileName = (extension: string) => {
    let name = '';
    if ($activeFileHandle) {
      name = $activeFileHandle.name.replace(/\.(mmd|mermaid|txt|json|dia|md)$/i, '');
    } else if ($activeVirtualFileId) {
      const file = siteFiles.find((f) => f.id === $activeVirtualFileId);
      if (file) name = file.name.replace(/\.(mmd|mermaid|txt|json|dia|md)$/i, '');
    }
    const baseName = name ? name : `mermaid-diagram-${dayjs().format('YYYY-MM-DD-HHmmss')}`;
    return `${baseName}.${extension}`;
  };

  const simulateDownload = (download: string, href: string): void => {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.download = download;
    a.href = href;
    a.click();
    a.remove();
  };

  const downloadImage = (context: CanvasRenderingContext2D, image: HTMLImageElement) => {
    return () => {
      const canvas = context.canvas;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      simulateDownload(
        getFileName('png'),
        canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
      );
    };
  };

  const isClipboardAvailable = (): boolean => {
    return typeof window !== 'undefined' && 'ClipboardItem' in window;
  };

  const clipboardCopy = (context: CanvasRenderingContext2D, image: HTMLImageElement) => {
    return () => {
      const canvas = context.canvas;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob: Blob | null) => {
        try {
          if (!blob) return;
          const nav =
            typeof window !== 'undefined'
              ? (window.navigator as unknown as {
                  clipboard?: { write: (items: unknown[]) => Promise<void> };
                })
              : null;
          if (nav?.clipboard?.write) {
            void nav.clipboard.write([
              new (
                window as unknown as { ClipboardItem: new (items: Record<string, Blob>) => unknown }
              ).ClipboardItem({
                [blob.type]: blob
              })
            ]);
          }
        } catch (error) {
          console.error(error);
        }
      });
    };
  };

  const onCopyClipboard = async (event: Event) => {
    await exportImage(event, clipboardCopy);
    logEvent('copyClipboard');
  };

  const onDownloadPNG = async (event: Event) => {
    await exportImage(event, downloadImage);
    logEvent('download', {
      type: 'png'
    });
  };

  const onDownloadSVG = () => {
    simulateDownload(getFileName('svg'), `data:image/svg+xml;base64,${getBase64SVG()}`);
    logEvent('download', {
      type: 'svg'
    });
  };

  const onDownloadPDF = async () => {
    if (typeof window === 'undefined') return;
    (
      inputStateStore as unknown as {
        update: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void;
      }
    ).update((s) => ({ ...s, panZoom: false }));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await waitForRender();

    const svg = getSvgElement();
    if (!svg) return;

    // Ensure the SVG fills the container for PDF export
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.maxWidth = '100%';
    svg.style.width = '100%';
    svg.style.height = '100%';

    const svgHTML = svg.outerHTML
      .replaceAll('<br>', '<br/>')
      .replaceAll(/<img([^>]*)>/g, (m: string, g: string) => `<img ${g} />`);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mermaid Export - PDF</title>
            <link rel="stylesheet" href="${FONT_AWESOME_URL}">
            <style>
              @page { size: auto; margin: 0; }
              html, body { 
                margin: 0; 
                padding: 0; 
                width: 100vw; 
                height: 100vh; 
                overflow: hidden;
                background: ${isTransparent ? 'transparent' : exportBackground};
              }
              .container {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
                height: 100%;
                padding: 20px;
                box-sizing: border-box;
              }
              svg { 
                max-width: 100%; 
                max-height: 100%; 
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="container">
              ${svgHTML}
            </div>
            <scr` +
          `ipt>
              window.onload = () => {
                setTimeout(() => {
                    window.print();
                    // window.close(); // Keep it open for user to manually close if print fails or to preview
                }, 1000);
              };
            </scr` +
          `ipt>
          </body>
        </html>
      `
      );
      printWindow.document.close();
    }
    (
      inputStateStore as unknown as {
        update: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void;
      }
    ).update((s) => ({ ...s, panZoom: true }));
    logEvent('download', { type: 'pdf' });
  };
</script>

<div class="flex min-w-fit flex-col gap-4 p-4">
  <!-- Size Configuration -->
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
        >Image Size</span>
      <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >Px</span>
    </div>
    <ToggleGroup.Root
      type="single"
      variant="outline"
      bind:value={imageSizeMode}
      class="h-8 w-full justify-start">
      <ToggleGroup.Item value="auto" class="flex-1 px-2 text-xs">Auto</ToggleGroup.Item>
      <ToggleGroup.Item value="width" class="flex-1 px-2 text-xs">Width</ToggleGroup.Item>
      <ToggleGroup.Item value="height" class="flex-1 px-2 text-xs">Height</ToggleGroup.Item>
    </ToggleGroup.Root>

    {#if imageSizeMode !== 'auto'}
      <div class="flex items-center gap-2">
        <WidthIcon
          class={[
            'size-4 shrink-0 text-muted-foreground transition-all',
            imageSizeMode === 'width' && 'rotate-90'
          ]} />
        <Input type="number" min="3" max="10000" bind:value={imageSize} class="h-8 text-xs" />
      </div>
    {/if}
  </div>

  <Separator />

  <!-- Background Configuration -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
        >Background</span>
      <PaletteIcon class="size-3.5 text-muted-foreground" />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label
          for="transparent-bg"
          class="cursor-pointer text-xs font-medium text-foreground select-none">Transparent</label>
        <input
          id="transparent-bg"
          type="checkbox"
          bind:checked={isTransparent}
          class="size-3.5 rounded border-border bg-background text-primary focus:ring-primary" />
      </div>

      {#if !isTransparent}
        <div class="flex items-center gap-2">
          <input
            type="color"
            bind:value={exportBackground}
            class="size-6 cursor-pointer overflow-hidden rounded border-0 bg-transparent p-0" />
          <Input
            type="text"
            bind:value={exportBackground}
            class="h-7 px-2 font-mono text-[10px] uppercase" />
        </div>
      {/if}
    </div>
  </div>

  <Separator />

  <!-- Export Actions -->
  <div class="flex flex-col gap-2">
    <div class="mb-1 flex items-center justify-between">
      <span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
        >Export Format</span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <Button
        variant="secondary"
        size="sm"
        onclick={onDownloadPNG}
        class="h-8 gap-2 text-xs font-bold">
        <DownloadIcon class="size-3.5" /> PNG
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onclick={onDownloadSVG}
        class="h-8 gap-2 text-xs font-bold">
        <DownloadIcon class="size-3.5" /> SVG
      </Button>
    </div>

    <Button
      variant="secondary"
      size="sm"
      onclick={onDownloadPDF}
      class="h-8 w-full gap-2 text-xs font-bold">
      <PrintIcon class="size-3.5" /> Export as PDF
    </Button>

    {#if isClipboardAvailable()}
      <div class="mt-2">
        <CopyButton onclick={onCopyClipboard} label="Copy to Clipboard" />
      </div>
    {/if}
  </div>

  <div class="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
    <p class="text-[10px] leading-relaxed font-medium text-orange-600/80">
      Tip: PDF export works best with high-resolution settings for large diagrams.
    </p>
  </div>
</div>
