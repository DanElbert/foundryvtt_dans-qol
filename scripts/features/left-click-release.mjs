import { MODULE_ID, SETTINGS } from "../settings.mjs";

const CORE_ID = "core.leftClickRelease";

export function registerLeftClickRelease() {
    Hooks.once("setup", apply);
    Hooks.on(`${MODULE_ID}.refreshLeftClickRelease`, apply);
}

async function apply() {
    const enabled = game.settings.get(MODULE_ID, SETTINGS.leftClickReleaseEnabled);
    const core = game.settings.settings.get(CORE_ID);
    if (!core) return;
    core.default = enabled;
    if (!enabled || game.settings.get(MODULE_ID, SETTINGS.leftClickReleaseApplied)) return;
    await game.settings.set("core", "leftClickRelease", true);
    await game.settings.set(MODULE_ID, SETTINGS.leftClickReleaseApplied, true);
}
