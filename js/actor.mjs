
// CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareBaseData
import { PTR2eSkillGroups } from "./categorized-skill-system/skill-groups-collection.mjs";
import { SkillsComponent } from "./categorized-skill-system/skills-component.mjs";
import { MODULENAME } from "./utils.mjs";


function prepareBaseData(wrapper) {
  wrapper();
  
  const isAce = this.traits.has("ace");
  // set advancement maximums
  const pointsSkillBase = game.settings.get(MODULENAME, "pointsSkillBase") ?? 110;
  const pointsSkillLevel = game.settings.get(MODULENAME, "pointsSkillLevel") ?? 1;
  const pointsSkillAce = game.settings.get(MODULENAME, "pointsSkillAce") ?? 290;
  this.advancement.rvs.total = Math.floor(pointsSkillBase + (isAce ? pointsSkillAce : 0) + (pointsSkillLevel * (this.advancement.level - 1)));

  const pointsPerkBase = game.settings.get(MODULENAME, "pointsPerkBase") ?? 20;
  const pointsPerkAce = game.settings.get(MODULENAME, "pointsPerkAce") ?? 0;
  const pointsPerkPokemon = game.settings.get(MODULENAME, "pointsPerkPokemon") ?? 0.5;
  this.advancement.advancementPoints.total = Math.floor((pointsPerkBase + (isAce ? pointsPerkAce : 0) + this.advancement.level - 1) * (this.parent.isHumanoid() ? 1 : pointsPerkPokemon));


  if ((game.settings.get(MODULENAME, "categorizedSkills") ?? true)) {
    // add inherited value of skills
    const skillGroups = this.parent.getFlag(MODULENAME, "skillGroups") ?? PTR2eSkillGroups.skillGroups();
    for (const skillGroup of Object.values(skillGroups)) {
      SkillsComponent.updateSkillGroupWithChange(skillGroup);
    }
    for (const skill of this.skills) {
      SkillsComponent.updateSkillWithChange(skill);
      skill.bonusFromGroups = 0;
      for (const group of game.ptr.data.skillGroups.groupChainFromSkill(skill)) {
        skill.bonusFromGroups += skillGroups[group.slug]?.rvs ?? 0;
      }
      skill.total += skill.bonusFromGroups;
    }
    this.advancement.rvs.spent += Object.values(skillGroups).reduce((t, sg) => t + sg.rvs, 0);
  }
}

function prepareDerivedData(wrapper) {
  wrapper();

  const isAce = this.traits.has("ace");
  // set advancement maximums
  const pointsSkillBase = game.settings.get(MODULENAME, "pointsSkillBase") ?? 110;
  const pointsSkillLevel = game.settings.get(MODULENAME, "pointsSkillLevel") ?? 1;
  const pointsSkillAce = game.settings.get(MODULENAME, "pointsSkillAce") ?? 290;
  this.advancement.rvs.total = Math.floor(pointsSkillBase + (isAce ? pointsSkillAce : 0) + (pointsSkillLevel * (this.advancement.level - 1))) + (this.modifiers["rvs"] ?? 0);

  const pointsPerkBase = game.settings.get(MODULENAME, "pointsPerkBase") ?? 20;
  const pointsPerkAce = game.settings.get(MODULENAME, "pointsPerkAce") ?? 0;
  const pointsPerkPokemon = game.settings.get(MODULENAME, "pointsPerkPokemon") ?? 0.5;
  this.advancement.advancementPoints.total = Math.floor((pointsPerkBase + (isAce ? pointsPerkAce : 0) + this.advancement.level - 1) * (this.parent.isHumanoid() ? 1 : pointsPerkPokemon)) + (this.modifiers["advancementPoints"] ?? 0);
}


// TODO: make a synchronous version of game.ptr.util.image.createFromSpeciesData?
// it being async REALLY makes it hard to do updates with images in them

async function _actorUpdateFromSpeciesUpdate(actorData, item, speciesData) {
  if (speciesData?.system?.slug && !speciesData.name) {
    speciesData.name = speciesData.system.slug.titleCase();
  }
  // check if the name of the actor is the same as the species item
  const actorUpdates = {};
  if (speciesData.name && actorData.name === item.name) {
    actorUpdates.name = speciesData.name;
  }
  if (speciesData.name && actorData?.prototypeToken?.name === item.name) {
    actorUpdates["prototypeToken.name"] = speciesData.name;
  }

  const slug = speciesData?.system?.slug ?? item?.system?.slug;
  const dexId = speciesData?.system?.number ?? item.system.number;
  const shiny = actorData?.system?.shiny ?? false;
  const form = speciesData?.system?.form ?? item.system.form;

  // update the image/token image
  const {portrait, token} = await (async()=>{
    const baseArt = game.ptr.data.artMap.get(slug);
    if (!baseArt)
      return {
        portrait: "icons/svg/mystery-man.svg",
        token: "icons/svg/mystery-man.svg"
      };
    const potraitImg = await game.ptr.util.image.createFromSpeciesData({
      dexId,
      shiny,
      forms: form ? [form] : [],
      gender: actorData.system?.gender,
    }, baseArt);
    if (!potraitImg?.result)
      return {
        portrait: "icons/svg/mystery-man.svg",
        token: "icons/svg/mystery-man.svg"
      };
    const tokenImg = await game.ptr.util.image.createFromSpeciesData({
      dexId,
      shiny,
      forms: form ? [form, "token"] : ["token"],
      gender: actorData.system?.gender,
    }, baseArt);
    return {
        portrait: potraitImg.result,
        token: tokenImg?.result ?? potraitImg.result
    }
  })()

  actorUpdates.img = portrait;
  actorUpdates["prototypeToken.texture.src"] = token;
  return actorUpdates;
}


function OnPreUpdateItem(item, updateData) {
  if (item.type !== "species") return;
  const actor = item.parent;
  if (!actor) return;
  _actorUpdateFromSpeciesUpdate(actor.toObject(), item, updateData).then(actorUpdates=>{
    if (Object.keys(actorUpdates).length > 0) {
      return actor.update(actorUpdates);
    }
  });
}

function OnPreUpdateActor(actor, actorUpdate) {
  if (actor.type !== "pokemon") return;
  if (!actorUpdate.items) return;
  const itemUpdate = actorUpdate.items.find(i=>i.type === "species");
  if (!itemUpdate) return;
  const item = actor.items.get(itemUpdate._id);
  if (!item) return;

  const actorData = foundry.utils.deepClone(actor.toObject());
  foundry.utils.mergeObject(actorData, actorUpdate);
  const itemData = foundry.utils.deepClone(item.toObject());
  foundry.utils.mergeObject(itemData, itemUpdate);

  _actorUpdateFromSpeciesUpdate(actorData, item, itemData).then(actorUpdates=>{
    if (Object.keys(actorUpdates).length > 0) {
      return actor.update(actorUpdates);
    }
  });
}


export function register() {
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareBaseData", prepareBaseData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.pokemon.prototype.prepareBaseData", prepareBaseData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.pokemon.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");

  Hooks.on("preUpdateItem", OnPreUpdateItem);
  Hooks.on("preUpdateActor", OnPreUpdateActor);
}
