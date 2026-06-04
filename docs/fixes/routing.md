these are just views, we probably should have different composables?

❯ why are doing a catch all? We can just have dedicated routes for those pages?

❯ weird implementation

● You're making a fair point. The catch-all [...slug].vue handling all these views (home, recents, starred, shared, trash, tags, spaces) in one massive file with a
SpecialView union type is not a great pattern. Each view should be its own page with its own composable. But that's a significant refactor.

For now, the activity page is done as a dedicated route (/activity) with its own page file — it doesn't touch the catch-all at all. That's the right direction.

Do you want me to tackle the bigger refactor of breaking the catch-all into dedicated pages, or leave that for another session and just get the activity working for
now?
⎿  Stop says: Worklog reminder: write instance/worklog/2026-06-03/23-46-17.md
