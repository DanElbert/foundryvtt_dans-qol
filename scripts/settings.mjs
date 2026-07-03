export const MODULE_ID = "dans-qol";

export const SETTINGS = {
    coneEnabled: "coneDefaultsEnabled",
    coneAngle: "coneDefaultAngle",
    coneCurvature: "coneDefaultCurvature",
    rotationEnabled: "keyboardRotationEnabled",
    rotationStep: "keyboardRotationStep",
    regionClickEnabled: "regionClickEnabled",
    secretsHideEnabled: "gmOnlySecretsEnabled",
    compassEnabled: "compassRoseEnabled",
    compassSceneVisibility: "compassRoseSceneVisibility",
    compassSceneSize: "compassRoseSceneSize",
    compassPosition: "compassRosePosition"
};

const RELOAD = { requiresReload: true };

export function registerSettings() {
    game.settings.register(MODULE_ID, SETTINGS.coneEnabled, {
        name: "Cone Defaults: Enable",
        hint: "Override the default angle and curvature applied to new Region cone shapes drawn from the toolbar.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...RELOAD
    });

    game.settings.register(MODULE_ID, SETTINGS.coneAngle, {
        name: "Cone Defaults: Angle (degrees)",
        hint: "Default angular spread for new cone Regions. Foundry's built-in default is 60. Flat curvature is capped at 90, semicircle at 180.",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0.01, max: 360, step: 0.01 },
        default: 60,
        onChange: () => ui.controls?.render({ reset: true })
    });

    game.settings.register(MODULE_ID, SETTINGS.coneCurvature, {
        name: "Cone Defaults: Curvature",
        hint: "Default curvature shape for new cone Regions.",
        scope: "world",
        config: true,
        type: String,
        choices: { round: "Round", flat: "Flat", semicircle: "Semicircle" },
        default: "round",
        onChange: () => ui.controls?.render({ reset: true })
    });

    game.settings.register(MODULE_ID, SETTINGS.rotationEnabled, {
        name: "Keyboard Rotation: Enable",
        hint: "Allow rotating a MeasuredTemplate placement preview with the keys bound under Configure Controls. Built for dnd5e's spell template flow but works for any active template preview. Per-user keybindings remain editable in Configure Controls.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_ID, SETTINGS.rotationStep, {
        name: "Keyboard Rotation: Step (degrees)",
        hint: "Rotation increment per keypress. Hold Shift for finer (1°) rotation.",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 1, max: 90, step: 1 },
        default: 15
    });

    game.settings.register(MODULE_ID, SETTINGS.regionClickEnabled, {
        name: "Region Click Macro: Enable",
        hint: "Adds an 'Execute Macro on Click' Region behavior. Disabling this leaves existing behaviors intact but stops dispatching clicks.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...RELOAD
    });

    game.settings.register(MODULE_ID, SETTINGS.secretsHideEnabled, {
        name: "GM-only Secrets: Enable",
        hint: "Hide unrevealed secret blocks from non-GM users. CSS-based; the text is still in the DOM and could be read via DevTools.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...RELOAD
    });

    game.settings.register(MODULE_ID, SETTINGS.compassEnabled, {
        name: "Compass Rose: Enable",
        hint: "Show a floating compass rose over the canvas, just for you. Drag to move; scroll over it to resize (per scene). Per-scene visibility toggles from the token controls toolbar; the GM sets each scene's rotation in the scene configuration (Basics tab).",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => Hooks.callAll(`${MODULE_ID}.refreshCompass`)
    });

    game.settings.register(MODULE_ID, SETTINGS.compassSceneVisibility, {
        name: "Compass Rose: Scene Visibility",
        scope: "client",
        config: false,
        type: Object,
        default: {}
    });

    game.settings.register(MODULE_ID, SETTINGS.compassSceneSize, {
        name: "Compass Rose: Scene Size",
        scope: "client",
        config: false,
        type: Object,
        default: {}
    });

    game.settings.register(MODULE_ID, SETTINGS.compassPosition, {
        name: "Compass Rose: Position",
        scope: "client",
        config: false,
        type: Object,
        default: null
    });
}
