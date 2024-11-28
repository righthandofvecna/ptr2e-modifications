import { MODULENAME } from "./utils.mjs";

/** @override 
 * Draw the effect icons for ActiveEffect documents which apply to the Token's Actor.
 * Called by {@link Token#drawEffects}.
 * @protected
 */
async function Token_drawEffects() {
  this.effects.renderable = false;

  // Clear Effects Container
  this.effects.removeChildren().forEach(c => c.destroy());
  this.effects.bg = this.effects.addChild(new PIXI.Graphics());
  this.effects.bg.zIndex = -1;
  this.effects.overlay = null;

  // Categorize effects
  const activeEffects = this.actor?.temporaryEffects || [];
  const overlayEffect = activeEffects.findLast(e => e.img && e.getFlag("core", "overlay"));

  // Draw effects
  const promises = [];
  const iconsDrawn = new Set();
  for ( const [i, effect] of activeEffects.entries() ) {
    if ( !effect.img ) continue;
    if ( effect.img === "systems/ptr2e/img/icons/effect_icon.webp" ) continue; // exclude default icons
    if ( iconsDrawn.has(effect.img) ) continue; // don't draw multiple copies
    iconsDrawn.add(effect.img);

    const promise = effect === overlayEffect
      ? this._drawOverlay(effect.img, effect.tint)
      : this._drawEffect(effect.img, effect.tint);
    promises.push(promise.then(e => {
      if ( e ) e.zIndex = i;
    }));
  }
  await Promise.allSettled(promises);

  this.effects.sortChildren();
  this.effects.renderable = true;
  this.renderFlags.set({refreshEffects: true});
}


export function register() {
  libWrapper.register(MODULENAME, "CONFIG.Token.objectClass.prototype._drawEffects", Token_drawEffects, "OVERRIDE");
}