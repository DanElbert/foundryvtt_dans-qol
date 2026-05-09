import { MODULE_ID, SETTINGS } from "../settings.mjs";

const CURVATURE_MAX_ANGLE = { round: 360, flat: 90, semicircle: 180 };

export function registerConeDefaults() {
    Hooks.on("getSceneControlButtons", applyConeDefaults);
}

function applyConeDefaults(controls) {
    const cone = controls.regions?.tools?.cone;
    if (!cone) return;

    const curvature = game.settings.get(MODULE_ID, SETTINGS.coneCurvature);
    const requestedAngle = game.settings.get(MODULE_ID, SETTINGS.coneAngle);
    const angle = Math.min(requestedAngle, CURVATURE_MAX_ANGLE[curvature] ?? 360);

    cone.shapeData = foundry.utils.mergeObject(cone.shapeData ?? {}, { angle, curvature }, { inplace: false });
}
