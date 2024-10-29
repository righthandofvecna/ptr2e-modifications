import { early_isGM } from "./utils.mjs";


/**
 * The actor's total cost as an enemy
 */
function getActorCost(actor, APL) {
  // TODO size modifier in here?
  const StatsBase = Object.values(actor.system.attributes).reduce((a,s)=>a + s.base, 0);
  const StatsEvs = Object.values(actor.system.attributes).reduce((a,s)=>a + s.evs, 0);
  const StatsIvs = Object.values(actor.system.attributes).reduce((a,s)=>a + s.ivs, 0);
  const Level = actor.system.advancement.level;

  const StatTotal = ( ( (2 * StatsBase + StatsIvs + 127) * Level ) / 100 ) + ( Level * ( Math.PI / 10 ) + ( Math.log( Level + 9) / Math.PI ) ) + 70;

  const CostEnemy = Math.round( StatTotal * ( 627 + 82.8 * Level ) / ( 627 + 82.8 * APL ) * Math.pow( StatsBase, 0.25 ) / 3.6 );
  return CostEnemy;
}

function getRelatedActors(actors) {
  return new Set(actors.flatMap(actor=>{
    const allies = [actor];
    actor._party = undefined; // this is to fix a bug in core (#718)

    // if we're the owner of a party, add all the party members
    // if we're a member of the party, add all the party members (and not the owner)
    if (!!actor.party) {
      allies.push(...actor.party.party);
    }
    return allies;
  }));
}

function OnRenderCombatTrackerPTR2e(combatTracker, html, context) {
  const combat = context.combat;

  const alliedBudget = combat.alliedBudget;
  const enemyBudget = combat.enemyBudget;

  const estimate = (()=>{
    const ratio = enemyBudget / alliedBudget;
    if (ratio < 0.5) return "Easy";
    if (ratio < 0.65) return "Medium";
    if (ratio < 0.85) return "Hard";
    if (ratio < 1.15) return "Extreme";
    return "Impossible";
  })();

  $(html).find(".combat-tracker-header").append(`<div class="encounter-estimation"><span class="enemy">${enemyBudget}</span><span>/</span><span class="ally">${alliedBudget}</span> <span>(${estimate})</span></div>`);
}


export function register() {
  // CONFIG.Combat.documentClass

  if (early_isGM()) {
    Hooks.on("renderCombatTrackerPTR2e", OnRenderCombatTrackerPTR2e);
  }

  Object.defineProperty(CONFIG.Combat.documentClass.prototype, "allies", {
    get() {
      const presentAlliedCombatants = this.combatants.filter(c=>c?.token?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY || game.users.some(u=>!!u.character && (u.character.id === c?.actor?.id || u.character.id === c?.actor?.party?.owner?.id))).map(c=>c.actor);
      return getRelatedActors(presentAlliedCombatants);
    }
  });

  Object.defineProperty(CONFIG.Combat.documentClass.prototype, "alliedAPL", {
    get() {
      const allFriendlyParticipants = this.allies;
      if (allFriendlyParticipants.size === 0) return 0;

      return allFriendlyParticipants.reduce((l, actor)=>l + actor.system.advancement.level, 0) / allFriendlyParticipants.size;
    }
  });

  Object.defineProperty(CONFIG.Combat.documentClass.prototype, "alliedStatTotal", {
    get() {
      const APL = this.alliedAPL;
      // based on neo's sheet
      const H11 = 250;
      const H14 = H11 * 2;
      const I11 = 0;
      const I14 = I11 * 1;
      const J11 = 508;
      const J14 = J11 / 4;

      const L14 = H14 + I14 + J14;

      const H12 = 950;
      const H15 = H12 * 2;
      const H19 = H15 - H14;

      const I12 = 180;
      const I15 = I12 * 1;
      const I19 = I15 - I14;

      const J12 = 508;
      const J15 = J12 / 4;
      const J19 = J15 - J14;

      const H20 = H19 / 100;
      const I20 = I19 / 100;
      const J20 = J19 / 100;

      const L20 = ( H20 + I20 + J20 ) * 6;

      // everything before this is a constant, kept only to make it easier to update based on Neo's spreadsheet

      const B_ = L14 + ( APL * L20 );

      const statTotal = ( ( B_ * APL / 100 ) + 70 + APL * ( (Math.PI / 10) + Math.log( APL + 9 ) / Math.PI ) );

      return statTotal;
    }
  });

  Object.defineProperty(CONFIG.Combat.documentClass.prototype, "alliedProgMod", {
    get() {
      const APL = this.alliedAPL;

      // based on neo's math
      const gradeMod = (()=>{
        if (APL < 15) return 0.16;
        if (APL < 25) return 0.25;
        if (APL < 35) return 0.28;
        if (APL < 45) return 0.385;
        return 0.52;
      })();

      const abilityMod = (()=>{
        if (APL < 20) return 0.06;
        if (APL < 50) return 0.14;
        if (APL < 80) return 0.34;
        return 0.48;
      })();

      const aplMod = APL / 100;

      return 1 + gradeMod + abilityMod + aplMod;
    }
  });

  Object.defineProperty(CONFIG.Combat.documentClass.prototype, "alliedBudget", {
    get() {
      const StatTotal = this.alliedStatTotal;
      const ProgMod = this.alliedProgMod;

      const allFriendlyParticipants = this.allies;

      const NumPlayers = allFriendlyParticipants.filter(a=>a.system.traits.has("ace")).size;
      const NumAllies = allFriendlyParticipants.size;

      const CUBE_ROOT_OF_SEVEN_THIRDS = 1.3263524;

      const BudgetEnc = 10 * Math.round( ( StatTotal * ProgMod * ( 0.25 + NumPlayers + Math.sqrt( NumAllies - NumPlayers ) * CUBE_ROOT_OF_SEVEN_THIRDS ) ) / 10 );

      return BudgetEnc;
    }
  });

  Object.defineProperty(CONFIG.Combat.documentClass.prototype, "enemyBudget", {
    get() {
      const allFriendlyParticipants = this.allies;
      const presentEnemyCombatants = this.combatants.filter(c=>c?.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE && !allFriendlyParticipants.has(c?.actor)).map(c=>c.actor);
      const allEnemies = getRelatedActors(presentEnemyCombatants);
      const APL = this.alliedAPL;

      const EnemyBudget = allEnemies.reduce((b, e)=>b + getActorCost(e, APL), 0);
      return EnemyBudget;
    }
  });
  
}