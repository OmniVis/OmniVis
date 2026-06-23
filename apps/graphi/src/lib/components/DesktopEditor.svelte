<script lang="ts">
  import type { EditorProps } from '$/types';
  import { env } from '$/util/env';
  import { stateStore } from '$/util/state';
  import { initEditor } from '$lib/util/monacoExtra';
  import { errorDebug } from '$lib/util/util';
  import { mode } from 'mode-watcher';
  import * as monaco from 'monaco-editor';
  import monacoEditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import monacoJsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import { debounce } from 'lodash-es';
  import { onMount } from 'svelte';
  import IconPicker from '$/components/IconPicker/IconPicker.svelte';
  import WrapIcon from '~icons/material-symbols/wrap-text';

  const { onUpdate }: EditorProps = $props();

  let divElement: HTMLDivElement | undefined = $state();
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  let editorOptions = {
    cursorSmoothCaretAnimation: 'on' as const,
    minimap: {
      enabled: false
    },
    overviewRulerLanes: 0,
    quickSuggestions: false,
    smoothScrolling: true,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: false
  } satisfies monaco.editor.IStandaloneEditorConstructionOptions;
  let currentMermaidText = '';
  let currentJsonText = '';
  let cursorLine = $state(1);
  let cursorColumn = $state(1);
  let wordWrap = $state(false);

  function toggleWordWrap() {
    wordWrap = !wordWrap;
    editor?.updateOptions({ wordWrap: wordWrap ? 'on' : 'off' });
  }

  let jsonModel: monaco.editor.ITextModel;
  let mermaidModel: monaco.editor.ITextModel;

  onMount(() => {
    self.MonacoEnvironment = {
      getWorker(_, label) {
        if (label === 'json') {
          return new monacoJsonWorker();
        }
        return new monacoEditorWorker();
      }
    };

    if (!divElement) {
      throw new Error('divEl is undefined');
    }

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: true,
      schemas: [
        {
          fileMatch: ['config.json'],
          uri: `${env.docsUrl}/schemas/config.schema.json`
        }
      ]
    });

    initEditor(monaco);

    jsonModel = monaco.editor.createModel('', 'json', monaco.Uri.parse('internal://config.json'));
    mermaidModel = monaco.editor.createModel(
      '',
      'mermaid',
      monaco.Uri.parse('internal://mermaid.mmd')
    );

    errorDebug();
    editor = monaco.editor.create(divElement, editorOptions);

    const onUpdateDebounced = debounce(onUpdate, 300);

    let isFindWidgetOpen = false;

    editor.onKeyDown((e) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyF) {
        isFindWidgetOpen = true;
      }
      if (e.keyCode === monaco.KeyCode.Escape) {
        isFindWidgetOpen = false;
      }
    });

    editor.onDidFocusEditorText(() => {
      isFindWidgetOpen = false;
    });

    editor.onDidChangeCursorPosition((e) => {
      cursorLine = e.position.lineNumber;
      cursorColumn = e.position.column;
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
      toggleWordWrap();
    });

    editor.onDidChangeModelContent(({ isFlush, isUndoing, isRedoing }) => {
      if (isFlush || isUndoing || isRedoing) return;

      const newText = editor?.getValue();
      if (newText === undefined || isFindWidgetOpen) return;

      const isMermaid = editor?.getModel()?.id === mermaidModel.id;
      const currentText = isMermaid ? currentMermaidText : currentJsonText;
      if (currentText === newText) return;

      if (isMermaid) {
        currentMermaidText = newText;
      } else {
        currentJsonText = newText;
      }
      onUpdateDebounced(newText);
    });

    const unsubscribeState = stateStore.subscribe((stateData) => {
      const { errorMarkers, editorMode, code, mermaid } = stateData;
      if (!editor) return;

      const isMermaidMode = editorMode === 'code';
      const model = isMermaidMode ? mermaidModel : jsonModel;
      let currentText = isMermaidMode ? currentMermaidText : currentJsonText;

      // Save view state BEFORE any model switch so we capture the outgoing model's state
      const viewState = editor.saveViewState();
      const isSwitchingModel = editor.getModel()?.id !== model.id;

      if (isSwitchingModel) {
        editor.setModel(model);
      }

      let newText = isMermaidMode ? code : mermaid;
      if (typeof newText !== 'string') {
        newText = JSON.stringify(newText, null, 2);
      }

      if (newText !== currentText) {
        // isExternalLoad: comparing against THIS model's own last-known text
        const isExternalLoad =
          currentText === '' || Math.abs(newText.length - currentText.length) > 50;
        editor.setValue(newText);

        if (isMermaidMode) {
          currentMermaidText = newText;
        } else {
          currentJsonText = newText;
        }

        if (isExternalLoad) {
          editor.setScrollTop(0);
        } else if (!isSwitchingModel && viewState) {
          editor.restoreViewState(viewState);
        }
      }

      monaco.editor.setModelMarkers(model, 'mermaid', errorMarkers);
    });

    const unsubscribeMode = mode.subscribe((mode) => {
      if (editor) {
        monaco.editor.setTheme(`mermaid${mode === 'dark' ? '-dark' : ''}`);
      }
    });
    const resizeObserver = new ResizeObserver((entries) => {
      editor?.layout({
        height: entries[0].contentRect.height,
        width: entries[0].contentRect.width
      });
    });

    if (divElement.parentElement) {
      resizeObserver.observe(divElement);
    }

    return () => {
      unsubscribeState();
      unsubscribeMode();
      resizeObserver.disconnect();
      jsonModel.dispose();
      mermaidModel.dispose();
      editor?.dispose();
    };
  });
</script>

<div class="relative flex h-full w-full flex-col">
  <!-- Monaco Editor -->
  <div bind:this={divElement} id="editor" class="min-h-0 w-full flex-1"></div>

  <!-- Status bar -->
  <div
    class="flex h-5 shrink-0 items-center gap-3 border-t bg-muted/40 px-3 text-[10px] text-muted-foreground select-none">
    <span title="Cursor position">Ln {cursorLine}, Col {cursorColumn}</span>
    <span class="opacity-40">|</span>
    <span>Mermaid</span>
    {#if wordWrap}
      <span class="opacity-40">|</span>
      <span>Word Wrap</span>
    {/if}
  </div>

  <!-- Floating toolbar -->
  <div class="absolute top-4 right-4 z-10 flex gap-2">
    <div
      class="rounded-md border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="flex items-center gap-1 px-1">
        <button
          title="Toggle word wrap (Alt+Z)"
          class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground {wordWrap
            ? 'bg-accent text-accent-foreground'
            : ''}"
          onclick={toggleWordWrap}>
          <WrapIcon class="size-4" />
        </button>
        <IconPicker />
      </div>
    </div>
  </div>
</div>
