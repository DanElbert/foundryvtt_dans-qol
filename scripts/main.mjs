import { MODULE_ID, SETTINGS, registerSettings } from "./settings.mjs";
import { log } from "./log.mjs";
import { registerConeDefaults } from "./features/cone-defaults.mjs";
import { registerKeyboardRotation } from "./features/keyboard-rotation.mjs";
import { registerRegionClickType, registerRegionClickDispatch } from "./features/region-click.mjs";
import { registerGMOnlySecrets } from "./features/gm-only-secrets.mjs";
import { registerCompassRose } from "./features/compass-rose.mjs";

const enabled = key => game.settings.get(MODULE_ID, key);

Hooks.once("init", () => {
    registerSettings();

    const active = [];

    // Always-on: registers the RegionBehavior data model so any existing
    // behaviors in scene data resolve, regardless of dispatch toggle state.
    registerRegionClickType();
    active.push("region-click-type (always)");

    // Always-on: keybindings must register at init regardless of toggle state,
    // because game.keybindings.register throws after init. The handler reads
    // the setting at runtime so toggling takes effect without a reload.
    registerKeyboardRotation();
    active.push(`keyboard-rotation (always; toggle: ${enabled(SETTINGS.rotationEnabled) ? "on" : "off"})`);

    // Always-on: hooks are cheap and runtime-gated on the client setting, so
    // toggling the compass takes effect without a reload.
    registerCompassRose();
    active.push(`compass-rose (always; toggle: ${enabled(SETTINGS.compassEnabled) ? "on" : "off"})`);

    if (enabled(SETTINGS.coneEnabled)) { registerConeDefaults(); active.push("cone-defaults"); }
    if (enabled(SETTINGS.regionClickEnabled)) { registerRegionClickDispatch(); active.push("region-click-dispatch"); }
    if (enabled(SETTINGS.secretsHideEnabled)) { registerGMOnlySecrets(); active.push("gm-only-secrets"); }

    log.info(`init complete; active: ${active.join(", ")}`);
});
