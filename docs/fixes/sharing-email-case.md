# Sharing: Email Case Sensitivity

## Problem

Sharing between users silently failed. User A would share a file with user B,
but user B's "Shared with me" view was empty. The share modal reported success,
and "Shared by me" showed the file, but the recipient never saw it.

## Root Cause

SQLite's `=` operator is case-sensitive. The `users` table stored emails with
their original casing (e.g. `Keith@Gmail.com`), but `findByExactEmail` searched
with `.toLowerCase()`. The query `WHERE email = 'keith@gmail.com'` never matched
`Keith@Gmail.com`.

This caused the grant flow in `sharing/grant.post.ts` to miss the target user
entirely and fall back to creating a **pending invite** in `shareInvites`
instead of a direct permission in `objectPermissions`. The "Shared with me"
endpoint only queried `objectPermissions`, so the recipient saw nothing.

## Fix

Three layers of defence were applied.

**Normalise on write** (`server/api/auth/callback.post.ts`). The upsert now
stores `userEmail` (lowercased) instead of the raw JWT claim. All new logins
write a canonical lowercase email.

**Case-insensitive lookup**
(`server/app/repositories/sqlite-user.repository.ts`). `findByExactEmail` now
uses `lower(email) = ?` so it matches regardless of what's stored. This handles
any rows written before the normalisation fix.

**Auto-convert pending invites**. Two places now promote invites to real
permissions on-the-fly:

- `server/api/storage/shared.get.ts` converts any pending invites it finds for
  the authenticated user's email into `objectPermissions` rows and deletes the
  invite. This means the first load of "Shared with me" resolves all outstanding
  invites.

- `server/app/guards.ts` (`requireAccess`) falls back to checking `shareInvites`
  when a normal permission check fails. If a matching invite exists with
  sufficient role rank, it converts it and allows the request. This catches
  download and metadata requests that happen before `shared.get` runs.

## Other Changes

The `FilePreview.vue` share button is now hidden when the current user doesn't
own the file (`canShare` computed checks `file.ownerId === user.sub`).
Recipients of shared files no longer see a share button they can't use.

## Tests

Three new tests in `shared.get.test.ts` cover the pending invite path: basic
inclusion, deduplication against existing permissions, and `sharedBy` resolution
from the invite granter. All 82 tests pass.
