# Gmail API email setup for Render

The API sends verification codes and turn notifications through Gmail's HTTPS API. PIN creation, storage, expiry, and verification remain server-side.

## Google credentials

1. Create or select a Google Cloud project and enable the **Gmail API**.
2. Configure the OAuth consent screen and add the sending Gmail account as a test user while testing.
3. Create an OAuth client and grant the `https://www.googleapis.com/auth/gmail.send` scope for the Gmail account that will send DoorMeen messages.
4. Obtain an OAuth refresh token for that account with offline access. Keep the client secret and refresh token private.
5. For long-running use, move the consent screen out of **Testing**. Google-issued refresh tokens for external apps left in Testing expire after seven days when Gmail scopes are requested. Public use may also require Google's OAuth app verification for the requested scope.

## Render environment variables

Set these on the API web service. Do not put the secrets in source control or the web/mobile apps.

| Variable | Value |
| --- | --- |
| `Gmail__ClientId` | OAuth client ID |
| `Gmail__ClientSecret` | OAuth client secret |
| `Gmail__RefreshToken` | Refresh token for the sending Gmail account |
| `Gmail__SenderEmail` | The same Gmail address authorized for sending |

After setting the values, redeploy the API and try joining a queue with an email address you can check. If token refresh or Gmail send fails, the API logs the failing Google HTTP status without logging any credentials or PINs.
