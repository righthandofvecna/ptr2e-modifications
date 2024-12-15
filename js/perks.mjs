
import { MODULENAME } from "./utils.mjs";
import { PTR2eSkillGroups } from "./categorized-skill-system/skill-groups-collection.mjs";

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

function unnest(str) {
  if (str.charAt(0) === "(" && str.charAt(str.length-1) === ")") {
    let pn = 1;
    let shouldRemove = true;
    for (let idx = 1; idx < str.length - 1; idx++) {
      if (str.charAt(idx) === "(") pn++;
      if (str.charAt(idx) === ")") pn--;
      if (pn === 0) {
        return str
      }
    }
    if (shouldRemove) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
}

const PrereqRegex = {
  trait: /^\[[^\[\]]*\]$/,
  level: /^Level (?<level>[0-9]+)+$/i,
  xOf: /^(?<num>(ONE)|(TWO)|(THREE)|(FOUR)|(FIVE)|(SIX)|([0-9]+)) OF: (?<list>.*)$/i,
  moveKnown: /^Move Known: (?<move>.*)$/i,
  moveTrait: /^A \[(?<trait>[^\[\]]*)\] Move$/,
  archetypePerks: /^(?<num>(ONE)|(TWO)|(THREE)|(FOUR)|(FIVE)|(SIX)|([0-9]+)) or more "(?<archetype>.*)" Archetype Perks$/i
};

const SkillsSlugs = {};


const PrereqTypos = {
  // workarounds
  "Moves Known (Light Screen & Reflect)": "(Move Known: Light Screen) AND (Move Known: Reflect)",
  "A Perk which grants Shields": "Guard Up! OR Resentment OR I Get Knocked Down OR High Noon",
  "Have a Wielded Item Slot": "[Wielder]",

  // no trait brackets
  "Underdog": "[Underdog]",
  "Serpentine Trait": "[Serpentine]",
  "Poison": "[Poison]",

  // implicit numbers
  "Running or Swim 35": "Running 35 or Swim 35",
  "Science (Chemistry) or Occult (Psychic) 60": "Science (Chemistry) 60 or Occult (Psychic) 60",

  // missing brackets
  "Science (Meteorology) 25 OR (Survival 40 AND Occult Spiritual 40)": "Science (Meteorology) 25 OR (Survival 40 AND Occult (Spiritual) 40)",
  "Science (Meteorology) 40 OR (Survival 55 AND Occult Spiritual 55)": "Science (Meteorology) 40 OR (Survival 55 AND Occult (Spiritual) 55)",
  "Science (Meteorology) 30 OR (Survival 40 AND Occult Spiritual 40 AND Level 30)": "Science (Meteorology) 30 OR (Survival 40 AND Occult (Spiritual) 40 AND Level 30)",
  "Science (Meteorology) 50 OR (Survival 70 AND Occult Spiritual 70 AND Level 60)": "Science (Meteorology) 50 OR (Survival 70 AND Occult (Spiritual) 70 AND Level 60)",

  // <Keywords>
  "<Stat Specialist>": "[HP Specialist] OR [Attack Specialist] OR [Defense Specialist] OR [Special Attack Specialist] OR [Special Defense Specialist] OR [Speed Specialist]",
  "A <Type>": "[Normal] OR [Fighting] OR [Flying] OR [Poison] OR [Ground] OR [Rock] OR [Bug] OR [Ghost] OR [Steel] OR [Fire] OR [Water] OR [Grass] OR [Electric] OR [Psychic] OR [Ice] OR [Dragon] OR [Dark] OR [Fairy] OR [Nuclear] OR [Shadow]",
  "<Touched>": "GM Permission", // TODO: legendary-touched?
}

const Movements = [
  { label: "Overland", slug: "overland" },
  { label: "Swim", slug: "swim" },
  { label: "Teleportation", slug: "teleport" },
  { label: "Flight", slug: "flight" },
  { label: "Burrow", slug: "burrow" },
  { label: "Threaded", slug: "threaded" },
]

function validatePrerequisite(prereq, fixTypos=true) {
  // Remove completely enclosing parentheses
  prereq = unnest(prereq.trim());

  if (fixTypos && prereq in PrereqTypos) {
    prereq = PrereqTypos[prereq];
  }

  if (prereq === "None") return true;
  if (prereq === "GM Permission") return true;
  if (prereq === "Human") return true;
  if (prereq.match(PrereqRegex.skill)) return true;
  if (prereq.match(PrereqRegex.rampingSkill)) return true;
  for (const {label} of Movements)
    if (prereq === `An ${label} Movement Allowance` || prereq === `A ${label} Movement Allowance`)
      return true;
  if (prereq.match(PrereqRegex.trait)) return true;
  if (prereq.match(PrereqRegex.level)) return true;
  if (prereq.match(PrereqRegex.perk)) return true;
  if (prereq.match(PrereqRegex.moveKnown)) return true;
  if (prereq.match(PrereqRegex.moveTrait)) return true;
  if (prereq.match(PrereqRegex.noPerk)) return true;
  if (prereq.match(PrereqRegex.archetypePerks)) return true;
  if (prereq.match(PrereqRegex.xOf)) return true;

  const orPrereqs = prereq.split(/ or /i);
  if (orPrereqs.length > 1) {
    return orPrereqs.reduce((a, pr)=>a && validatePrerequisite(pr, fixTypos), true);
  }
  const andPrereqs = prereq.split(/ and /i);
  if (andPrereqs.length > 1) {
    return andPrereqs.reduce((a, pr)=>a && validatePrerequisite(pr, fixTypos), true);
  }

  return false;
}

function _traitsEqual(a, b) {
  if (a === b) return true;
  if (a.replace(/[0-9\/]+/, "X") === b.replace(/[0-9\/]+/, "X")) return true;
  return false;
}

/**
 * 
 * @param {*} actor 
 * @param {string} prereq 
 * @param {boolean} orDefault 
 * @returns 
 */
function actorMeetsPrerequisite(actor, prereq, orDefault) {
  const returnVal = {
    value: true,
    canMeet: null,
    known: true,
  };

  // Remove completely enclosing parentheses
  prereq = unnest(prereq.trim());

  if (prereq in PrereqTypos) {
    prereq = PrereqTypos[prereq];
  }
  
  if (prereq === "None") {
    return returnVal;
  }

  if (prereq === "GM Permission") {
    if (!game.user.isGM) returnVal.value = false;
    return returnVal;
  }

  if (prereq === "Human") {
    if (actor.type !== "humanoid") returnVal.value = false;
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

  const rampingSkillMatch = prereq.match(PrereqRegex.rampingSkill);
  if (rampingSkillMatch) {
    const skillLowerMinimum = parseInt(rampingSkillMatch.groups.value);
    const skillRamping = parseInt(rampingSkillMatch.groups.ramping);
    const skillRampPerk = rampingSkillMatch.groups?.perk ?? "";
    const skill = deparenthesize(rampingSkillMatch.groups.skill);
    const slug = SkillsSlugs[skill];

    // check how many perks the actor has
    const numPerks = skillRampPerk === "" ? 0 : actor.items.filter(i=>i.name?.includes(skillRampPerk)).length;

    const skillMinimum = skillLowerMinimum + (skillRamping * numPerks);

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

  for (const {label, slug} of Movements) {
    if (prereq === `An ${label} Movement Allowance` || prereq === `A ${label} Movement Allowance`) {
      const moveAllowance = actor.system?.movement[slug]?.value ?? 0;
      if (moveAllowance <= 0) returnVal.value = false;
      return returnVal;
    }
  }

  const traitMatch = prereq.match(PrereqRegex.trait);
  if (traitMatch) {
    if (!actor.traits.find(t=>_traitsEqual(`[${t.label}]`, prereq))) returnVal.value = false;
    return returnVal;
  }

  const levelMatch = prereq.match(PrereqRegex.level);
  if (levelMatch) {
    const minLevel = parseInt(levelMatch.groups.level);
    if (actor.level < minLevel) returnVal.value = false;
    return returnVal;
  }

  const perkMatch = prereq.match(PrereqRegex.perk);
  if (perkMatch) {
    const hasPerk = actor.items.find(p=>p.type === "perk" && p.name === prereq);
    returnVal.value = !!hasPerk;
    return returnVal;
  }

  const moveMatch = prereq.match(PrereqRegex.moveKnown);
  if (moveMatch) {
    const hasMove = actor.items.find(p=>p.type === "move" && p.name === moveMatch.groups.move);
    returnVal.value = !!hasMove;
    return returnVal;
  }

  const moveTraitMatch = prereq.match(PrereqRegex.moveTrait);
  if (moveTraitMatch) {
    const hasMove = actor.items.find(p=>p.type === "move" && p?.system?.actions?.contents?.some?.(attack => attack.traits.contents.find(t=>_traitsEqual(t.label, moveTraitMatch.groups.trait))));
    returnVal.value = !!hasMove;
    return returnVal;
  }

  const perkNonMatch = prereq.match(PrereqRegex.noPerk);
  if (perkNonMatch) {
    const hasPerk = actor.items.find(p=>p.type === "perk" && p.name === perkNonMatch.groups.perk);
    returnVal.value = !hasPerk;
    return returnVal;
  }

  const archetypePerksMatch = prereq.match(PrereqRegex.archetypePerks);
  if (archetypePerksMatch) {
    const perkNum = (()=>{
      const s = archetypePerksMatch.groups.num;
      if (["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"].includes(s.toUpperCase())) {
        return ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"].indexOf(s.toUpperCase()) + 1;
      }
      return parseInt(s);
    })();
    if (!isNaN(perkNum)) {
      const archetype = archetypePerksMatch.groups.archetype;
      const perksOfArchetype = actor.items.filter(p=>p.type === "perk" && p.system.design.archetype == archetype);
      returnVal.known = true;
      returnVal.value = perksOfArchetype.length >= perkNum;
      return returnVal;
    }
    console.log("invalid archetypePerks:", prereq);
  }

  const xOfMatch = prereq.match(PrereqRegex.xOf);
  if (xOfMatch) {
    const xOf = xOfMatch.groups.num;
    const xOfNum = (()=>{
      if (["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"].includes(xOf.toUpperCase())) {
        return ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"].indexOf(xOf.toUpperCase()) + 1;
      }
      return parseInt(xOf);
    })();
    if (!isNaN(xOfNum)) {
      const xOfPrereqs = xOfMatch.groups.list.split(",").map(p=>(p ?? "").trim()).filter(p=>!!p);
      if (xOfPrereqs.length > xOfNum) {
        const xOfMet = xOfPrereqs.map(subPrereq=>actorMeetsPrerequisite(actor, subPrereq, false))
        returnVal.known = !xOfMet.some(p=>!p.known);
        returnVal.value = xOfMet.filter(p=>p.value).length >= xOfNum;
        return returnVal;
      }
    }
    console.log("invalid xOf:", prereq);
  }

  // try to do ORs
  const orPrereqs = prereq.split(/ or /i);
  if (orPrereqs.length > 1) {
    returnVal.known = true;
    returnVal.value = false;
    for (const subPrereq of orPrereqs) {
      const { value: subValue, known: subKnown } = actorMeetsPrerequisite(actor, subPrereq, false);
      if (!subKnown) {
        returnVal.known = subKnown;
      }
      if (subValue) {
        returnVal.value = subValue;
        return returnVal
      }
    }
    return returnVal;
  }


  // try to do ANDs
  const andPrereqs = prereq.split(/ and /i);
  if (andPrereqs.length > 1) {
    returnVal.value = true;
    returnVal.known = true;
    for (const subPrereq of andPrereqs) {
      const { value: subValue, known: subKnown } = actorMeetsPrerequisite(actor, subPrereq, false);
      returnVal.known &&= subKnown;
      if (!subValue) {
        returnVal.value = subValue;
        return returnVal
      }
    }
    return returnVal;
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
      const useCategorizedSkills = game.settings.get(MODULENAME, "categorizedSkills") ?? false;
      const skills = actor.system.toObject().skills;
      const skillGroups = useCategorizedSkills ? actor.flags?.[MODULENAME]?.skillGroups ?? PTR2eSkillGroups.skillGroups() : {};
      for (const [slug, delta] of Object.entries(canMeet.skills)) {
        const skill = skills.find(s=>s.slug === slug);
        if (!skill) continue;

        if (!useCategorizedSkills) {
          skill.rvs += delta;
          continue;
        }
        // categorized skill updates
        let currentDelta = delta;
        for (const group of game.ptr.data.skillGroups.groupChainFromSkill(skill).map(g=>skillGroups[g.slug]).reverse()) {
          if (!group) {
            console.log("UH OH", skill, skillGroups);
            continue;
          }
          const left = (group.points ?? 0) - (group.rvs ?? 0);
          if (left <= 0) continue;
          if (currentDelta > left) {
            currentDelta -= left;
            group.rvs = group.points;
            continue;
          }
          group.rvs += currentDelta;
          currentDelta = 0;
          break;
        }
        if (currentDelta > 0) {
          skill.rvs += delta;
          continue;
        }
      }
      actorUpdates["system.skills"] = skills;
      if (useCategorizedSkills) {
        actorUpdates[`flags.${MODULENAME}.skillGroups`] = skillGroups;
      }
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

async function addPerkWebPrerequisiteParsing() {
  let allSkillsRe = Object.values(CONFIG.PTR.data.originalSkills ?? CONFIG.PTR.data.skills).map(s=>{
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

  allSkillsRe += "|(Science \\(Palaeontology\\))";
  SkillsSlugs["Palaeontology"] = "paleontology";

  allSkillsRe += "|(Science \\(Bontany\\))";
  SkillsSlugs["Bontany"] = "botany";

  allSkillsRe += "|(Swimming)";
  SkillsSlugs["Swimming"] = "swim";

  allSkillsRe += "|(Climbing)";
  SkillsSlugs["Climbing"] = "climb";

  // professions that don't exist
  allSkillsRe += "|(Profession \\(Ninja\\))";
  SkillsSlugs["Ninja"] = "ninja";

  allSkillsRe += "|(Profession \\(Gemcutter\\))";
  SkillsSlugs["Gemcutter"] = "gemcutter";

  allSkillsRe += "|(Arts \\(Music\\))";
  SkillsSlugs["Music"] = "music";


  PrereqRegex.skill = new RegExp(`^(?<skill>${allSkillsRe}) (?<value>[0-9]+)$`);
  PrereqRegex.rampingSkill = new RegExp(`^(?<skill>${allSkillsRe}) (?<value>[0-9]+) \\+ (?<ramping>[0-9]+) ?x \\(# of (?<perk>.*) Perks already obtained\\)$`, "i");

  let allPerksRe = (await Promise.all(game.packs.get("ptr2e.core-perks").index.map((ind)=>fromUuid(ind.uuid)))).filter(p=>{
    return !!p;
  }).map(p=>`(${p.name})`).reduce((acc, v)=>{
    if (!acc) return v;
    return acc + "|" + v;
  }, "");

  PrereqRegex.perk = new RegExp(`^(${allPerksRe})$`);
  PrereqRegex.noPerk = new RegExp(`^DOES NOT HAVE: (?<perk>${allPerksRe})$`);

  const PerkStore = game.ptr.web.collection;
  // PerkStore.initialize = PerkStore_initialize.bind(PerkStore); // remove when #599 merges
  PerkStore.updatePerkState = PerkStore_updatePerkState.bind(PerkStore);
  // PerkStore.addMissingPerkConnections = PerkStore_addMissingPerkConnections.bind(PerkStore); // remove when #599 merges

  const PerkWebHUD = game.ptr.web.controls;
  PerkWebHUD.constructor.DEFAULT_OPTIONS.actions.purchase = PerkWebHUD_actions_purchase;
  PerkWebHUD.options.actions.purchase = PerkWebHUD_actions_purchase;
}


function OnRenderPerkWebHUD(sheet, html) {
  const perk = game.ptr.web.hudNode?.node?.perk;
  const actor = game.ptr.web.actor;
  if (!perk || !actor) return;

  // Add prerequisites met/meetable/unmet/unknown (green check/yellow check/red x/question mark)

  const prereqEl = html.querySelector("#perk-web-hud-perk .perk-embed .perk-info .prereqs ul");

  const PREREQ_STATES = {
    UNKNOWN: "unknown",
    UNMET: "unmet",
    CANMEET: "canmeet",
    MET: "met",
  }
  const prereqList = document.createElement("ul");
  perk.system.prerequisites.forEach((p)=>{
    if (!p || p === "None") return;
    const result = actorMeetsPrerequisite(actor, p, false);
    const [state, tooltip] = (()=>{
      if (!result.known) return [PREREQ_STATES.UNKNOWN, "This prerequisite cannot be automatically parsed"];
      if (result.value) return [PREREQ_STATES.MET, `${actor.name} meets this prerequisite.`];
      if (!result.canMeet) return [PREREQ_STATES.UNMET, `${actor.name} does not meet this prerequisite.`];
      return [PREREQ_STATES.CANMEET, `${actor.name} can meet this prerequisite automatically.`];
    })();
    const li = document.createElement("li");
    li.classList = `prereq-${state}`;
    li.appendChild(document.createTextNode(p));
    li.setAttribute("data-tooltip", tooltip);
    li.setAttribute("data-tooltip-direction", "RIGHT");

    prereqList.appendChild(li);
  });
  if (!prereqList.childElementCount) {
    const li = document.createElement("li");
    li.classList = `prereq-met`;
    li.appendChild(document.createTextNode("None"));
    prereqList.appendChild(li);
  }
  
  prereqEl.replaceWith(prereqList);
}



export function register() {
  if (!(game.settings.get(MODULENAME, "perkPrerequisites") ?? true)) return;
  
  const module = game.modules.get(MODULENAME);
  module.api ??= {};
  module.api.actorMeetsPrerequisites = actorMeetsPrerequisites;
  module.api.validatePrerequisite = validatePrerequisite;
  module.api.PrereqRegex = PrereqRegex;

  Hooks.on("ready",()=>{
    addPerkWebPrerequisiteParsing();
  });

  Hooks.on("renderPerkWebHUD", OnRenderPerkWebHUD);
}