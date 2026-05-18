import { browser } from '$app/environment';
import { Octokit } from 'octokit';

const REPO_OWNER = 'GraphiTeam';
const REPO_NAME = 'GraphiTeam';
const GITHUB_TOKEN_KEY = 'cms_github_token';

// Use local storage to persist the token
export function setToken(token: string) {
  if (browser) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (browser) {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
  }
  return null;
}

export function logout() {
  if (browser) {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  }
}

// Get an authenticated Octokit instance
function getClient(): Octokit {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return new Octokit({ auth: token });
}

// --- GitHub API Operations ---

/**
 * Validates if the currently authenticated user is in cms-config.json
 */
export async function validateUserAccess(): Promise<boolean> {
  try {
    const client = getClient();

    // 1. Get current user's username
    const { data: user } = await client.rest.users.getAuthenticated();

    // 2. Fetch cms-config.json from the repo using GitHub API instead of local fetch
    const { content } = await getFileContent('src/content/cms-config.json');
    const config = JSON.parse(content);

    // 3. Check if username exists in the authorized list
    return config.authorizedUsers.includes(user.login);
  } catch (e) {
    console.error('Access validation failed:', e);
    return false;
  }
}

/**
 * Gets the current user's profile details
 */
export async function getUserProfile() {
  try {
    const client = getClient();
    const { data: user } = await client.rest.users.getAuthenticated();
    return user;
  } catch (e) {
    console.error('Failed to get user profile:', e);
    return null;
  }
}

/**
 * Fetches the contents of a directory (e.g., getting list of docs)
 */
export async function getDirectoryContents(path: string) {
  const client = getClient();
  const { data } = await client.rest.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: path
  });
  return Array.isArray(data) ? data : [data];
}

/**
 * Fetches a single raw file
 */
export async function getFileContent(path: string): Promise<{ content: string; sha: string }> {
  try {
    const client = getClient();
    console.log(`Fetching file: ${path}`);
    const { data } = await client.rest.repos.getContent({
      owner: REPO_OWNER,
      path: path,
      repo: REPO_NAME
    });

    if (!Array.isArray(data) && data.type === 'file' && data.content) {
      // GitHub API returns content as base64.
      // Use a UTF-8 safe decoder.
      const content = decodeURIComponent(
        atob(data.content.replace(/\s/g, ''))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return { content, sha: data.sha };
    }
    throw new Error('Target path is not a file or is empty');
  } catch (e) {
    console.error(`Failed to fetch file ${path}:`, e);
    throw e;
  }
}

/**
 * Commits a file creation or update to the repository
 */
export async function commitFile(
  path: string,
  content: string,
  commitMessage: string,
  sha?: string
) {
  const client = getClient();

  // GitHub API requires base64 encoded content for commits.
  // Use a UTF-8 safe encoder.
  const base64Content = btoa(
    encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );

  await client.rest.repos.createOrUpdateFileContents({
    content: base64Content,
    message: commitMessage,
    owner: REPO_OWNER,
    path: path,
    repo: REPO_NAME,
    sha: sha // Required if updating an existing file
  });
}

/**
 * Deletes a file from the repository
 */
export async function deleteFile(path: string, commitMessage: string, sha: string) {
  const client = getClient();
  await client.rest.repos.deleteFile({
    message: commitMessage,
    owner: REPO_OWNER,
    path: path,
    repo: REPO_NAME,
    sha: sha
  });
}
