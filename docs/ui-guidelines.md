# UI guidelines

The app is used in the field: outdoors, on phones and tablets, sometimes with gloves,
in bright sunlight, and before a flight when mistakes are costly. These rules apply to
every screen. They build on **WCAG 2.2 level AA** (the standard web accessibility rules).

## Buttons and actions
- **One primary action per group**, filled with the accent colour (e.g. *Run* in a checklist row).
  Other actions use the default outlined style.
- **Destructive actions have a solid red background** with a white icon or text, and are placed
  **last** in their group. A red icon or red text alone is too hard to see on low-contrast or
  sunlit screens.
- **Icon-only buttons** are allowed for frequent, well-known actions in lists and toolbars.
  Every icon-only button must have:
  - an accessible name (`aria-label`) that says what happens, e.g. "Delete checklist";
  - a tooltip with the same text, shown on mouse hover, on keyboard focus and on long-press
    on touch screens. Use `IconButton.svelte`; never rely on the browser's `title` tooltip.
- **Labels are verbs** in sentence case: "Export Word", "Delete checklist", not "OK" or "Yes".

## Destructive actions and confirmation
- Actions that lose **significant data** need a confirmation dialog: deleting a checklist,
  deleting a section that still has items, replacing data on import.
- The dialog names the object ("Delete “Pre-flight A”?"), says what happens and whether it can
  be undone, and uses the verb on the confirm button ("Delete"), with a solid red background.
- **Cancel has the focus** when the dialog opens, so Enter never deletes by accident.
  Esc and clicking Cancel close the dialog without changes.
- Small, easily redone edits (deleting one item while editing) need no confirmation.
- Use `ConfirmDialog.svelte`. Never use the browser's `alert()`, `confirm()` or `prompt()`.

## Reordering
- Lists are reordered with a **drag handle** (`DragHandle.svelte`), not up/down arrow buttons.
  The handle is shown as a plain grip icon without a button frame (it is a grip, not a button),
  but keeps a 40 px touch area and a visible focus ring for keyboard users.
- Dragging must never be the only way (WCAG 2.2, 2.5.7). Every handle also supports:
  - **keyboard:** focus the handle and press Arrow Up / Arrow Down; the new position is announced;
  - **single tap or click** without dragging: a small menu with "Move up" / "Move down".
- While dragging, the row lifts (shadow) and follows the pointer, and the other rows slide apart
  to open a gap where it will land. In another section, that section grows and the sections below
  move down. On drop the row glides into place. The page scrolls near the top or bottom edge.
  With "reduce motion" turned on, rows move instantly instead of sliding.
- Items can move **between sections** (drag into another section, also an empty one; with the
  keyboard or menu, moving past the first or last item continues into the neighbouring section).
- An item moves **together with its bullets** and lands only between whole groups; a single bullet
  moves on its own.

## Touch, contrast and readability
- Touch targets at least **40 × 40 px** (WCAG 2.2 requires 24 px; 40 px+ suits gloves).
- Contrast at least 4.5:1 for text and 3:1 for icons, borders and focus rings, in both
  light and dark themes. Prefer high contrast: screens are read in sunlight.
- Everything works with the keyboard alone, with a visible focus ring.
- Respect `prefers-reduced-motion`; no motion is required to understand anything.

## Icons
- Use **Lucide** (`@lucide/svelte`) only, 20 px in buttons, default 2 px stroke.
- One icon per action, everywhere:

  | Action | Icon |
  |---|---|
  | Back | `ArrowLeft` |
  | Run | `Play` |
  | Edit | `SquarePen` |
  | Print / PDF / Word | `Printer` |
  | Export file | `Share` |
  | Delete | `Trash2` |
  | Reorder (drag handle) | `GripVertical` |
  | Add item / section | `Plus` (with text) |
  | Upload / change logo | `ImageUp` (with text, in the logo upload area) |
  | Warning in dialogs | `TriangleAlert` |

- **Mutually exclusive choices use a dropdown**, not separate toggles. Example: an item is exactly
  one of Normal, Bullet, Critical or Abort (the data model enforces this too). A non-default choice
  is also shown in colour on the dropdown, so the row's type is visible at a glance.
- **Independent on/off settings** use icon toggle buttons (`IconButton` with `pressed`): when on,
  the button gets an accent outline and tint and `aria-pressed="true"`. The tooltip names the setting.
- Actions without a well-known icon (e.g. "New revision") stay text buttons; adding items or
  sections uses icon plus text.

## Offline and security
- No external assets: no CDN, web fonts or remote images. Icons are compiled into the app.
- Everything must work under the Content-Security-Policy in `public/_headers`
  (`npm run e2e` checks this).
