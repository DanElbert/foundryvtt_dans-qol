export function registerGMOnlySecrets() {
    Hooks.once("ready", () => {
        document.body.classList.add("dans-qol-secrets");
        if (game.user.isGM) document.body.classList.add("dans-qol-gm");
    });
}
