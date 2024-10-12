// import { ActorComponent } from "./base.ts";
import { htmlQueryAll, MODULENAME } from "../utils.mjs";
import { PTR2eSkillGroups } from "./skill-groups-collection.mjs";

class SkillsComponent /*extends ActorComponent*/ {
    static TEMPLATE = "modules/ptr2e-modifications/templates/actor-skills-component.hbs";
    static TOOLTIP = "PTR2E.ActorSheet.Components.Skills.tooltip";

    static ACTIONS = {
        "toggle-hidden-skills": async function () {
            const appSettings = foundry.utils.duplicate(game.user.getFlag("ptr2e", "appSettings") ?? {});
            const appId = `ActorSheetPTRV2-${this.actor.uuid.replaceAll(".", "-")}`;
            if (!appSettings[appId]) appSettings[appId] = {hideHiddenSkills: true};

            appSettings[appId].hideHiddenSkills = !appSettings[appId].hideHiddenSkills;
            await game.user.setFlag("ptr2e", "appSettings", appSettings);
            
            for(const app of Object.values(this.actor.apps)) {
                if(app instanceof foundry.applications.api.ApplicationV2) {
                    const parts = (app).parts;
                    if('popout' in parts) app.render({parts: ["popout"]})
                    if('skills' in parts) app.render({parts: ["skills"]})
                }
                else app?.render();
            }
        },
    }

    static updateSkillWithChange(skill) {
      const coreSkill = CONFIG.PTR.data.skills[skill?.slug];
      if (coreSkill) {
        skill.group = coreSkill.group;
        skill.label = coreSkill.label;
      }
    }

    static prepareSkillsData(actor) {
        const skills = (() => {
            const favouriteGroups = { none: { label: null, slug: null, skills: [], subcategories: [], skillsAndGroups: [] } };
            const hiddenGroups = { none: { label: null, slug: null, skills: [], subcategories: [], skillsAndGroups: [] } };
            const normalGroups = { none: { label: null, slug: null, skills: [], subcategories: [], skillsAndGroups: [] } };

            for (const skill of actor.system.skills.contents.sort((a, b) =>
                a.slug.localeCompare(b.slug)
            )) {
                const category = (()=>{
                    if (skill.favourite) {
                        return favouriteGroups;
                    } else if (skill.hidden) {
                        return hiddenGroups;
                    }
                    return normalGroups;
                })();

                SkillsComponent.updateSkillWithChange(skill);

                const groups = game.ptr.data.skillGroups.groupChainFromSkill(skill).map(g=>g.slug);
                groups.push("none");
                for (const group of groups)
                    if (!category[group])
                        category[group] = { label: group, slug: group, skills: [], subcategories: [], skillsAndGroups: [] };
                category[groups[0]].skills.push(skill);
            }
            // group inheritance
            const allCategories = [favouriteGroups, hiddenGroups, normalGroups]
            for (const category of allCategories) {
                const categoryFlat = {...category};
                for (const [ groupSlug, skillCategory ] of Object.entries(category).sort((a, b) => a[0].localeCompare(b[0]))) {
                    if (groupSlug == "none") continue;
                    const group = game.ptr.data.skillGroups.get(groupSlug);
                    const parentGroup = categoryFlat[group?.parentGroup ?? "none"];
                    if (parentGroup) {
                        parentGroup.subcategories.push(skillCategory);
                        delete category[groupSlug];
                    }
                }

                for (const subCategory of Object.values(categoryFlat)) {
                    const depth = game.ptr.data.skillGroups.groupChain(game.ptr.data.skillGroups.get(subCategory.slug)).length;
                    const sc = subCategory.subcategories.map(s=>({slug: s.slug, subcategory: s, isGroup: true, depth }));
                    subCategory.skillsAndGroups = [
                        ...subCategory.skills.map(s=>({slug: s.slug, skill: s, isGroup: false, depth })),
                        ...sc
                    ].sort((a, b) => (a?.slug ?? "").localeCompare(b?.slug ?? ""));
                };
            }

            const sortAndCombineGroups = function (category) {
                return Object.entries(category)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([, v]) => v);
            };

            return {
                favourites: sortAndCombineGroups(favouriteGroups),
                hidden: sortAndCombineGroups(hiddenGroups),
                normal: sortAndCombineGroups(normalGroups),
            };
        })();

        const hideHiddenSkills = (() => {
            const appSettings = game.user.getFlag("ptr2e", "appSettings");
            const appId = `ActorSheetPTRV2-${actor.uuid.replaceAll(".", "-")}`;
            if(appSettings?.[appId]) {
                return appSettings[appId].hideHiddenSkills;
            }
            return true;
        })();

        return {
            skills,
            hideHiddenSkills,
        };
    }

    static prepareSkillGroupsData(actor) {
        return {
            skillGroups: Object.values(actor.getFlag(MODULENAME, "skillGroups") ?? PTR2eSkillGroups.skillGroups()).sort((a, b) =>
                a.slug.localeCompare(b.slug)
            )
        };
    }

    renderComponent(data) {
        const {skills, hideHiddenSkills} = SkillsComponent.prepareSkillsData(this.actor);
        data.skills = skills;
        data.hideHiddenSkills = hideHiddenSkills;
        return renderTemplate(this.template, data);
    }

    renderFrame(close) {
        // Add Toggle Hidden button to the header
        const toggleHiddenSkillsLabel = game.i18n.localize("PTR2E.ActorSheet.Components.toggle-hidden-skills");
        const toggleHiddenSkillsButton = `<button type="button" class="header-control fa-solid fa-eye-slash" data-action="toggle-hidden-skills"
                                    data-tooltip="${toggleHiddenSkillsLabel}" aria-label="${toggleHiddenSkillsLabel}"></button>`;
        close.insertAdjacentHTML("beforebegin", toggleHiddenSkillsButton);
    }

    attachListeners(htmlElement) {
        return SkillsComponent.attachListeners(htmlElement, this.actor);
    }

    static attachListeners(htmlElement, actor) {
        const refreshApps = () => {
            for(const app of Object.values(actor.apps)) {
                if(app instanceof foundry.applications.api.ApplicationV2) {
                    const parts = (app).parts;
                    if('popout' in parts) app.render({parts: ["popout"]})
                    if('skills' in parts) app.render({parts: ["skills"]})
                }
                else app?.render();
            }
        }

        for (const element of htmlQueryAll(htmlElement, ".item-controls .favourite-skill")) {
            element.addEventListener("click", async (event) => {
                const skillSlug = (
                    (event.currentTarget)?.closest(".skill")
                )?.dataset.slug;
                if (!skillSlug) return;
                
                const skills = actor.system.toObject().skills;
                const index = skills.findIndex((s) => s.slug === skillSlug);
                if (index === -1) return;

                skills[index].favourite = !skills[index].favourite;
                if(skills[index].favourite && skills[index].hidden) skills[index].hidden = false;
                await actor.update({ "system.skills": skills });
                refreshApps();
            });
        }

        for (const element of htmlQueryAll(htmlElement, ".item-controls .hide-skill")) {
            element.addEventListener("click", async (event) => {
                const skillSlug = (
                    (event.currentTarget)?.closest(".skill")
                )?.dataset.slug;
                if (!skillSlug) return;

                const skills = actor.system.toObject().skills;
                const index = skills.findIndex((s) => s.slug === skillSlug);
                if (index === -1) return;

                skills[index].hidden = !skills[index].hidden;
                if(skills[index].hidden && skills[index].favourite) skills[index].favourite = false;
                await actor.update({ "system.skills": skills });
                refreshApps();
            });
        }

        for (const element of htmlQueryAll(htmlElement, ".skill-icon.rollable")) {
            element.addEventListener("click", async (event) => {
                const skillSlug = (
                    (event.currentTarget)?.closest(".skill")
                )?.dataset.slug;
                if (!skillSlug) return;

                const skill = actor.system.skills.get(skillSlug);
                if(!skill) return;

                return skill.roll();
            });
        }
    }
}

export { SkillsComponent }