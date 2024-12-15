
import { MODULENAME } from "./utils.mjs";


export function register() {
  const AttackPTR2e = CONFIG.Item.dataModels.move.schema.fields.actions.element.types.attack.model;

  if (!(game.settings.get(MODULENAME, "enableAutoStatusMoves") ?? true)) return;

  // make status actions rollable
  Object.defineProperty(AttackPTR2e.prototype, "rollable", {
    get() {
      return true;
    }
  });
}