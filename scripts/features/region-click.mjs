import { MODULE_ID, SETTINGS } from "../settings.mjs";
import { log } from "../log.mjs";

const NEW_TYPE = "dans-qol.clickMacro";
const OLD_TYPE = "region-click-macro.clickMacro";
const KNOWN_TYPES = new Set([NEW_TYPE, OLD_TYPE]);
const CLICK_EVENT_NAME = "regionClickLeft";
const TYPE_ICON = "fa-solid fa-arrow-pointer";

const fields = foundry.data.fields;

async function handleClickEvent(event) {
    if (!this.uuid) return;

    const user = event.data?.user ?? game.user;
    if (!this.userCanTrigger(user)) return;

    const macro = await fromUuid(this.uuid);
    if (!macro) {
        log.warn(`macro ${this.uuid} not found for behavior ${this.parent?.uuid}`);
        return;
    }

    await macro.execute({
        event,
        region: this.parent?.region,
        behavior: this.parent
    });
}

class ClickMacroBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {
    static LOCALIZATION_PREFIXES = ["DANS_QOL.REGION_CLICK.BEHAVIOR.ClickMacro"];

    static events = {
        [CLICK_EVENT_NAME]: handleClickEvent
    };

    static defineSchema() {
        return {
            uuid: new fields.DocumentUUIDField({ type: "Macro" }),
            triggerPermission: new fields.StringField({
                required: true,
                blank: false,
                initial: "ALL",
                choices: {
                    ALL: "DANS_QOL.REGION_CLICK.PERMISSION.ALL",
                    PLAYER: "DANS_QOL.REGION_CLICK.PERMISSION.PLAYER",
                    TRUSTED: "DANS_QOL.REGION_CLICK.PERMISSION.TRUSTED",
                    ASSISTANT: "DANS_QOL.REGION_CLICK.PERMISSION.ASSISTANT",
                    GAMEMASTER: "DANS_QOL.REGION_CLICK.PERMISSION.GAMEMASTER"
                }
            })
        };
    }

    userCanTrigger(user) {
        if (!user) return false;
        if (this.triggerPermission === "ALL") return true;
        const minRole = CONST.USER_ROLES[this.triggerPermission];
        return minRole !== undefined && user.role >= minRole;
    }
}

export function registerRegionClickType() {
    CONFIG.RegionBehavior.dataModels[NEW_TYPE] = ClickMacroBehaviorType;
    CONFIG.RegionBehavior.dataModels[OLD_TYPE] = ClickMacroBehaviorType;
    CONFIG.RegionBehavior.typeIcons ??= {};
    CONFIG.RegionBehavior.typeIcons[NEW_TYPE] = TYPE_ICON;
    CONFIG.RegionBehavior.typeIcons[OLD_TYPE] = TYPE_ICON;
}

export function registerRegionClickDispatch() {
    Hooks.on("canvasReady", () => {
        const callbacks = canvas.mouseInteractionManager?.callbacks;
        if (!callbacks?.clickLeft) {
            log.warn("canvas MouseInteractionManager has no clickLeft callback; clicks will not fire");
            return;
        }
        if (callbacks._dansQolRegionClickWrapped) return;

        const original = callbacks.clickLeft;
        callbacks.clickLeft = function(event) {
            const result = original.apply(this, arguments);
            if (canvas.activeLayer !== canvas.regions) {
                dispatchRegionClicks(event).catch(err => log.error("dispatch failed", err));
            }
            return result;
        };
        callbacks._dansQolRegionClickWrapped = true;
    });
}

async function dispatchRegionClicks(event) {
    const scene = canvas?.scene;
    if (!scene) return;

    const origin = event?.interactionData?.origin ?? event?.getLocalPosition?.(canvas.stage);
    if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return;
    const point = { x: origin.x, y: origin.y };

    const regionEvent = {
        name: CLICK_EVENT_NAME,
        data: { point, user: game.user, originalEvent: event },
        user: game.user
    };

    for (const regionDoc of scene.regions) {
        if (!regionDoc.polygonTree?.testPoint(point)) continue;
        for (const behavior of regionDoc.behaviors) {
            if (!KNOWN_TYPES.has(behavior.type)) continue;
            if (behavior.disabled) continue;
            try {
                await behavior._handleRegionEvent({ ...regionEvent, region: regionDoc });
            } catch (err) {
                log.error(`error handling click on region "${regionDoc.name}"`, err);
            }
        }
    }
}

export async function migrateRegionClickType() {
    if (!game.user.isGM) return;
    if (game.settings.get(MODULE_ID, SETTINGS.regionClickMigrated)) return;

    let migrated = 0;
    let errors = 0;
    for (const scene of game.scenes) {
        for (const region of scene.regions) {
            for (const behavior of region.behaviors) {
                if (behavior.type !== OLD_TYPE) continue;
                try {
                    await behavior.update({ type: NEW_TYPE });
                    migrated += 1;
                } catch (err) {
                    log.error(`failed to migrate behavior ${behavior.uuid}`, err);
                    errors += 1;
                }
            }
        }
    }

    if (errors > 0) {
        log.warn(`migrated ${migrated} region behavior(s); ${errors} failed, will retry next session`);
        return;
    }

    await game.settings.set(MODULE_ID, SETTINGS.regionClickMigrated, true);
    if (migrated > 0) log.info(`migrated ${migrated} region behavior(s) from region-click-macro to dans-qol`);
}
