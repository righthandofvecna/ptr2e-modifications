
import { MODULENAME, early_isGM } from "./utils.mjs";

function OnCreateToken(token) {
  const scene = token?.scene;
  if (!scene) return;
  const combat = game.combats.find(c=>c.scene === scene);
  if (!combat || !combat.active) return;
  Dialog.confirm({
    title: `Token Drop - ${token.name}`,
    content: `Add ${token.name} to the active combat?`,
    yes: ()=>{
      token.toggleCombatant({
        active: true,
      });
    },
    no: ()=>undefined,
  });
}




export function register() {
  game.settings.register(MODULENAME, "tokenDropAddToCombat", {
		name: "Add Token To Combat",
		default: true,
		type: Boolean,
		scope: "world",
		requiresReload: true,
		config: true,
		hint: "When dropping a token onto a scene that has an actively running combat, prompt the GM to add it to the combat tracker."
	});

  if (early_isGM() && game.settings.get(MODULENAME, "tokenDropAddToCombat")) {
    Hooks.on("createToken", OnCreateToken);
  }
}
