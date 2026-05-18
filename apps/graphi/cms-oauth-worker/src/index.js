export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Initial login redirect
    if (url.pathname === '/auth') {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`;
      return Response.redirect(githubAuthUrl, 302);
    }

    // 2. Callback from GitHub
    if (url.pathname === '/callback' || (url.pathname === '/' && url.searchParams.has('code'))) {
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response('Missing code parameter', { status: 400 });
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code
        })
      });

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return new Response('Failed to get access token', { status: 400 });
      }

      // 3. Return the token to Static CMS using the required window.postMessage format
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authenticating...</title>
        </head>
        <body>
          <script>
            function receiveMessage(e) {
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({ token: accessToken, provider: 'github' })}',
                e.origin
              );
              window.close();
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          </script>
          <div style="font-family: sans-serif; text-align: center; padding-top: 50px; color: #666;">
            Logging you in to Graphi CMS...
          </div>
        </body>
        </html>
      `;

      return new Response(template, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8'
        }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
