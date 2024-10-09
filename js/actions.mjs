


export function register() {
  const AttackPTR2e = (()=>{
    for (const actor of game.actors.contents) {
      for (const attack of actor.attacks.actions) {
        return attack.constructor;
      }
    }
  })();

  if (AttackPTR2e) {
    Object.defineProperty(AttackPTR2e.prototype, "rollable", {
      get() {
        return true;
      }
    });
  }
}