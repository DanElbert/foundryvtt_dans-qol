# CLAUDE.md

Notes for future Claude sessions working on this module. User-facing docs live in `README.md`; this file is about the code.

## What this is

A Foundry VTT v14 module bundling four small independent features, each gated by its own setting. Three were ported from earlier single-feature modules (`region_click_macro`, `dans-5e-templates`); one (GM-only secrets) is new.

## Layout

| File | Role |
|---|---|
| `module.json` | Foundry manifest. Compatibility minimum 14, verified 14.361. Declares the `clickMacro` RegionBehavior document type. |
| `scripts/main.mjs` | Entry. `init` registers settings, always-on RegionBehavior type and keybindings, then conditionally each gated feature's hooks. |
| `scripts/settings.mjs` | `MODULE_ID`, `SETTINGS` map, `registerSettings()`. |
| `scripts/log.mjs` | Shared `[dans-qol]` console wrapper. |
| `scripts/features/cone-defaults.mjs` | `registerConeDefaults()`. `getSceneControlButtons` hook merges `{angle, curvature}` into `controls.regions.tools.cone.shapeData`. |
| `scripts/features/keyboard-rotation.mjs` | `registerKeyboardRotation()`. Q/E keybindings rotating an active MeasuredTemplate preview. |
| `scripts/features/region-click.mjs` | `ClickMacroBehaviorType` data model + type registration + click dispatch. |
| `scripts/features/gm-only-secrets.mjs` | `ready` hook adds body classes. The work is in `styles/gm-only-secrets.css`. |
| `styles/gm-only-secrets.css` | Hides `.secret` for non-GMs. Scoped to `body.dans-qol-secrets` so the rules don't apply unless the feature is enabled. |
| `lang/en.json` | RegionBehavior type display names plus ClickMacro field/permission strings. |
| `sync.sh` | rsync to dev Foundry box. Gitignored. |

## Conventions

- Module id is kebab-case (`dans-qol`), referenced via `MODULE_ID` in `settings.mjs`. Don't hard-code the literal.
- Settings keys are looked up via `SETTINGS.<key>`, not raw strings.
- Each setting's `name` follows `"<Feature>: <Field>"` so they group visually in the standard "Configure Settings → Module Settings" panel.
- Feature toggles that affect hook/keybinding registration use `requiresReload: true` because registration is gated at `init` time. Settings consumed inside hooks at runtime (cone angle/curvature, rotation step) do not require reload; they take effect on the next render.
- No code comments unless something is genuinely non-obvious. README explains user-facing behavior; this file explains code-level decisions.

## The init-time gating pattern

```js
Hooks.once("init", () => {
    registerSettings();
    registerRegionClickType();    // always, for data integrity
    registerKeyboardRotation();   // always, runtime-gated (see below)
    if (enabled(coneEnabled)) registerConeDefaults();
    if (enabled(regionClickEnabled)) registerRegionClickDispatch();
    if (enabled(secretsHideEnabled)) registerGMOnlySecrets();
});
```

Why reading settings in `init` works: at init-time the world settings storage is populated. It's set in the `Game` constructor from `data.settings` returned by the server, well before `Game.prototype.initialize()` fires the `init` hook. See `client/game.mjs:67` (constructor) and `client/game.mjs:648-652` (`initialize` calling `Hooks.callAll("init")`). Once `registerSettings()` has declared a key, `game.settings.get(MODULE_ID, key)` returns the stored value (or the default).

### When to gate at init vs at runtime

Two registrations are deliberate exceptions to init-time gating:

- **`registerRegionClickType()`** must run unconditionally to keep the RegionBehavior data model resolvable for any existing scene data, regardless of toggle state.
- **`registerKeyboardRotation()`** must run unconditionally because `game.keybindings.register` throws after init. The setting is checked inside `handleRotation` at runtime, so toggling takes effect immediately without a reload. Cost: the keybindings show up in Configure Controls even when the feature is disabled.

The other three features (cone defaults, region click dispatch, GM-only secrets) gate registration at init and use `requiresReload: true` on their toggle settings, because their hooks have no cheap runtime gate.

## RegionBehavior type registration

`ClickMacroBehaviorType` is registered under a single type string `dans-qol.clickMacro` in `CONFIG.RegionBehavior.dataModels`. Behaviors created under the old `region-click-macro` module are not auto-migrated; users are expected to recreate them under the new type.

Registration happens unconditionally at init even when the click-dispatch toggle is off, so any existing scene data resolves cleanly during a load. Without this, behaviors of an unknown type get dropped to "Base" and corrupt on save.

## GM-only secrets

CSS-only. The body class `dans-qol-secrets` is added in a `ready` hook only when the feature is enabled; without it the CSS rules don't match anything. A second class `dans-qol-gm` opens visibility back up for the GM. Three rules total:

```css
body.dans-qol-secrets .secret { display: none; }
body.dans-qol-secrets .secret.revealed { display: block; }
body.dans-qol-secrets.dans-qol-gm .secret { display: block; }
```

Spoiler-grade, not security-grade. The text remains in the DOM. For real hiding you'd need to wrap `TextEditor.enrichHTML` (or the per-sheet `_prepareContext` calls in dnd5e that pass `secrets: this.actor.isOwner`) and force `secrets: false` for non-GMs server-side.

## Foundry APIs this module relies on

- `Hooks.callAll("init")` fires before `Game.prototype.registerSettings()` (Foundry's own setting registration). World settings storage is populated in the `Game` constructor at `client/game.mjs:67`, so module settings can be registered AND read in init.
- `controls.regions.tools.cone.shapeData` is cloned by `_createDragShapeData` (`client/canvas/layers/mixins/shapes.mjs:296`) when dragging a new cone. Only `shapeData` controls geometry; document fields come from `RegionLayer._createDragPreviewData`.
- `game.keybindings.register` must be called during `init` (`client-keybindings.mjs:156` throws after).
- `canvas.templates.preview.children` is where dnd5e's `AbilityTemplate.drawPreview()` adds itself (`dnd5e/module/canvas/ability-template.mjs:147`). The keyboard-rotation handler walks that array to find an active preview.
- `canvas.mouseInteractionManager.callbacks.clickLeft` is monkey-patched (with a `_dansQolRegionClickWrapped` flag to prevent double-wrapping) to intercept canvas clicks.
- `CONFIG.RegionBehavior.dataModels[<type-string>]` is the registry for behavior data models. Multiple keys can point at the same class (alias pattern).
- `RegionBehavior.type` is a `DocumentTypeField` (a mutable `StringField`); changing it via `update({type})` is supported as long as the new value is in `RegionBehavior.TYPES`.

## Reference checkouts

These are present locally and are the source of truth when extending this module:

- `/home/dan/Development/foundry/foundryvtt/` — Foundry source, one commit per release. `git checkout vX.YYY` to switch versions.
- `/home/dan/Development/foundry/dnd5e/` — dnd5e v5.3.2.

## Dev workflow

Edit locally, then `./sync.sh` (or `./sync.sh --dry-run` first) to push to the dev Foundry instance at `root@64.225.12.14:/mnt/foundry_data/next/Data/modules/dans-qol/`. `sync.sh` excludes `.git/`, `.gitignore`, itself, swap files, and `.DS_Store`. Reload the world (or just refresh the browser) to pick up code changes; settings UI re-renders on save.

No build step. ES modules load directly via `esmodules` in `module.json`.

## Things to be careful about

- **Don't gate `registerRegionClickType()`.** It must run unconditionally even when the click feature is toggled off. If you gate it, worlds with existing click behaviors come up with unknown types when the toggle is off, which corrupts data on save.
- **Don't replace `cone.shapeData` wholesale.** Use `foundry.utils.mergeObject` so future Foundry versions adding fields to the tool object don't break.
- **Don't register keybindings outside `init`.** `game.keybindings.register` throws after init.
- **Don't add `requiresReload: true` to settings consumed at runtime** (cone angle, cone curvature, rotation step, rotation enabled). Forces unnecessary world reloads.
- **Don't rename `MODULE_ID` again.** Settings won't carry over, the RegionBehavior type string would change, and existing scene data would break. Module-id changes are expensive.
