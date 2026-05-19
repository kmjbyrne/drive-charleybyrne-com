# File Browser

The file browser is the central content area of the application. It renders
files and folders for the currently selected location, supports multiple view
modes, and provides the interaction surface for opening, managing, and
previewing files.

## View Modes

The file browser supports three distinct view modes. Users can switch between
them using a toggle in the content header. The selected view mode should persist
across navigation so that switching folders does not reset the preference.

**List View**

A table-style layout where each file or folder occupies a single row. Rows
display the file icon, name, file extension badge, size, last modified date,
owner avatar, members (if shared), and a star toggle. The list view is the most
information-dense mode and the default for users who prioritise scanning
metadata quickly.

Columns in list view should be sortable by clicking the column header. The
default sort is by name ascending, but users can sort by size, modified date, or
type.

**Grid View**

A card-based layout where each file is represented as a tile showing a
type-aware thumbnail, the file name, and minimal metadata. Grid view is better
suited to visual content like images, design files, and videos where the preview
thumbnail carries more information than the metadata fields.

Grid tiles should be a consistent size with responsive wrapping so that the
layout adapts to the available width.

**Column View (Finder-Style)**

A multi-pane layout inspired by macOS Finder's column view. Selecting a folder
in one column opens its contents in the next column to the right, creating a
breadcrumb-like drill-down experience. This mode is especially useful for
navigating deep folder hierarchies because it preserves context about where you
are in the tree.

Column view is the most structurally complex mode and can be deferred to a later
iteration if needed. The list and grid views should be built first.

## File Type System

Every file has an associated type that determines its icon, thumbnail rendering,
and available actions. The supported types are:

| Type   | Extensions                    | Icon Style         |
| ------ | ----------------------------- | ------------------ |
| doc    | .docx, .doc, .txt, .md        | Document icon      |
| pdf    | .pdf                          | PDF icon           |
| image  | .jpg, .png, .gif, .svg, .webp | Image thumbnail    |
| video  | .mp4, .mov, .webm             | Video play overlay |
| design | .fig, .sketch, .psd, .ai      | Design tool icon   |
| code   | .ts, .js, .py, .html, .css    | Code bracket icon  |
| zip    | .zip, .tar, .gz, .rar         | Archive icon       |
| folder | (directory)                   | Folder icon        |

The type is derived from the file extension at upload time and stored as part of
the file metadata. The mapping from extension to type should be centralised in a
utility function so it can be reused across the frontend and backend.

## File Metadata

Each file record carries the following metadata fields, all of which are
available for display and filtering in the browser.

The **name** is the user-facing file name including extension. The **ext** is
the file extension extracted for type mapping and display as a badge. The
**size** is the file size in bytes, formatted for display as KB, MB, or GB as
appropriate. The **modified** timestamp records when the file was last updated.
The **owner** is the user who uploaded the file, displayed as an avatar.
**Members** is the list of users the file has been shared with, rendered as an
avatar stack. The **starred** flag indicates whether the current user has
bookmarked the file. The **type** field maps to the file type system described
above.

## Content Header

Above the file list, a content header provides contextual controls for the
current view.

The left side shows the current location as a breadcrumb path (e.g. "Personal >
Projects > Website") and the total item count. The right side contains the view
mode toggle (list/grid/columns) and a sort dropdown.

Between the breadcrumb and the file list, a row of filter chips allows quick
filtering by content type. The available chips are All, Documents, Images, and
Folders. Selecting a chip filters the current view to show only items matching
that type. The "All" chip clears any active filter. These chips are not mutually
exclusive with search -- a user can search and filter simultaneously.

## Context Menus

Right-clicking a file or folder row (or clicking a three-dot menu icon) opens a
context menu with the following actions:

**Open** navigates into a folder or opens the file preview/viewer. **Share**
opens the share dialog (see the Share Dialog section below). **Copy link**
copies a direct URL to the file to the clipboard. **Version history** opens the
version history modal showing previous versions of the file. **Rename**
activates inline editing of the file name. **Move** opens a folder picker dialog
to relocate the file. **Delete** soft-deletes the file, moving it to trash.

The available actions should vary by context. Folders do not have version
history. Files in the trash view show "Restore" and "Delete permanently" instead
of the standard actions.

## Preview System

The preview system provides a way to inspect file details without fully opening
the file. It operates in two modes.

**Pinned Mode**

When pinned, a right-hand pane appears alongside the file browser, splitting the
content area. The pane has three tabs: Info, Comments, and Versions. The Info
tab shows the file thumbnail, name, type, size, owner, modified date, tags, and
sharing status. The Comments tab shows a threaded comment stream attached to the
file. The Versions tab shows the file's version history with timestamps and the
ability to restore previous versions.

The pinned pane remains open as the user navigates between files. Clicking a
different file updates the pane content without closing it. A pin/unpin toggle
in the pane header controls this behaviour.

**Overlay Mode**

When unpinned, clicking a file opens the preview as a modal overlay instead. The
overlay shows the same three tabs but takes up more screen space since it is not
constrained to a side pane. Closing the overlay returns to the file browser.

**Type-Aware Previews**

The preview thumbnail adapts to the file type. Images render the actual image
(or a gradient placeholder during loading). Videos show a still frame with a
centered play button overlay. Documents and PDFs show a mock page with faint
text lines to suggest content. Design files show a placeholder with the tool's
icon. Code files could eventually show a syntax-highlighted snippet.

## Share Dialog

The share dialog is a modal that controls who has access to a file or folder. It
contains three sections.

The top section is an email input for inviting new people. Typing an email and
pressing enter adds the person to the access list. Each invited person gets a
role dropdown (Viewer, Commenter, Editor) that controls their permission level.

The middle section lists all people who currently have access, showing their
avatar, name, email, and role. The owner is always listed first and cannot be
removed. Other members can have their role changed or be removed entirely.

The bottom section controls general access. A toggle switches between
"Restricted" (only explicitly invited people) and "Anyone with the link". When
link sharing is enabled, a copyable URL is displayed.

## Version History Modal

The version history modal shows a chronological list of all saved versions of a
file. Each entry displays the version number, timestamp, the user who saved it,
and the file size at that point. Selecting a version shows a diff or preview
comparison between that version and the current version.

A "Restore" button on each version entry replaces the current file with the
selected historical version, creating a new version entry in the process so that
the action is reversible.

## Component Structure

The file browser is composed of several interconnected components:

```
FileBrowser.vue
  BrowserHeader.vue           (breadcrumb, count, view toggle, sort)
  FilterChips.vue             (All, Documents, Images, Folders)
  FileListView.vue            (table layout)
    FileRow.vue               (single row with metadata columns)
  FileGridView.vue            (card grid layout)
    FileCard.vue              (single tile with thumbnail)
  FileColumnView.vue          (Finder-style multi-pane)
    ColumnPane.vue            (single column in the hierarchy)
  FileContextMenu.vue         (right-click actions)
  PreviewPane.vue             (pinned side pane)
    PreviewInfo.vue           (Info tab content)
    PreviewComments.vue       (Comments tab content)
    PreviewVersions.vue       (Versions tab content)
  PreviewOverlay.vue          (modal preview for unpinned mode)
  ShareDialog.vue             (sharing modal)
  VersionHistoryModal.vue     (version history modal)
```

## Relationship to Other Features

The file browser reads its data from composables that wrap the server API. The
data structures it consumes are defined in [data-model.md](./data-model.md).
Navigation into the file browser is driven by the sidebar (see
[sidebar-navigation.md](./sidebar-navigation.md)), which sets the current route
to determine which space, folder, or special view is active.

The backend API endpoints that serve file and folder data follow the hexagonal
architecture described in [architecture.md](./architecture.md). The file browser
does not call the database directly -- it goes through composables that call
Nitro API routes, which in turn delegate to domain services.
