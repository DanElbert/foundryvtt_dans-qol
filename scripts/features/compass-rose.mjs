import { MODULE_ID, SETTINGS } from "../settings.mjs";

const ELEMENT_ID = "dans-qol-compass";
const FLAG_ROTATION = "compassRotation";
const TOOL_NAME = "dansQolCompass";
const DEFAULT_SIZE = 96;
const MIN_SIZE = 48;
const MAX_SIZE = 240;
const WHEEL_STEP = 8;
const BASE_FONT = 11;
const MIN_LABEL_PX = 12;

const enabled = () => game.settings.get(MODULE_ID, SETTINGS.compassEnabled);

export function registerCompassRose() {
    Hooks.on("canvasReady", () => refreshCompass());
    Hooks.on("canvasTearDown", () => document.getElementById(ELEMENT_ID)?.remove());
    Hooks.on("updateScene", onUpdateScene);
    Hooks.on("getSceneControlButtons", addToggleTool);
    Hooks.on("renderSceneConfig", injectRotationField);
    Hooks.on(`${MODULE_ID}.refreshCompass`, refreshCompass);
}

function refreshCompass() {
    updateCompass();
    ui.controls?.render({ reset: true });
}

function onUpdateScene(scene, changes) {
    if (scene !== canvas?.scene) return;
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) updateCompass();
}

function sceneVisible(scene) {
    if (!scene) return false;
    return game.settings.get(MODULE_ID, SETTINGS.compassSceneVisibility)[scene.id] ?? true;
}

async function setSceneVisible(scene, visible) {
    if (!scene) return;
    const map = { ...game.settings.get(MODULE_ID, SETTINGS.compassSceneVisibility), [scene.id]: visible };
    await game.settings.set(MODULE_ID, SETTINGS.compassSceneVisibility, map);
    updateCompass();
}

function updateCompass() {
    const scene = canvas?.ready ? canvas.scene : null;
    const show = enabled() && sceneVisible(scene);
    let el = document.getElementById(ELEMENT_ID);
    if (!show) {
        el?.remove();
        return;
    }
    if (!el) el = createCompassElement();
    const size = sceneSize(scene);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    applyLayout(el, scene.getFlag(MODULE_ID, FLAG_ROTATION) ?? 0, size);
}

function applyLayout(el, rotation, size) {
    // Labels get a floor in screen pixels: below the size where BASE_FONT
    // would render smaller than MIN_LABEL_PX, grow the SVG font units to
    // compensate and pull the label ring inward so the glyphs stay inside
    // the rim. At default size and up this is a no-op (font === BASE_FONT).
    const font = Math.max(BASE_FONT, (MIN_LABEL_PX * 100) / size);
    const radius = 46 - font / 2;
    const baseline = 0.36 * font;
    el.querySelector(".rose").setAttribute("transform", `rotate(${rotation} 50 50)`);
    el.querySelector(".labels").setAttribute("font-size", font.toFixed(2));
    for (const text of el.querySelectorAll("text[data-angle]")) {
        const theta = ((Number(text.dataset.angle) + rotation) * Math.PI) / 180;
        text.setAttribute("x", (50 + radius * Math.sin(theta)).toFixed(2));
        text.setAttribute("y", (50 - radius * Math.cos(theta) + baseline).toFixed(2));
    }
}

function sceneSize(scene) {
    return game.settings.get(MODULE_ID, SETTINGS.compassSceneSize)[scene.id] ?? DEFAULT_SIZE;
}

const saveSceneSize = foundry.utils.debounce(async (sceneId, size) => {
    const map = { ...game.settings.get(MODULE_ID, SETTINGS.compassSceneSize), [sceneId]: size };
    await game.settings.set(MODULE_ID, SETTINGS.compassSceneSize, map);
}, 250);

function onWheel(event) {
    event.preventDefault();
    const scene = canvas?.ready ? canvas.scene : null;
    if (!scene) return;
    const el = event.currentTarget;
    // Read the live size, not the setting: saves are debounced, so the
    // setting lags behind during a continuous scroll.
    const current = el.offsetWidth || sceneSize(scene);
    const next = Math.clamp(current - Math.sign(event.deltaY) * WHEEL_STEP, MIN_SIZE, MAX_SIZE);
    if (next === current) return;
    el.style.width = `${next}px`;
    el.style.height = `${next}px`;
    applyLayout(el, scene.getFlag(MODULE_ID, FLAG_ROTATION) ?? 0, next);
    saveSceneSize(scene.id, next);
}

function addToggleTool(controls) {
    if (!enabled()) return;
    const tokens = controls.tokens;
    if (!tokens) return;
    const order = Math.max(0, ...Object.values(tokens.tools).map(t => t.order ?? 0)) + 1;
    tokens.tools[TOOL_NAME] = {
        name: TOOL_NAME,
        title: "Toggle Compass Rose (this scene, this user)",
        icon: "fa-solid fa-compass",
        toggle: true,
        order,
        active: sceneVisible(canvas?.scene),
        onChange: (event, active) => setSceneVisible(canvas?.scene, active)
    };
}

function injectRotationField(app, element) {
    const tab = element.querySelector('.tab[data-tab="basics"]');
    if (!tab || tab.querySelector(`[name="flags.${MODULE_ID}.${FLAG_ROTATION}"]`)) return;
    const value = app.document.getFlag(MODULE_ID, FLAG_ROTATION) ?? 0;
    const fieldset = document.createElement("fieldset");
    fieldset.innerHTML = `
        <legend>Dan's QoL</legend>
        <div class="form-group">
            <label>Compass Rose Rotation (degrees)</label>
            <div class="form-fields">
                <input type="number" name="flags.${MODULE_ID}.${FLAG_ROTATION}" value="${value}"
                       min="-360" max="360" step="1">
            </div>
            <p class="hint">Clockwise offset for the floating compass rose on this scene, for maps where north isn't up. Only affects users who enabled the compass in module settings.</p>
        </div>`;
    tab.appendChild(fieldset);
}

function createCompassElement() {
    const el = document.createElement("div");
    el.id = ELEMENT_ID;
    el.innerHTML = COMPASS_SVG;
    el.addEventListener("pointerdown", startDrag);
    el.addEventListener("wheel", onWheel, { passive: false });
    const pos = game.settings.get(MODULE_ID, SETTINGS.compassPosition);
    if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
        el.style.left = `${Math.clamp(pos.left, 0, window.innerWidth - 100)}px`;
        el.style.top = `${Math.clamp(pos.top, 0, window.innerHeight - 100)}px`;
    }
    document.body.appendChild(el);
    return el;
}

function startDrag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const onMove = ev => {
        el.style.left = `${Math.clamp(ev.clientX - offsetX, 0, window.innerWidth - rect.width)}px`;
        el.style.top = `${Math.clamp(ev.clientY - offsetY, 0, window.innerHeight - rect.height)}px`;
    };
    const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        game.settings.set(MODULE_ID, SETTINGS.compassPosition, { left: el.offsetLeft, top: el.offsetTop });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
}

const COMPASS_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="47" fill="rgba(15, 15, 20, 0.55)" stroke="#e8e0c9" stroke-width="1.5"/>
    <g class="rose" fill="#e8e0c9">
        <circle cx="50" cy="50" r="33" fill="none" stroke="#e8e0c9" stroke-width="0.5" opacity="0.6"/>
        <g opacity="0.75">
            <g transform="rotate(45 50 50)">
                <polygon points="50,28 46,50 50,50" opacity="0.55"/>
                <polygon points="50,28 54,50 50,50"/>
                <polygon points="50,72 46,50 50,50"/>
                <polygon points="50,72 54,50 50,50" opacity="0.55"/>
                <polygon points="28,50 50,46 50,50"/>
                <polygon points="28,50 50,54 50,50" opacity="0.55"/>
                <polygon points="72,50 50,46 50,50" opacity="0.55"/>
                <polygon points="72,50 50,54 50,50"/>
            </g>
        </g>
        <polygon points="50,17 44,50 50,50" opacity="0.55"/>
        <polygon points="50,17 56,50 50,50"/>
        <polygon points="50,83 44,50 50,50"/>
        <polygon points="50,83 56,50 50,50" opacity="0.55"/>
        <polygon points="17,50 50,44 50,50"/>
        <polygon points="17,50 50,56 50,50" opacity="0.55"/>
        <polygon points="83,50 50,44 50,50" opacity="0.55"/>
        <polygon points="83,50 50,56 50,50"/>
        <circle cx="50" cy="50" r="2.5"/>
    </g>
    <g class="labels" font-family="Signika, sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="#e8e0c9">
        <text data-angle="0" x="50" y="13" fill="#d24d3e">N</text>
        <text data-angle="90" x="91" y="54">E</text>
        <text data-angle="180" x="50" y="95">S</text>
        <text data-angle="270" x="9" y="54">W</text>
    </g>
</svg>`;
