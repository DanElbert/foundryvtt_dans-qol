import { MODULE_ID, SETTINGS, registerSettings } from "./settings.mjs";
import { registerConeDefaults } from "./features/cone-defaults.mjs";
import { registerKeyboardRotation } from "./features/keyboard-rotation.mjs";
import { registerRegionClickType, registerRegionClickDispatch, migrateRegionClickType } from "./features/region-click.mjs";
import { registerGMOnlySecrets } from "./features/gm-only-secrets.mjs";

const enabled = key => game.settings.get(MODULE_ID, key);

Hooks.once("init", () => {
    registerSettings();

    // Always-on: registers the RegionBehavior data model under both the old and
    // new type strings so existing world data loads regardless of feature toggle
    // or migration state.
    registerRegionClickType();

    // Always-on: keybindings must register at init regardless of toggle state,
    // because game.keybindings.register throws after init. The handler reads
    // the setting at runtime so toggling takes effect without a reload.
    registerKeyboardRotation();

    if (enabled(SETTINGS.coneEnabled)) registerConeDefaults();
    if (enabled(SETTINGS.regionClickEnabled)) registerRegionClickDispatch();
    if (enabled(SETTINGS.secretsHideEnabled)) registerGMOnlySecrets();
});

Hooks.once("ready", () => {
    migrateRegionClickType();
});
