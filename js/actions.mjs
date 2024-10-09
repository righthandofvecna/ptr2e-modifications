
import { MODULENAME } from "./utils.mjs";


export function register() {
  const AttackPTR2e = (()=>{
    for (const actor of game?.actors?.contents ?? []) {
      for (const attack of Object.values(actor?.attacks?.actions ?? [])) {
        return attack.constructor;
      }
    }
  })();

  if (AttackPTR2e && (game.settings.get(MODULENAME, "enableAutoStatusMoves") ?? true)) {
    Object.defineProperty(AttackPTR2e.prototype, "rollable", {
      get() {
        return true;
      }
    });
  } else {
    console.error("NO ACTORS WITH ACTIONS", game, game?.actors, game?.actors?.contents);
  }
}