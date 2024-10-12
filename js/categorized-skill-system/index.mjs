

import { BaseSkills, BaseSkillGroups } from "./skill.mjs";
import { SkillsEditor } from "./skills-editor.mjs";
import { PTR2eSkillGroups } from "./skill-groups-collection.mjs";
import { SkillsComponent } from "./skills-component.mjs";
import { MODULENAME } from "../utils.mjs";


function ActorSheetPTRV2_prepareContext(original) {
  return async function (options) {
    const { skills, hideHiddenSkills } = SkillsComponent.prepareSkillsData(this.actor);
  
    return {
      ...(await original.bind(this)(options)),
      skills,
      hideHiddenSkills,
    };
  }
}


export function register() {
  if (!(game.settings.get(MODULENAME, "categorizedSkills") ?? true)) return;

  CONFIG.PTR.data.originalSkills = foundry.utils.deepClone(CONFIG.PTR.data.skills);
  CONFIG.PTR.data.skills = BaseSkills;
  CONFIG.PTR.data.skillGroups = BaseSkillGroups;

  // update base skill group costs
  const maxGroupInvestment = game.settings.get(MODULENAME, "categorizedSkills") ? game.settings.get(MODULENAME, "maxGroupInvestment") : 20;
  if (maxGroupInvestment != 20) {
    for (const sg of Object.values(BaseSkillGroups)) {
      sg.points = maxGroupInvestment;
    }
  }

  game.ptr.data.skillGroups = PTR2eSkillGroups.create();
  game.ptr.data.skills.refresh();

  const ActorSheetPTRV2 = CONFIG.PTR.Actor.sheetClasses.character;
  ActorSheetPTRV2.DEFAULT_OPTIONS.actions["edit-skills"] = function () {
    new SkillsEditor(this.actor).render(true);
  };

  // ActorSheetPTRV2.PARTS.skills.template = SkillsComponent.TEMPLATE;
  ActorSheetPTRV2.prototype._prepareContext = ActorSheetPTRV2_prepareContext(ActorSheetPTRV2.prototype._prepareContext);

  Handlebars.unregisterPartial("actor-skills-component");
  loadTemplates(["modules/ptr2e-modifications/templates/actor-skills-component.hbs"]).then(()=>{
    Handlebars.registerPartial("actor-skills-component", `{{> modules/ptr2e-modifications/templates/actor-skills-component.hbs}}`);
  })
}

// TODO: tooltips
// TODO: override validation on skills-editor
// TODO: skills display on character sheet