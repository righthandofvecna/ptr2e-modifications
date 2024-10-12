
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


export function register() {
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareBaseData", prepareBaseData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.pokemon.prototype.prepareBaseData", prepareBaseData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.pokemon.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");
}
