
// copied from perk-node.ts
const PerkState = {
  unavailable: 0,
  connected: 1,
  available: 2,
  purchased: 3,
  toString: (x)=>{
    switch (x) {
      case PerkState.unavailable: return "unavailable";
      case PerkState.connected:   return "connected";
      case PerkState.available:   return "available";
      case PerkState.purchased:   return "purchased";
    }
    return "???"
  },
};

function deparenthesize(str) {
  const match = str.match(/(^[^\(\)]+$)|((?<=\()[^\(\)]+(?=\)))/);
  if (match.length > 0) return match[0]
  return "";
}

const PrereqRegex = {
  trait: /^\[[^\[\]]*\]$/,
  level: /^Level (?<level>[0-9]+)+$/i
};

const SkillsSlugs = {};

function actorMeetsPrerequisite(actor, prereq, orDefault) {
  const returnVal = {
    value: true,
    canMeet: null,
    known: true,
  };

  if (prereq === "None") {
    return returnVal;
  }

  const skillMatch = prereq.match(PrereqRegex.skill);
  if (skillMatch) {
    const skillMinimum = parseInt(skillMatch.groups.value);
    const skill = deparenthesize(skillMatch.groups.skill);
    const slug = SkillsSlugs[skill];
    // check skill value
    const actorSkillValue = actor.system.skills.get(slug)?.total ?? 0;
    if (actorSkillValue < skillMinimum) {
      returnVal.value = false;

      // check if the character has enough skill points available
      const actorSkill = actor.system.skills.get(slug);
      // maximum point investiture
      const actorSkillPoints = actor.system.advancement.rvs.available;
      const neededIncrease = skillMinimum - actorSkillValue;
      const maxIncrease = Math.min((actor.level === 1 ? 90 : 100) - (actorSkill?.rvs ?? 0), actorSkillPoints);

      if (neededIncrease <= maxIncrease) {
        returnVal.canMeet = {
          skills: { [slug]: neededIncrease },
        }
      }
    }
    return returnVal;
  }

  for (const {label, slug} of [
    { label: "Overland", slug: "overland" },
    { label: "Swim", slug: "swim" },
    { label: "Teleportation", slug: "teleport" },
    { label: "Flight", slug: "flight" },
    { label: "Burrow", slug: "burrow" },
    { label: "Threaded", slug: "threaded" },
  ]) {
    if (prereq === `An ${label} Movement Allowance` || prereq === `A ${label} Movement Allowance`) {
      const moveAllowance = actor.system?.movement[slug]?.value ?? 0;
      if (moveAllowance <= 0) returnVal.value = false;
      return returnVal;
    }
  }

  const traitMatch = prereq.match(PrereqRegex.trait);
  if (traitMatch) {
    if (!actor.traits.find(t=>`[${t.label}]` == prereq)) returnVal.value = false;
    return returnVal;
  }

  if (prereq === "GM Permission") {
    if (!game.user.isGM) returnVal.value = false;
    return returnVal;
  }

  const levelMatch = prereq.match(PrereqRegex.level);
  if (levelMatch) {
    const minLevel = parseInt(levelMatch.groups.level);
    if (actor.level < minLevel) returnVal.value = false;
    return returnVal;
  }

  if (prereq === "Human") {
    if (actor.type !== "humanoid") returnVal.value = false;
    return returnVal;
  }

  // TYPO-related
  if (prereq === "Underdog") {
    if (!actor.traits.find(t=>t.label == "Underdog")) returnVal.value = false;
    return returnVal;
  }


  // try to do ORs
  const subPrereqs = prereq.split(/ or /i);
  if (subPrereqs.length > 1) {
    for (const subPrereq of subPrereqs) {
      const { value: subValue, known: subKnown } = actorMeetsPrerequisite(actor, subPrereq, false);
      if (!subValue) {
        returnVal.value = subValue;
        returnVal.known = subKnown;
        return returnVal
      }
    }
  }
  
  returnVal.value = orDefault;
  returnVal.known = false;
  return returnVal;
}

function getActorPrerequisites(actor, perk) {
  const returnValue = {
    value: true,
    canMeet: null
  };
  
  if (!perk) return returnValue;
  const cost = perk.system.cost;
  const prerequisites = perk.system.prerequisites;
  if (!actor) return returnValue;
  const available = actor.system.advancement.advancementPoints.available;

  if (available < cost) return false;

  if (perk?.system?.node?.type === "root") return returnValue;

  if (prerequisites.size == 0) return returnValue;

  const allCanMeet = {
    skills: {}
  };
  for (const prereq of prerequisites) {
    const { value, canMeet, known } = actorMeetsPrerequisite(actor, prereq, true);
    if (!known) console.log("Unknown prerequisite:", prereq);

    if (canMeet && canMeet.skills) {
      for (const [slug, increase] of Object.entries(canMeet.skills)) {
        allCanMeet.skills[slug] = Math.max(allCanMeet.skills[slug] ?? 0, increase);
      }
      continue;
    }

    if (!value) {
      returnValue.value = false;
      return returnValue;
    }
  }

  // check the "allCanMeet" skill totals
  const actorSkillPoints = actor.system.advancement.rvs.available;
  const totalCost = Object.values(allCanMeet.skills).reduce((acc,x)=>acc+x, 0);
  if (totalCost > actorSkillPoints) {
    returnValue.value = false;
    return returnValue;
  }

  if (allCanMeet && allCanMeet.skills) {
    returnValue.canMeet = allCanMeet;
  }

  return returnValue;

}

function actorMeetsPrerequisites(actor, perk) {
  const { value } = getActorPrerequisites(actor, perk);
  return value;
}

async function buyPerk(actor, perkNode) {
  // get the prerequisites
  const { value, canMeet } = getActorPrerequisites(actor, perkNode.perk);
  if (!value && !canMeet) {
    ui.notifications.error("You do not meet the prerequisite for this perk");
    return;
  }

  if (canMeet) {
    const actorUpdates = {};

    // assign skills
    if (canMeet.skills) {
      const skills = actor.system.toObject().skills;
      for (const [slug, delta] of Object.entries(canMeet.skills)) {
        const skill = skills.find(s=>s.slug === slug);
        if (!skill) continue;
        skill.rvs += delta;
      }
      actorUpdates["system.skills"] = skills;
    }
    await actor.update(actorUpdates);
  }
  

  perkNode.state = PerkState.purchased;
  await actor.createEmbeddedDocuments("Item", [perkNode.perk.clone({ system: { cost: perkNode.perk.system.cost } })]);
}


// copied from perks-store.ts
async function PerkStore_initialize(actor) {
  this.clear();
  this.edges.clear();
  this.missingConnections = new Map();
  this._rootNodes = null;
  const perkManager = await game.ptr.perks.initialize();
  let hasRoot = false;
  const allPerks = [];
  const purchasedPerks = [];
  for (const perk of perkManager.perks.values()) {
      if (perk.system.node && perk.system.node.i !== null && perk.system.node.j !== null) {
          const connected = new Set(perk.system.node.connected);
          const isRoot = perk.system.node.type === "root";
          const actorPerk = actor?.perks.get(perk.slug);
          const state = actorPerk ? PerkState.purchased : PerkState.unavailable
          if(isRoot) {
              if(actorPerk) perk.system.cost = actorPerk.system.cost;
              else perk.system.cost = 5;
          }

          this.set(`${perk.system.node.i},${perk.system.node.j}`, {
              position: { i: perk.system.node.i, j: perk.system.node.j },
              perk: perk,
              connected,
              state
          });

          allPerks.push(perk);
          if (state === PerkState.purchased) purchasedPerks.push(perk);
          if(isRoot && state === PerkState.purchased) hasRoot = true;
      }
  }

  allPerks.forEach((perk)=>this.addMissingPerkConnections(perk, perkManager));
  purchasedPerks.forEach((perk)=>this.updatePerkState(perk, actor, perkManager));
  
  for(const rootNode of this.filter(node => node.perk.system.node.type === "root")) {
      if(!hasRoot) rootNode.perk.system.cost = 0;

      if(rootNode.state === PerkState.unavailable && ((actor?.system.advancement.advancementPoints.available ?? 0) >= rootNode.perk.system.cost)) {
          rootNode.state = PerkState.available;
      }
      else if(rootNode.state === PerkState.unavailable) rootNode.state = PerkState.connected;
  }
  if (this.size > 0) this._graph.initialize();

  console.debug("missing connections:", this.missingConnections);
}

// copied from perks-store.ts
/**
 * Update all connected perks to mark them connected, and in turn determine their availability.
 * @param currentPerk A perk that has been purchased
 * @param actor 
 * @param manager 
 */
function PerkStore_updatePerkState(currentPerk, actor, manager) {
  const missingConnections = this.missingConnections.get(currentPerk.slug) ?? [];
  const set = new Set([...currentPerk.system.node.connected, ...missingConnections]);

  for(const connected of set) {
    const connectedPerk = manager.perks.get(connected);
    if(!connectedPerk || connectedPerk.system.node.i === null || connectedPerk.system.node.j === null) continue;
    const isRootPerk = connectedPerk.system.node.type === 'root';
    
    const connectedNode = this.get(`${connectedPerk.system.node.i},${connectedPerk.system.node.j}`);
    if(!connectedNode || connectedNode.state !== PerkState.unavailable) continue;

    if(isRootPerk) connectedPerk.system.cost = 1;
    
    //TODO: Implement proper prerequisite checking
    if(actorMeetsPrerequisites(actor, connectedPerk)) {
      connectedNode.state = PerkState.available;
      continue;
    }
    connectedNode.state = PerkState.connected;
  }
}

/**
 * 
 * @param {PerkPTR2e} currentPerk 
 * @param {PerkManager} manager 
 * @returns 
 */
function PerkStore_addMissingPerkConnections(currentPerk, manager) {
  if (!currentPerk?.system?.node?.connected) return;

  const isRootNode = currentPerk.system.node.type === "root";

  for(const connected of new Set(currentPerk.system.node?.connected ?? [])) {
      const connectedPerk = manager.perks.get(connected);
      if(!connectedPerk || connectedPerk.system.node.i === null || connectedPerk.system.node.j === null) continue;
      
      const connectedNode = this.get(`${connectedPerk.system.node.i},${connectedPerk.system.node.j}`);
      if(!connectedNode) continue;
      if(connectedNode && !(connectedNode?.connected ?? new Set()).includes(currentPerk.system.slug)) {
          if(!this.missingConnections.has(connected)) this.missingConnections.set(connected, new Set([currentPerk.slug]));
          else this.missingConnections.get(connected).add(currentPerk.slug);
          continue;
      }
      if(connectedNode.state !== PerkState.purchased) continue;

      if(isRootNode) currentPerk.system.cost = connectedPerk.system.cost;
  }
}


// copied from perk-node.ts
/**
 * 
 * @param {PIXI.FederatedPointerEvent} _event 
 * @returns 
 */
async function PerkNode_onClickLeft(_event) {
  if (!game.ptr.web.editMode) {
      game.ptr.web.hudNode = this;

      if (!this.wasClicked) {
          // I don't love having to do this, but it looks like the detail field doesn't actually get populated on these events
          this.wasClicked = true;
          setInterval(()=>{this.wasClicked = false}, 500);
      } else {
          const node = this?.node;
          const actor = game.ptr.web.actor;
          if (!node || !actor) return;

          if (node.state !== PerkState.available) {
              if (node.state === PerkState.purchased) {
                  ui.notifications.error("You've already purchased this perk!");
                  return;
              }
              ui.notifications.error("You are unable to currently purchase this perk.");
              return;
          }
          await buyPerk(actor, node);
          this.wasClicked = false;
      }
  } else {
      if (this.active) {
          await this.savePosition();
      } else {
          if (game.ptr.web.activeNode?.editState === 2) {
              game.ptr.web.connectNodes(game.ptr.web.activeNode, this);
          } else {
              // Save original position
              this.originalPosition = this.position.clone();
              // Save original position of all other controlled nodes
              for (const node of game.ptr.web.controlled) {
                  node.originalPosition = node.position.clone();
              }

              game.ptr.web.activateNode(this, 1);
          }
      }
  }
}

async function PerkWebHUD_actions_purchase() {
  const node = game.ptr.web.hudNode?.node;
  const actor = game.ptr.web.actor;
  if (!node || !actor) return;

  if (node.state !== PerkState.available) {
    ui.notifications.error("You are unable to currently purchase this perk.");
    return;
  }

  await buyPerk(actor, node);
}


function autoTest() {

}




function addPerkWebPrerequisiteParsing() {
  let allSkillsRe = Object.values(CONFIG.PTR.data.skills).map(s=>{
    if (!s.group) {
      const basicSkillName = game.i18n.localize(`PTR2E.Skills.${s.slug}.label`);
      SkillsSlugs[basicSkillName] = s.slug;
      return `(${basicSkillName})`;
    }
    const skillName = game.i18n.localize(`PTR2E.Skills.${s.group}.${s.slug}.label`);
    const groupName = game.i18n.localize(`PTR2E.Skills.${s.group}.label`);
    SkillsSlugs[skillName] = s.slug;
    return `(${skillName})|(${groupName} \\(${skillName}\\))`;
  }).reduce((acc, v)=>{
    if (!acc) return v;
    return acc + "|" + v;
  }, "");

  // Typo correction
  allSkillsRe += "|(Occult \\(Ghosts\\))";
  SkillsSlugs["Ghosts"] = "ghost";

  allSkillsRe += "|(Occult \\(Legends\\))";
  SkillsSlugs["Legends"] = "legendary";

  allSkillsRe += "|(Riding)"
  SkillsSlugs["Riding"] = "ride";



  console.log(allSkillsRe);
  PrereqRegex.skill = new RegExp(`^(?<skill>${allSkillsRe}) (?<value>[0-9]+)$`)

  console.log("prereq tests:", "Medicine 5", !!("Medicine 5".match(PrereqRegex.skill)));
  console.log("prereq tests:", "Husbandry 25", !!("Husbandry 25".match(PrereqRegex.skill)));

  autoTest();


  const PerkStore = game.ptr.web.collection;
  // PerkStore.initialize = PerkStore_initialize.bind(PerkStore); // remove when #599 merges
  PerkStore.updatePerkState = PerkStore_updatePerkState.bind(PerkStore);
  // PerkStore.addMissingPerkConnections = PerkStore_addMissingPerkConnections.bind(PerkStore); // remove when #599 merges

  const PerkWebHUD = game.ptr.web.controls;
  PerkWebHUD.constructor.DEFAULT_OPTIONS.actions.purchase = PerkWebHUD_actions_purchase;
  PerkWebHUD.options.actions.purchase = PerkWebHUD_actions_purchase;
}



export function register() {
  const module = game.modules.get("ptr2e-modifications");
  module.api ??= {};
  module.api.actorMeetsPrerequisites = actorMeetsPrerequisites;

  Hooks.on("ready",()=>{
    addPerkWebPrerequisiteParsing();
  });
}