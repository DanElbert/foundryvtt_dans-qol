import { MODULE_ID, SETTINGS } from "../settings.mjs";

export function registerKeyboardRotation() {
    game.keybindings.register(MODULE_ID, "rotateLeft", {
        name: "Rotate Template Left",
        hint: "Rotates an active spell template placement preview counter-clockwise. Hold Shift for 1° increments.",
        editable: [{ key: "KeyQ" }],
        onDown: (context) => handleRotation(-1, context.isShift),
        precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
        reservedModifiers: ["Shift"]
    });

    game.keybindings.register(MODULE_ID, "rotateRight", {
        name: "Rotate Template Right",
        hint: "Rotates an active spell template placement preview clockwise. Hold Shift for 1° increments.",
        editable: [{ key: "KeyE" }],
        onDown: (context) => handleRotation(1, context.isShift),
        precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
        reservedModifiers: ["Shift"]
    });
}

function handleRotation(sign, fineMode) {
    const preview = canvas?.templates?.preview?.children?.find(c => c?.document);
    if (!preview) return false;

    const step = fineMode ? 1 : game.settings.get(MODULE_ID, SETTINGS.rotationStep);
    const current = preview.document.direction ?? 0;
    const next = ((current + sign * step) % 360 + 360) % 360;

    preview.document.updateSource({ direction: next });
    preview.refresh();
    return true;
}
