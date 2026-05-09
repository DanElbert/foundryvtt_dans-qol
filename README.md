# Dan's QoL

Quality-of-life features for Foundry VTT and dnd5e. Four independent features, each off by default and toggleable from settings.

## Compatibility

- Foundry VTT v14+ (verified on 14.361)
- All features work in any system. Keyboard rotation was built for dnd5e's `AbilityTemplate` flow but activates during any MeasuredTemplate placement preview.

## Installation

In **Add-on Modules → Install Module**, paste this manifest URL:

```
https://raw.githubusercontent.com/DanElbert/foundryvtt_dans-qol/main/module.json
```

All toggles live under **Configure Settings → Module Settings**.

## Features

### 1. Default Region cone shape

Foundry's Region cone tool always starts new cones at 60° round. With this feature enabled, you can override the angle and curvature so every cone you drag out from the toolbar starts with your preferred shape.

| Setting | Scope | Notes |
|---|---|---|
| Cone Defaults: Enable | World | Master toggle. Reload required when changed. |
| Cone Defaults: Angle | World | 0.01–360°. Decimals allowed (e.g. 53.13° for the 3-4-5 cone). Clamped by curvature: flat ≤ 90°, semicircle ≤ 180°. Live. |
| Cone Defaults: Curvature | World | round / flat / semicircle. Live. |

Implementation: `getSceneControlButtons` hook merges `{angle, curvature}` over the default `controls.regions.tools.cone.shapeData`. Existing/future fields on the tool are preserved.

### 2. Keyboard rotation while placing templates

While a spell template follows your cursor, mouse-wheel is normally the only way to rotate it. Enable this to add keyboard rotation as well.

| Setting | Scope | Notes |
|---|---|---|
| Keyboard Rotation: Enable | World | Master toggle. Live. |
| Keyboard Rotation: Step | World | Degrees per keypress (1–90). Hold **Shift** for fine 1° rotation. Live. |

The Q/E keybindings themselves remain per-user, editable in Configure Controls.

Bindings (Configure Controls → Dan's QoL):

| Action | Default key |
|---|---|
| Rotate Template Left | **Q** |
| Rotate Template Right | **E** |

When no template preview is active, the keypress falls through to whatever else is bound (default Q/E rotate the selected token), so leaving the defaults won't break normal token rotation.

### 3. Execute Macro on Click region behavior

Adds an **Execute Macro on Click** behavior to the Region behavior list. When a user left-clicks inside a region, the configured macro runs.

| Setting | Scope | Notes |
|---|---|---|
| Region Click Macro: Enable | World | Master toggle. Reload required. |

Usage:

1. Edit a Scene Region.
2. Add a behavior of type **Execute Macro on Click**.
3. Drop a macro into the **Macro** field, or paste its UUID.
4. Choose **Trigger Permission** (default: All Users).

The macro receives the following scope variables:

- `event` — the region event (`event.data.user` is the clicker, `event.data.point` is `{x, y}` in world coordinates)
- `region` — the RegionDocument
- `behavior` — the RegionBehavior document

Notes:

- Clicks that hit a token, drawing, wall, or other interactive placeable do not trigger the behavior. Only clicks on otherwise-empty canvas inside the region fire.
- GM clicks while the Region edit tool is active also do not trigger (the region layer claims them for editing).
- The macro executes on the clicking user's client. If you need GM-only execution, gate inside the macro with `if (!game.user.isGM) return;`.
- Disabling the toggle stops dispatching clicks but leaves existing behaviors intact, so re-enabling restores them.

### 4. GM-only secret blocks

Hides unrevealed `<section class="secret">` blocks from non-GM users. Useful when you embed GM notes inside an item description on a player-owned actor sheet, since dnd5e otherwise shows secret blocks to anyone with Owner permission on the document.

| Setting | Scope | Notes |
|---|---|---|
| GM-only Secrets: Enable | World | Master toggle. Reload required. |

**Caveats** (read these before relying on it):

- This is CSS-based hiding. The text is still in the rendered DOM and visible via DevTools or page source. It's spoiler-grade, not security-grade.
- When a player edits a field they have edit access to (their own bio is the common case), the secret text is fully visible inside the rich-text editor.
- Chat cards are not covered. dnd5e strips secrets server-side from many chat enrichment paths, so the CSS rule has nothing to operate on there.

If those caveats are deal-breakers, you'd need a libWrapper-based approach that overrides the `secrets: <doc>.isOwner` argument that dnd5e passes to `TextEditor.enrichHTML`. Out of scope for this module.

## Replacing older modules

If you're coming from `region-click-macro` and/or `dans-5e-templates`:

1. Install Dan's QoL via the manifest URL above and set toggles in Configure Settings.
2. Existing **Execute Macro on Click** region behaviors created under the old `region-click-macro` module are not auto-migrated. Recreate them on each scene under the new type, then uninstall the old module.
3. Settings don't carry over (the module id changed). Re-pick them.

## Settings persistence

Settings are stored under the module id `dans-qol`. Uninstalling leaves orphan rows in world settings / client localStorage; they're harmless.
