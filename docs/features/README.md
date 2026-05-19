# Storage -- Feature Documentation

Storage is a self-hosted file management application built with Nuxt 4 and Nuxt
UI v4. It aims to replace consumer cloud storage services like Dropbox and
Google Drive with a clean, Notion-inspired interface and full ownership of the
underlying data.

## What This Directory Contains

Each file in `docs/features/` describes one major area of the application. The
documents are designed to be read in any order, though the architecture document
provides useful context for understanding how the backend is structured.

## Feature Map

The application is composed of five primary surface areas plus a backend
architecture layer that underpins all server-side behaviour.

**Sidebar Navigation**

The persistent left sidebar provides workspace-level navigation, search, space
and folder trees, tags, and a storage gauge. It is the primary way users move
between views and discover content. Full specification lives in
[sidebar-navigation.md](./sidebar-navigation.md).

**File Browser**

The central content area renders files and folders in one of three view modes:
list, grid, or column (Finder-style). It supports filtering by type, sorting by
metadata, and row-level context menus for common operations like sharing,
renaming, and version history. See [file-browser.md](./file-browser.md).

**Preview System**

A pinnable right-hand pane shows file metadata, comments, and version history.
When unpinned, previews appear as a modal overlay instead. The preview system
renders type-aware thumbnails for images, documents, videos, and other file
types. This is covered within the file browser document since the two are
tightly coupled in the UI.

**Data Model**

The domain model describes the entities that power the application: workspaces,
spaces, folders, files, members, tags, and versions. Mock data structures are
defined here for use during frontend development before the backend is wired up.
See [data-model.md](./data-model.md).

**Hexagonal Architecture**

All backend code follows a hexagonal (ports and adapters) architecture,
consistent with the pattern established in the sibling `boards` project. Domain
types, port interfaces, services, and adapter implementations each live in
clearly separated layers. The full plan is in
[architecture.md](./architecture.md).

**Document Viewer (Future)**

A planned but not-yet-implemented feature for rendering and editing DOCX files
directly in the browser. This document captures the design intent and technical
approach so it can be picked up later. See
[document-viewer.md](./document-viewer.md).

## Implementation Order

The recommended order for building features is as follows. The data model and
architecture should be established first since every other feature depends on
the shapes and boundaries they define. The sidebar and file browser can then be
built in parallel as largely independent UI surfaces. The preview system follows
naturally from the file browser. The document viewer and other future features
come last.

1. Data model and architecture (foundations)
2. Sidebar navigation and file browser (core UI, parallelisable)
3. Preview system and modals (depends on file browser)
4. Share dialog and collaboration
5. Document viewer and future features

## Future Features (Not Yet Specified)

Several features are planned but intentionally deferred. They are documented
briefly in [document-viewer.md](./document-viewer.md) and listed here for
visibility.

AI-powered summaries and file-level chat would allow users to ask questions
about a document's content and receive answers generated from the file. An
activity feed would show a chronological stream of actions taken across the
workspace, useful for teams. A photo gallery with lightbox mode would provide a
dedicated view for browsing image files. Mobile responsive layout work will
adapt the sidebar, file browser, and preview pane for smaller screens.
