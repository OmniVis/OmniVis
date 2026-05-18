<script lang="ts">
  import { onMount } from 'svelte';
  import { getFileContent, commitFile } from '$lib/github/api';

  let authorizedUsers: string[] = [];
  let newUser = '';
  let isLoading = true;
  let isSaving = false;
  let error = '';
  let successMessage = '';
  let configSha = ''; // Needed to update the file in GitHub

  const CONFIG_PATH = 'src/content/cms-config.json';

  onMount(async () => {
    try {
      // Because we are fetching raw from the repo via API, we always get the latest master version
      const { content, sha } = await getFileContent(CONFIG_PATH);
      const config = JSON.parse(content);
      authorizedUsers = config.authorizedUsers || [];
      configSha = sha;
    } catch (e) {
      error = 'Failed to load user configuration from GitHub.';
      console.error(e);
    } finally {
      isLoading = false;
    }
  });

  async function saveUsers() {
    isSaving = true;
    error = '';
    successMessage = '';

    try {
      const updatedConfig = { authorizedUsers };
      const contentString = JSON.stringify(updatedConfig, null, 2);

      await commitFile(
        CONFIG_PATH,
        contentString,
        `chore(cms): update authorized users list`,
        configSha
      );

      // Re-fetch to get the new SHA so subsequent saves don't fail
      const { sha } = await getFileContent(CONFIG_PATH);
      configSha = sha;

      successMessage = 'Successfully saved users to GitHub repository!';
      setTimeout(() => (successMessage = ''), 3000);
    } catch (e) {
      error = 'Failed to push changes to GitHub.';
      console.error(e);
    } finally {
      isSaving = false;
    }
  }

  function addUser() {
    if (newUser && !authorizedUsers.includes(newUser)) {
      authorizedUsers = [...authorizedUsers, newUser.trim()];
      newUser = '';
    }
  }

  function removeUser(user: string) {
    authorizedUsers = authorizedUsers.filter((u) => u !== user);
  }
</script>

<div class="mx-auto max-w-4xl">
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="mb-2 text-3xl font-bold">Access Control</h1>
      <p class="text-muted-foreground">
        Manage which GitHub accounts are authorized to access the CMS.
      </p>
    </div>
    <button
      class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      on:click={saveUsers}
      disabled={isSaving || isLoading}>
      {#if isSaving}
        <i class="fas fa-spinner fa-spin"></i> Saving to Git...
      {:else}
        <i class="fas fa-save"></i> Save Changes
      {/if}
    </button>
  </div>

  {#if error}
    <div
      class="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
      <i class="fas fa-exclamation-triangle"></i>
      {error}
    </div>
  {/if}

  {#if successMessage}
    <div
      class="mb-4 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-500">
      <i class="fas fa-check-circle"></i>
      {successMessage}
    </div>
  {/if}

  <div class="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div class="border-b border-border p-6">
      <h2 class="mb-1 text-lg font-semibold">Authorized GitHub Accounts</h2>
      <p class="mb-4 text-sm text-muted-foreground">
        Users must log in with these exact GitHub usernames to gain access. Role permission
        splitting is currently not supported.
      </p>

      <form on:submit|preventDefault={addUser} class="flex max-w-md gap-2">
        <input
          type="text"
          bind:value={newUser}
          placeholder="Enter GitHub username (e.g. torvalds)"
          class="flex-1 rounded-md border border-input bg-background px-3 py-2 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
        <button
          type="submit"
          class="rounded-md bg-secondary px-4 py-2 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
          Add User
        </button>
      </form>
    </div>

    {#if isLoading}
      <div class="flex justify-center p-8 text-muted-foreground">
        <i class="fas fa-circle-notch fa-spin text-2xl"></i>
      </div>
    {:else}
      <ul class="divide-y divide-border">
        {#each authorizedUsers as user (user)}
          <li
            class="group flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
            <div class="flex items-center gap-3">
              <!-- Optional: try to fetch GitHub avatar via their public URL -->
              <img
                src="https://github.com/{user}.png?size=40"
                alt="{user}'s avatar"
                class="h-10 w-10 rounded-full bg-muted"
                on:error={(e) => (e.currentTarget.style.display = 'none')} />
              <div>
                <span class="font-medium">{user}</span>
                <a
                  href="https://github.com/{user}"
                  target="_blank"
                  class="block text-xs text-primary hover:underline">View Profile</a>
              </div>
            </div>
            <button
              class="rounded p-2 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove {user}"
              on:click={() => removeUser(user)}
              title="Remove User">
              <i class="fas fa-trash-alt"></i>
            </button>
          </li>
        {/each}

        {#if authorizedUsers.length === 0}
          <li class="p-8 text-center text-muted-foreground">
            No users authorized. CMS is currently locked out.
          </li>
        {/if}
      </ul>
    {/if}
  </div>
</div>
