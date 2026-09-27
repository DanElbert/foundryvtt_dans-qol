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
    if (!game.settings.get(MODULE_ID, SETTINGS.rotationEnabled)) return false;

    const step = fineMode ? 1 : game.settings.get(MODULE_ID, SETTINGS.rotationStep);
    const context = canvas?.regions?._placementContext;
    if (context) return rotateRegionPlacement(context, sign, step, fineMode);
    return rotateTemplatePreview(sign, step);
}

function rotateRegionPlacement(context, sign, step, fineMode) {
    const { preview, regionIndex, regionCount, shapes, shape, allowRotation, onRotate, onChange } = context;
    if (!allowRotation || !shape.schema.has("rotation")) return false;
    const shapeIndex = shape._index;
    const shapeCount = shapes.length;
    const document = preview.document;
    const event = { shiftKey: fineMode, delta: sign };
    const args = { event, preview, document, regionIndex, regionCount, shape, shapeIndex, shapeCount };
    if (onRotate?.({ ...args, precise: fineMode }) === false) return true;
    const interval = shape.type === "grid" ? (canvas.grid.isSquare ? 90 : 60) : step;
    shape.rotate((shape.rotation + sign * interval).toNearest(interval) - shape.rotation);
    const diff = document.updateSource({ shapes: [...document.shapes.slice(0, -1), shape] });
    if (foundry.utils.isEmpty(diff)) return true;
    document.updateShapeConstraints();
    preview.renderFlags.set({ refreshShapes: true });
    onChange?.(args);
    return true;
}

function rotateTemplatePreview(sign, step) {
    const preview = canvas?.templates?.preview?.children?.find(c => c?.document);
    if (!preview) return false;

    const current = preview.document.direction ?? 0;
    const next = ((current + sign * step) % 360 + 360) % 360;

    preview.document.updateSource({ direction: next });
    preview.refresh();
    return true;
}
