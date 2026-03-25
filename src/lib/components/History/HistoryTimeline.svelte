<script lang="ts">
  import {
    historyEntries,
    selectedEntryId,
    removeHistoryEntry,
    clearHistory
  } from '$/util/historyStore';
  import type { HistoryEntry } from '$/util/historyStore';
  import { Button } from '$/components/ui/button';

  interface Props {
    onRestore: (code: string, mermaid?: string) => void;
  }

  let { onRestore }: Props = $props();

  const entries = $derived([...$historyEntries].reverse());

  function handleRestore(entry: HistoryEntry) {
    onRestore(entry.code, entry.mermaid);
    selectedEntryId.set(entry.id);
  }

  function handleDelete(id: string) {
    removeHistoryEntry(id);
  }

  function handleClear() {
    if (confirm('Clear all history? This cannot be undone.')) {
      clearHistory();
    }
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="timeline">
  <div class="timeline-header">
    <span class="timeline-title">📜 Version History</span>
    {#if entries.length > 0}
      <Button size="sm" variant="ghost" onclick={handleClear} class="timeline-clear">
        Clear All
      </Button>
    {/if}
  </div>

  {#if entries.length === 0}
    <div class="timeline-empty">
      <p>No history yet.</p>
      <p class="text-xs">Diagrams are auto-saved as you work.</p>
    </div>
  {:else}
    <div class="timeline-list">
      {#each entries as entry (entry.id)}
        <div class="timeline-entry" class:timeline-entry-selected={$selectedEntryId === entry.id}>
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-meta">
              <span class="timeline-label">{entry.label}</span>
              <span class="timeline-time">{formatTime(entry.timestamp)}</span>
            </div>
            <pre class="timeline-preview"><code
                >{entry.code.slice(0, 120)}{entry.code.length > 120 ? '...' : ''}</code></pre>
            <div class="timeline-actions">
              <Button size="sm" variant="outline" onclick={() => handleRestore(entry)}>
                Restore
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onclick={() => handleDelete(entry.id)}
                class="text-destructive">
                ✕
              </Button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .timeline {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-size: 0.835rem;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .timeline-title {
    font-weight: 600;
    font-size: 0.9rem;
  }

  :global(.timeline-clear) {
    font-size: 0.7rem !important;
    color: hsl(var(--muted-foreground)) !important;
  }

  .timeline-empty {
    padding: 2rem 1rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
  }

  .timeline-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .timeline-entry {
    display: flex;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border-radius: 8px;
    transition: background 0.15s;
    position: relative;
  }

  .timeline-entry:hover {
    background: hsl(var(--muted) / 0.4);
  }

  .timeline-entry-selected {
    background: hsl(var(--primary) / 0.08);
    border: 1px solid hsl(var(--primary) / 0.2);
  }

  .timeline-dot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: hsl(var(--primary));
    margin-top: 4px;
  }

  .timeline-content {
    flex: 1;
    min-width: 0;
  }

  .timeline-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
  }

  .timeline-label {
    font-weight: 500;
    font-size: 0.8rem;
  }

  .timeline-time {
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
  }

  .timeline-preview {
    background: hsl(var(--muted) / 0.3);
    border: 1px solid hsl(var(--border));
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    font-size: 0.7rem;
    line-height: 1.4;
    overflow: hidden;
    max-height: 60px;
    margin: 0;
  }

  .timeline-preview code {
    white-space: pre-wrap;
    word-break: break-word;
    color: hsl(var(--muted-foreground));
  }

  .timeline-actions {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.4rem;
  }
</style>
