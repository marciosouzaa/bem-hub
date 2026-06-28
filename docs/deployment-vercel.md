# Vercel Deployment

Use this checklist when publishing BEM HUB to Vercel.

## 1. Prepare the Repository

Run locally before pushing:

```bash
bun run lint
bun run build
```

Commit the intended production state and push to GitHub. Keep `bun.lock` as the
package-manager lockfile. Do not commit `package-lock.json`.

## 2. Import on Vercel

1. Open Vercel Dashboard.
2. Choose `Add New...` > `Project`.
3. Import the GitHub repository.
4. Use the Next.js framework preset.
5. Keep Root Directory as `./`.
6. Use Bun:
   - Install Command: `bun install`
   - Build Command: `bun run build`

Use Node.js 22 or newer. Vercel's current default Node runtime is acceptable for
this project, but avoid Node 20 because the AI SDK dependency tree requires
Node 22+.

## 3. Environment Variables

Add these values in Vercel Project Settings > Environment Variables for
Production and Preview:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-5.5
APP_ENCRYPTION_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

`APP_ENCRYPTION_KEY` is required when admins save AI provider keys in the
workspace. Keep this value stable; rotating it without re-encrypting saved
provider connections makes existing encrypted keys unreadable.

Supabase used to expose an `anon` key label in older setups. For new Vercel
environments, use the Supabase publishable key and store it in
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

The code still supports `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a legacy fallback so
older local `.env.local` files do not break, but new docs and deployments should
prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## 4. Supabase Auth URLs

In Supabase Dashboard > Auth > URL Configuration:

- Site URL: the production Vercel URL, for example
  `https://bem-hub.vercel.app`.
- Redirect URLs:
  - `http://localhost:3000/**`
  - `https://bem-hub.vercel.app/**`
  - Vercel preview wildcard for the team/project, if previews need auth.

## 5. First Production Check

After the first deployment:

1. Open the Vercel URL.
2. Sign up a new user.
3. Confirm workspace bootstrap creates profile, organization, owner membership,
   and free subscription.
4. Open `/app`.
5. Open `/app/assistants`.
6. Create, edit, set default, and delete an assistant.
7. Use the user menu in the header to log out.
8. Check Vercel deployment logs and Supabase Auth/API logs for runtime errors.

## 6. Tenant-Isolation Check

Before treating the deployment as production-ready, manually test with two
Supabase users in different organizations:

- User A cannot list or mutate User B's assistants.
- User A cannot read User B's organization-scoped records.
- Member users can view assistants but cannot create, edit, delete, or set the
  default assistant.
