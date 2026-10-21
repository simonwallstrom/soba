# Auth and households

Everyone signs in with Google through [Better Auth](https://www.better-auth.com/). Each user belongs to at most one household, which shares one recipe collection and meal plan. Everything lives in D1 (`src/server/db/schema.ts`); see [Household data](./data.md) for recipes and the meal plan.

## Who can sign up

Soba is invite-only. A new Google account can sign up when either:

- its email is on the beta list (the `beta_invite` table) or in `ADMIN_EMAILS`, or
- it signs in from an invite link with a valid token.

The invite page passes its token through Google sign-in as OAuth state. A database hook (`assertCanSignUp` in `src/server/auth/auth.ts`) checks it before the user row is created. Anyone else gets a "not invited" error.

Only users on the beta list or in `ADMIN_EMAILS` can create a household. Everyone else joins one through an invite. `isAllowlisted` (`src/server/admin/beta.ts`) checks both; admins are always let in, so nobody can lock themselves out.

## Admin

Admins, listed in the `ADMIN_EMAILS` secret, get `/admin`: everyone who has signed up, with their household, counts, "Get started" progress and last activity, and the beta list, which they add emails to and remove them from. Removing an email only stops new sign-ups and household creation; an account already made stays.

- `requireAdmin` (`src/server/admin/routes.ts`) answers everyone else with the same 404 as a path that doesn't exist, logged in or not.
- The session carries `user.isAdmin`, which shows "Admin" in the account menu and in Settings, for phones. Non-admins who open `/admin` see "Page not found".
- Last activity is the newest session's `updatedAt`, which moves at most once a day.

## Names and photos

A new account takes its name and photo from Google, or the start of its email when Google gives no name. They aren't synced on later logins, because users can rename themselves on the Settings page through Better Auth's update-user endpoint. A database hook (`cleanUserUpdate` in `src/server/auth/policy.ts`) trims the name and drops any photo change, so the photo stays Google's.

## Households

- **Roles:** the creator is the `owner`, and everyone who joins is a `member`. A household holds at most 20 members.
- **Invites:** each household has one invite link, on when it's created. Only the owner can switch it off or on, which keeps its token, so switching it back on brings the same link back, or reset it, which makes a new token, so the old link never works again.
- **Leaving:** a member can leave at any time. The owner can't be removed and can leave only by deleting the household once nobody else is in it.
- **Name:** only the owner can rename the household.
- **Settings:** language and units, used to translate and convert imported recipes, and a time zone, which tells the MCP server what day it is for the household. The app itself uses each device's date. Any member can change them. A new household's defaults come from the creator's browser; the time zone isn't asked for during onboarding, so it's shown in Settings for anyone who signed up away from home.
- **Settings page:** your account, your devices, and everything about the household (name, settings, members, the invite link, leaving or deleting) are on `/settings`. Groups can be linked to by hash, like `/settings#members` from the account menu's "Invite member" and `/settings#tags` from the sidebar.

MCP clients like Claude sign members in through OAuth instead of a session cookie; see [MCP](./mcp.md).

Routes are in `src/server/household/routes.ts` and queries in `src/server/household/household.ts`.

## Get started checklist

New members get a "Get started" checklist (`features/get-started/checklist.tsx`) at the bottom of the sidebar. Phones have no sidebar, so there the same card sits above the tab bar, on the tabs themselves, folded until it's opened. Each step is ticked off from the member's own data, never by clicking it: a recipe they created, a dinner they planned, an assistant they connected. Only the owner can invite, so only the owner's list has "Create your household" and "Invite your family", which is done once someone joins (the invite link is on from the start, so it can't count).

Hiding it, or finishing every step, sets `checklist_hidden_at` on the member, so it's gone on every device. The session carries it as `household.checklistHidden`. Finishing shows "You're all set" until the member moves on.

## Sessions on the server

- Sessions last 30 days and refresh daily.
- A signed cookie cache holds session data for 5 minutes, so most requests skip D1.
- **Devices:** Settings lists the member's sessions and logs out others (`src/server/auth/devices.ts`). It reads and deletes session rows in D1, not through Better Auth's `list-sessions`, which refuses sessions older than a day, and session tokens never reach the client. A device logged out keeps working until its cookie cache expires, up to 5 minutes.
- `requireSession` and `requireHousehold` middleware authorize API routes. Every protected request is checked on the server; the client's session is only a UI cache.
- `/api/*` rejects cross-origin requests (CSRF), and auth and invite routes are rate-limited by IP.

## Sessions on the client

The client reads `/api/me` through a shared TanStack Query cache (`src/client/lib/session.ts`):

- **Instant start:** the last signed-in session is saved to `localStorage`. On load it is shown immediately and revalidated in the background, so the app renders before the server answers.
- **Blocking only once:** the `/_authenticated` route waits for the session only on a first visit with nothing cached.
- **Revalidation:** the session goes stale after a minute and refetches on window focus, on reconnect, and every 5 minutes.
- **After changes:** call `invalidateSession()` after creating, joining, or leaving a household, or removing a member. It refetches and tells other tabs over a `BroadcastChannel`.

## Losing access

When the session changes to another user or household, or to none, the client clears everything local before moving on:

- **Sign-out:** signs out with Better Auth, clears local storage through `/api/local-data/clear`, and tells other tabs. Each tab then reloads, which drops the household data it held in memory.
- **Removed from a household:** the next session check notices the household is gone. `/_authenticated` resets local data and sends the user to onboarding.

Keep this teardown intact when changing auth or household flows: a tab that kept its copy would show a household's recipes to someone no longer in it. The server checks membership on every request either way.
