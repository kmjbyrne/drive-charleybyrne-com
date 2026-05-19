# Sidebar Navigation

The sidebar is the persistent left-hand panel that provides workspace-level
navigation, search, content organisation, and system controls. It is visible on
every page of the application and serves as the primary way users move between
views and discover content.

## Brand Header

The top of the sidebar displays the application name "Storage" alongside the
current workspace name. This gives users a constant visual anchor and makes it
clear which workspace they are operating in, which becomes important when
multi-workspace support is added later. The brand header is not interactive
beyond potentially linking back to the home view.

## Search

Directly below the brand header sits a search bar that supports the Cmd+K
keyboard shortcut (Ctrl+K on non-Mac platforms). Activating the shortcut opens a
command palette overlay, similar to the patterns used in Notion, Linear, and VS
Code. The search should eventually support full-text search across file names,
folder names, and tag labels. For the initial implementation, client-side
filtering of the loaded file tree is sufficient.

The search bar itself is always visible in the sidebar and acts as both a visual
affordance and a click target that opens the same palette.

## Special Views

Below search, a set of special navigation items provide quick access to common
file views. These are not tied to the folder hierarchy but instead represent
filtered or computed collections of files.

**Home**

The default landing view. It shows a curated overview of the workspace,
potentially including recent files, pinned items, and quick access to frequently
used spaces. The exact content of the home view can evolve over time, but it
should feel like a personalised dashboard rather than a raw file listing.

**Recents**

Shows files ordered by last-modified or last-opened date, regardless of where
they live in the folder tree. This is one of the most-used views in any file
manager because it answers the question "what was I just working on?" without
requiring the user to remember folder paths.

**Starred**

Displays all files and folders the user has explicitly starred. Starring is a
lightweight bookmarking mechanism that cuts across the folder hierarchy, letting
users mark important items for quick access without moving them.

**Shared with me**

Lists files and folders that other workspace members have shared with the
current user. This view only becomes meaningful once sharing and collaboration
features are implemented, but the navigation item should be present from the
start as a placeholder.

**Trash**

Shows soft-deleted files and folders. Items in the trash can be restored or
permanently deleted. The trash should display when each item was deleted and
offer bulk operations for emptying.

## Space Tree

The most structurally important part of the sidebar is the collapsible space
tree. Spaces are the top-level organisational containers, analogous to root
folders but with richer metadata like colours and icons. Each workspace starts
with a set of default spaces, and users can create more.

The initial default spaces are Personal, Family, Design, and Code Archive. Each
space can contain nested folders to arbitrary depth, and the tree supports
expand/collapse interactions so users can focus on the parts of the hierarchy
they care about.

Spaces are visually distinguished from regular folders by their colour and icon.
When a space is selected, the file browser shows its contents. When a folder
within a space is selected, the file browser scopes to that folder. The
currently selected item in the tree should be highlighted to maintain
orientation.

The tree should support drag-and-drop for moving files and folders between
locations, though this can be deferred to a later iteration.

## Tags Section

Below the space tree, a tags section lists all tags defined in the workspace.
Tags provide a cross-cutting organisational dimension that complements the
hierarchical folder structure. A file can have multiple tags, and clicking a tag
in the sidebar filters the file browser to show only items with that tag.

The initial default tags are Tax, Inspiration, Read later, and Important. Each
tag has an associated colour for visual distinction. Users can create, rename,
and delete tags. Tag management UI can live in a settings area or inline in the
sidebar.

## Footer

The sidebar footer contains two elements.

**Storage Gauge**

A visual progress bar showing how much of the workspace's storage quota has been
consumed. The display format is "X.X GB of Y GB", for example "1.2 GB of 50 GB".
The gauge should change colour as usage approaches the limit, shifting from a
neutral tone to a warning colour above 80% and a danger colour above 95%.

The storage quota is a workspace-level setting. In the initial implementation
this can be a static configuration value, but it should eventually be
configurable per workspace.

**Dark Mode Toggle**

A simple toggle switch that flips between light and dark themes. Nuxt UI v4
provides built-in dark mode support through Tailwind CSS, so this toggle should
integrate with the framework's colour mode system rather than implementing
custom theme logic.

## Component Structure

The sidebar maps to a single top-level Vue component, likely `AppSidebar.vue`,
which composes several smaller components internally. A reasonable decomposition
would be:

```
AppSidebar.vue
  SidebarHeader.vue        (brand + workspace name)
  SidebarSearch.vue         (search bar + Cmd+K trigger)
  SidebarNavItems.vue       (Home, Recents, Starred, Shared, Trash)
  SidebarSpaceTree.vue      (collapsible space/folder hierarchy)
    SpaceTreeNode.vue       (recursive tree node)
  SidebarTags.vue           (tag list)
  SidebarFooter.vue         (storage gauge + dark mode toggle)
```

This decomposition keeps each component focused on a single concern and makes it
straightforward to test and iterate on individual sections.

## Relationship to Other Features

The sidebar interacts with the file browser through route-based navigation.
Clicking a space, folder, or special view changes the current route, and the
file browser reads the route to determine what to display. This decoupling means
the sidebar and file browser can be developed and tested independently.

The data model for spaces, folders, and tags is defined in
[data-model.md](./data-model.md). The sidebar consumes this data but does not
own the logic for fetching or mutating it -- that responsibility belongs to the
composables and server API layer described in
[architecture.md](./architecture.md).
