# Graphi CMS OAuth Worker

Because Graphi is hosted on GitHub Pages (which only serves static files), we need a tiny serverless function to handle the GitHub OAuth handshake when you log into the CMS. This Cloudflare Worker does exactly that.

## Deployment Steps

1. **Create a GitHub OAuth App**:
   - Go to **GitHub -> Settings -> Developer Settings -> OAuth Apps -> New OAuth App** (Make sure it says "OAuth Apps" on the left menu, NOT "GitHub Apps"!).
   - Or click this direct link: https://github.com/settings/applications/new
   - **Application name**: Graphi CMS
   - **Homepage URL**: `https://graphi.batuerol.de/`
   - **Authorization callback URL**: `https://<YOUR_WORKER_URL>.workers.dev/callback` (you will get this URL after step 4)
   - **Enable Device Flow**: Leave this UNCHECKED.

2. **Deploy this Worker**:
   - Open a terminal in this directory (`cms-oauth-worker`)
   - Run `npx wrangler deploy`
   - Note the URL it gives you (e.g., `https://graphi-cms-oauth.yourname.workers.dev`)

3. **Set Secrets**:
   Run the following commands and paste the Client ID and Secret from your new GitHub OAuth app:

   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

4. **Update the CMS Config**:
   Open `static/admin/config.yml` in the main project and set `base_url` to your worker:
   ```yaml
   backend:
     name: github
     repo: GraphiTeam/GraphiTeam
     branch: main
     base_url: https://<YOUR_WORKER_URL>.workers.dev
   ```

That's it! Now when you visit `https://GraphiTeam.github.io/GraphiTeam/admin`, you can click "Login with GitHub", authorize the app, and start managing your content!
