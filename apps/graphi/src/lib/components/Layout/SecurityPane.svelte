<script lang="ts">
  import ShieldIcon from '~icons/material-symbols/shield-locked';
  import KeyIcon from '~icons/material-symbols/key';
  import LockIcon from '~icons/material-symbols/lock';
  import EyeOffIcon from '~icons/material-symbols/visibility-off';
</script>

<div class="flex h-full flex-col bg-background text-foreground">
  <div class="flex items-center gap-2 border-b border-border p-4">
    <ShieldIcon class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
    <h2 class="text-sm font-semibold tracking-wide uppercase">Security & Privacy</h2>
  </div>

  <div class="flex-1 space-y-6 overflow-y-auto p-4">
    <div class="space-y-2">
      <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">Local-First Architecture</h3>
      <div
        class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <KeyIcon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Your AI API keys, editor settings, and unsaved diagrams never leave your browser. They are
          securely stored in your local browser database using the File System Access API.
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">Encrypted Identities</h3>
      <div
        class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <LockIcon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          When you create an account to sync diagrams, your personal information is heavily
          encrypted at rest. We cannot read your usernames or hijack your sessions.
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">Secure Link Sharing</h3>
      <div
        class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <EyeOffIcon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Cloud diagrams are protected by 122-bit high-entropy unguessable links. Only people who
          have the exact, secure URL can view your shared diagram.
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">XSS Neutralization</h3>
      <div
        class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <ShieldIcon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          We use strict SvelteKit security headers and active configuration scrubbing to ensure
          malicious diagrams cannot execute code in your browser.
        </p>
      </div>
    </div>
  </div>
</div>
