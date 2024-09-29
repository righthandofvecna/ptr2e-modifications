
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
    const actorSkillValue = actor.system.skills.get(slug)?.total;
    if (actorSkillValue < skillMinimum) returnVal.value = false;
    console.log(prereq, slug, actorSkillValue, skillMinimum, returnVal);
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
      const overlandAllowance = actor.system?.movement?.get(slug)?.value ?? 0;
      if (overlandAllowance <= 0) returnVal.value = false;
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
      if (actorMeetsPrerequisite(actor, subPrereq, false)) return returnVal;
    }
  }
  
  returnVal.value = orDefault;
  returnVal.known = false;
  return returnVal;
}

function actorMeetsPrerequisites(actor, perk, isRoot) {
  console.log("actorMeetsPrerequisites", actor, perk, isRoot);
  if (!perk) return true;
  const cost = perk.system.cost;
  const prerequisites = perk.system.prerequisites;
  if (!actor) return true;
  const available = actor.system.advancement.advancementPoints.available;

  if (available < cost) return false;

  if (isRoot) return true;

  if (prerequisites.size == 0) return true;

  for (const prereq of prerequisites) {
    const { value, known } = actorMeetsPrerequisite(actor, prereq, true);
    if (!known) console.log("Unknown prerequisite:", prereq);
    if (!value) return false;
  }

  return true;
}

// copied from perks-store.ts
function perkStore_updatePerkState(currentPerk, actor, manager) {
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
      if(actorMeetsPrerequisites(actor, connectedPerk, isRootPerk)) {
          connectedNode.state = PerkState.available;
          continue;
      }
      connectedNode.state = PerkState.connected;
  }
}

// copied from perks-store.ts
function perkStore_tryUpdatePerkState(currentNode, actor, manager) {
  const isRootNode = currentNode.perk.system.node.type === "root"

  for(const connected of new Set(currentNode.connected)) {
      const connectedPerk = manager.perks.get(connected);
      if(!connectedPerk || connectedPerk.system.node.i === null || connectedPerk.system.node.j === null) continue;
      
      const connectedNode = this.get(`${connectedPerk.system.node.i},${connectedPerk.system.node.j}`);
      if(!connectedNode) {
          if(!this.missingConnections.has(connected)) this.missingConnections.set(connected, new Set([currentNode.perk.slug]));
          else this.missingConnections.get(connected).add(currentNode.perk.slug);
          continue;
      }
      if(connectedNode.state !== PerkState.purchased) continue;

      if(isRootNode) currentNode.perk.system.cost = connectedPerk.system.cost;

      //TODO: Implement proper prerequisite checking
      if(actorMeetsPrerequisites(actor, currentNode?.perk, isRootNode)) {
          currentNode.state = PerkState.available;
      }
      currentNode.state = PerkState.connected;
      break;
  }
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
  PerkStore.updatePerkState = perkStore_updatePerkState.bind(PerkStore);
  PerkStore.tryUpdatePerkState = perkStore_tryUpdatePerkState.bind(PerkStore);
}



export function register() {
  const module = game.modules.get("ptr2e-modifications");
  module.api ??= {};
  module.api.actorMeetsPrerequisites = actorMeetsPrerequisites;

  Hooks.on("ready",()=>{
    addPerkWebPrerequisiteParsing();
  });
}