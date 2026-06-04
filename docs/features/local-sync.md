# Local Filesystem Sync

## Introduction

This document explores how to sync files from a local filesystem into the
storage app, similar to how Dropbox keeps a local folder in sync with its cloud
backend. The web app runs in a browser sandbox and cannot watch the filesystem
directly, so every approach requires some component running outside the browser.

The existing API already supports everything needed on the server side. Upload
is a multipart POST to `/api/storage/upload` with `file`, `spaceId`, and
optional `parentId` fields. Listing is a GET to
`/api/storage/files?spaceId=...&parentId=...`. Download streams from
`/api/storage/download?key=...`. Auth uses a JWT cookie (`auth-token`) verified
against a remote JWKS endpoint (Janus), with a dev bypass mode for local
development.

The question is what runs on the client machine to bridge the gap between the
filesystem and these endpoints.

## Options

### 1. Push Script (Manual or Cron)

A standalone script (Node.js, Python, or shell) that walks a local directory,
compares its contents against what is already on the server, and uploads
anything new or changed. You run it manually or schedule it with cron.

**How it works**

The script maintains a local manifest file (JSON) that records the path, size,
and content hash of every file it has previously synced. On each run it walks
the sync directory, hashes each file, compares against the manifest, and uploads
anything that is new or has changed. After a successful upload the manifest is
updated.

```
~/Storage/
  Documents/
    report.pdf        ← new file, upload it
    notes.txt         ← hash matches manifest, skip
  Photos/
    beach.jpg         ← size changed, re-upload
.storage-sync.json    ← manifest
```

**Portability**

Very high. A Node.js script runs on macOS, Linux, and Windows without
modification. A shell script covers macOS and Linux. The only dependency is HTTP
access to the server and a valid auth token.

**Complexity**

Low. Roughly 100-150 lines of code. No daemon, no filesystem watchers, no
conflict resolution. The script is stateless between runs except for the
manifest file.

**Limitations**

Sync is one-directional (local to server). Deletions are not propagated unless
you add explicit logic for that. There is no real-time sync; you get updates
only when the script runs.

---

### 2. File-Watching Daemon

A background process that uses filesystem event APIs (inotify on Linux, FSEvents
on macOS, ReadDirectoryChangesW on Windows) to detect changes in real time and
upload immediately.

**How it works**

The daemon starts, subscribes to filesystem events on the sync directory, and
keeps a persistent connection or polling loop against the server. When a file is
created or modified, it uploads after a short debounce window (to avoid
uploading partial writes). When a file is deleted, it optionally marks the
server entry as trashed.

In Node.js, `chokidar` abstracts the platform differences into a single API. In
Go, `fsnotify` does the same. In Rust, `notify` is the equivalent.

**Portability**

High, but with caveats. `chokidar` works cross-platform but has known edge cases
on network-mounted filesystems and some Linux configurations with low inotify
watch limits. A compiled Go or Rust binary is a single file with zero runtime
dependencies, which is the most portable option for distribution.

**Complexity**

Medium. You need to handle debouncing (editors save files in stages), large file
chunking, retry logic for network failures, and graceful shutdown. Bidirectional
sync (pulling changes from the server back to disk) roughly doubles the
complexity and introduces conflict resolution.

**Limitations**

Requires the daemon to be running. On macOS and Windows, users expect a tray
icon and launch-on-login behaviour, which adds packaging overhead. Bidirectional
sync needs conflict resolution (last-write-wins, or conflicted copies like
Dropbox does).

---

### 3. Electron or Tauri Desktop Wrapper

Package the existing Nuxt web app inside a desktop shell that has full
filesystem access. The app renders in a Chromium (Electron) or system WebView
(Tauri) and can read/write local files through Node.js or Rust APIs.

**How it works**

The desktop app embeds the web UI and adds a native sync module that watches a
configured folder. From the user's perspective it is a single application: they
see the web UI and their local folder stays in sync behind the scenes. Tauri is
significantly lighter than Electron (the binary is typically 5-10 MB vs 150+ MB)
because it uses the OS WebView rather than bundling Chromium.

**Portability**

High. Both Electron and Tauri produce builds for macOS, Linux, and Windows.
Tauri additionally supports iOS and Android (beta). The trade- off is build
complexity: you need CI pipelines for each target platform, code signing for
macOS/Windows, and auto-update infrastructure.

**Complexity**

High. You are now maintaining a desktop application in addition to the web app.
Even with shared UI code, the packaging, signing, updating, and
platform-specific behaviour (tray icon, notifications, file associations) add
significant surface area.

**Limitations**

This is a large investment for a personal tool. It makes sense if you want a
polished product with broad distribution, but is overkill if you just want your
own files to sync.

---

### 4. WebDAV Server

Expose the storage backend as a WebDAV endpoint. Every major OS has a built-in
WebDAV client that can mount a remote WebDAV share as a network drive.

**How it works**

You add a WebDAV-compatible HTTP handler to the Nuxt server (or run it as a
separate service) that maps WebDAV verbs (PROPFIND, GET, PUT, MKCOL, DELETE,
MOVE, COPY) to the existing catalog and storage repositories. The user mounts
the share using their OS file manager (Finder on macOS, Explorer on Windows,
`davfs2` on Linux) and interacts with it like a local drive.

**Portability**

Very high on the server side (it is just HTTP). Client support varies: macOS
Finder works well, Windows Explorer has a troubled history with WebDAV (file
size limits, slow enumeration, caching issues), and Linux requires installing
`davfs2`. Third-party clients like Cyberduck or Mountain Duck provide a better
experience on all platforms.

**Complexity**

Medium-high. The WebDAV spec is large and OS clients are picky about compliance.
Locking, property queries, and partial content (Range requests) all need correct
implementation. Libraries like `webdav-server` (Node.js) or
`golang.org/x/net/webdav` handle most of this, but integration with the existing
catalog model still requires careful mapping.

**Limitations**

WebDAV gives you file access, not sync. Files are accessed over the network on
demand, not cached locally. Performance depends on network latency. There is no
offline access unless you layer a sync client on top (like Mountain Duck's Smart
Sync), at which point you are back to option 2 with extra steps.

---

### 5. File System Access API (Browser-Only)

Modern Chromium-based browsers (Chrome, Edge, Arc) support the File System
Access API, which lets a web page request read/write access to a local directory
with user permission.

**How it works**

The user clicks a button in the web UI, picks a local folder via
`window.showDirectoryPicker()`, and grants the app ongoing access. The app can
then enumerate files, read contents, and write back. The permission persists
across page loads (in Chrome) but the tab must be open for sync to run.

**Portability**

Low. Firefox and Safari do not implement this API and have stated they are
unlikely to. It only works on desktop Chromium browsers. The tab must remain
open. There is no background sync.

**Complexity**

Low-medium. The API is well-designed and relatively simple to use. The main work
is building the diff/sync logic in the browser, which is similar to option 1 but
running client-side.

**Limitations**

Chrome-only. No background operation. The user must keep the tab open and
manually grant permission on first use. Not suitable for reliable, always-on
sync. Best suited for a manual "import from local folder" feature rather than
continuous sync.

## Comparison

| Approach               | Portability | Complexity  | Real-time | Offline  | Bidirectional |
| ---------------------- | ----------- | ----------- | --------- | -------- | ------------- |
| Push script            | High        | Low         | No        | N/A      | No            |
| File-watching daemon   | High        | Medium      | Yes       | N/A      | Possible      |
| Desktop wrapper        | High        | High        | Yes       | Possible | Possible      |
| WebDAV server          | Medium      | Medium-high | N/A       | No       | Yes (live)    |
| File System Access API | Low         | Low-medium  | No        | N/A      | Possible      |

## Recommendation

For a personal storage app, start with the push script (option 1). It is the
simplest to build, the easiest to reason about, and it solves the core problem:
getting files from your machine into the app without dragging them through a
browser file picker one at a time.

If you find yourself wanting real-time sync later, graduate to the file-
watching daemon (option 2). It builds on the same upload logic but adds
event-driven triggers. A single-binary Go or Rust implementation would be the
most portable and easiest to distribute.

The desktop wrapper and WebDAV approaches are worth considering if the project
grows beyond personal use, but they carry significantly more maintenance burden
and are hard to justify until there are other users who need them.

The File System Access API is worth keeping in mind as a lightweight "import
folder" feature in the web UI, but it cannot replace a proper sync solution due
to browser limitations.
