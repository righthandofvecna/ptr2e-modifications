
// CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareBaseData
import { PTR2eSkillGroups } from "./categorized-skill-system/skill-groups-collection.mjs";
import { SkillsComponent } from "./categorized-skill-system/skills-component.mjs";
import { MODULENAME } from "./utils.mjs";


function prepareBaseData(wrapper) {
  wrapper();
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


export function register() {
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.humanoid.prototype.prepareBaseData", prepareBaseData, "WRAPPER");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Actor.dataModels.pokemon.prototype.prepareBaseData", prepareBaseData, "WRAPPER");
}
