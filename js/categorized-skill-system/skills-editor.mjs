import { SkillsComponent } from "./skills-component.mjs";
import { htmlQueryAll, MODULENAME } from "../utils.mjs";
import { PTR2eSkillGroups } from "./skill-groups-collection.mjs";


export class SkillsEditor extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      tag: "form",
      classes: ["sheet skill-sheet"],
      position: {
        height: 'auto',
        width: 500,
      },
      form: {
        submitOnChange: false,
        closeOnSubmit: true,
        handler: SkillsEditor.#onSubmit,
      },
      window: {
        minimizable: true,
        resizable: false,
      },
      actions: {
        "reset-skills": SkillsEditor.#onResetSkills,
        "change-resources": SkillsEditor.#onChangeResources,
        "change-luck": SkillsEditor.#onChangeLuck,
        "roll-luck": SkillsEditor.#onRollLuck,
      },
    },
    { inplace: false }
  );

  static PARTS = {
    skills: {
      id: "skills",
      template: "modules/ptr2e-modifications/templates/skills-editor.hbs",
    },
  };

  document;
  skills;
  skillGroups;

  get title() {
    return `${this.document.name}'s Skills Editor`;
  }

  constructor(
    document,
    options = {}
  ) {
    options.id = `Skill-Editor-${document.uuid}`;
    super(options);
    this.document = document;
    this.skills = this.resetSkills();
    this.skillGroups = this.resetSkillGroups();
  }

  resetSkills() {
    const { skills, hideHiddenSkills } = SkillsComponent.prepareSkillsData(this.document);

    const convertSkill = (skill) => {
      if (game.i18n.has(`PTR2E.Skills.${skill.slug}.label`)) {
        const label = game.i18n.format(`PTR2E.Skills.${skill.slug}.label`);
        return [{
          ...skill,
          label,
          investment: 0,
          max: 70 - (skill?.rvs ?? 0),
          min: -(skill?.rvs ?? 0),
        }];
      } else {
        const skillData = game.ptr.data.skills.get(skill?.slug);
        if (skillData && game.ptr.data.skills.isCustomSkill(skillData)) {
          return [{
            ...skill,
            label: skillData.label || Handlebars.helpers.formatSlug(skill.slug),
            investment: 0,
            max: 70 - (skill?.rvs ?? 0),
            min: -(skill?.rvs ?? 0),
          }];
        }
      }
      return []
    }

    const getSkillsRecursively = function (skillCategory) {
      const retrieved = [...skillCategory.skills];
      for (const subCategory of skillCategory.subcategories) {
        retrieved.push(...getSkillsRecursively(subCategory))
      }
      return retrieved;
    }

    return [
      ...skills.favourites.flatMap(getSkillsRecursively).flatMap(convertSkill),
      ...skills.normal.flatMap(getSkillsRecursively).flatMap(convertSkill),
      ...(hideHiddenSkills ? [] :
        skills.hidden.flatMap(getSkillsRecursively).flatMap(convertSkill)),
    ];
  }

  resetSkillGroups() {
    const { skillGroups } = SkillsComponent.prepareSkillGroupsData(this.document);
    const convertSkillGroup = (group) => {
      const label = game.i18n.format(`PTR2E.Skills.${group.slug}.label`);
      return {
        ...group,
        label,
        investment: 0,
        // min: -(group.rvs ?? 0),
        // max: group.points - (group.rvs ?? 0),
      }
    }
    return skillGroups.map(convertSkillGroup);
  }

  async _prepareContext() {
    const points = {
      total: this.document.system.advancement.rvs.total,
      spent: (() => {
        let spent = this.document.system.advancement.rvs.spent;
        for (const skill of this.skills) {
          spent += skill.investment;
        }
        for (const group of this.skillGroups) {
          spent += group.investment;
        }
        return spent;
      })(),
    };
    points.available = points.total - points.spent;
    const levelOne = this.document.system.advancement.level === 1;
    const maxTotalInvestment = levelOne ? 90 : 100;

    const groupsWithSkillsVisible = new Set(this.skillGroups.filter(group => (group.rvs ?? 0) + group.investment >= group.points).map(group => group.slug));

    // remove skills that should be hidden by groups!
    // also assign min, max, and bonusFromGroups
    const modifiableSkills = foundry.utils.deepClone(this.skills).filter((skill) => {
      const skillInGroups = game.ptr.data.skillGroups.groupChainFromSkill(skill);
      return skillInGroups.length == 0 || skillInGroups.every((group) => groupsWithSkillsVisible.has(group.slug));
    }).map((skill) => {
      // get inherited values from groups
      let bonusFromGroups = 0;
      for (const group of game.ptr.data.skillGroups.groupChainFromSkill(skill)) {
        const editorGroup = this.skillGroups.find((g) => g.slug == group.slug)
        bonusFromGroups += (editorGroup?.rvs ?? 0) + (editorGroup?.investment ?? 0);
      }
      return {
        ...skill,
        min: -(skill.rvs ?? 0),
        max: Math.clamp(maxTotalInvestment - (skill.rvs ?? 0) - (bonusFromGroups), 0, points.available + skill.investment),
        bonusFromGroups,
      }
    });

    // remove groups that should be hidden by parent groups!
    // also assign min, max, and bonusFromGroups
    const modifiableGroups = foundry.utils.deepClone(this.skillGroups).filter((group) => {
      return !group.parentGroup || groupsWithSkillsVisible.has(group.parentGroup);
    }).map((group) => {
      let bonusFromGroups = - ((group.rvs ?? 0) + (group.investment ?? 0));
      for (const parentGroup of game.ptr.data.skillGroups.groupChain(group)) {
        const editorGroup = this.skillGroups.find((g) => g.slug == parentGroup.slug)
        bonusFromGroups += (editorGroup?.rvs ?? 0) + (editorGroup?.investment ?? 0);
      }
      return {
        ...group,
        min: -(group.rvs ?? 0),
        max: Math.clamp(group.points - (group.rvs ?? 0 + group.investment), 0, Math.clamp(points.available + group.investment, 0, maxTotalInvestment)),
        bonusFromGroups,
      }
    });

    // re-group and sort skills and skill-groups
    const { skills, resources, luck } = (() => {
      const groupsWithSkills = modifiableGroups.map((g) => {
        return {
          ...g,
          isGroup: true,
          skills: [],
        }
      })
      const groupsAndSkills = [];
      for (const group of groupsWithSkills) {
        const containingGroup = groupsWithSkills.find((g) => g.slug == group.parentGroup);
        if (containingGroup) {
          containingGroup.skills.push(group);
        } else {
          groupsAndSkills.push(group);
        }
      }
      for (const skill of modifiableSkills) {
        const containingGroup = groupsWithSkills.find((g) => g.slug == skill.group);
        if (containingGroup) {
          containingGroup.skills.push(skill);
        } else {
          groupsAndSkills.push(skill);
        }
      }
      // pull resources and luck out
      const resources = groupsAndSkills.splice(groupsAndSkills.findIndex((s) => s.slug == "resources"), 1)?.[0];
      const luck = groupsAndSkills.splice(groupsAndSkills.findIndex((s) => s.slug == "luck"), 1)?.[0];
      // sort the rest!
      groupsWithSkills.forEach((group) => group.skills.sort((a, b) => a.label.localeCompare(b.label)));
      groupsAndSkills.sort((a, b) => a.label.localeCompare(b.label));
      // assign depth to all
      const assignDepth = function (depth) {
        return function (g) {
          g.depth = depth;
          g.max = Math.max(g.min, Math.min(g.max, g.investment + points.available))
          if (g.skills) {
            g.skills.forEach(assignDepth(depth + 1));
          }
        }
      };
      groupsAndSkills.forEach(assignDepth(0))
      return {
        skills: groupsAndSkills,
        resources,
        luck,
      };
    })();

    // check if this configuration is valid, and can pass validation
    const valid = points.available >= 0 && !skills.some((skill) => (skill.slug === "resources" ? (skill.investment <= -skill.value) : (skill.investment < skill.min)) || skill.investment > skill.max);

    return {
      document: this.document,
      luck,
      resources,
      skills,
      points,
      isReroll:
        !levelOne || (levelOne && this.document.system.skills.get("luck").value > 1),
      levelOne,
      valid,
      showOverrideSubmit: game?.user?.isGM ?? false,
    };
  }

  async render(options, _options) {
    const scrollTop = this.element?.querySelector(".scroll")?.scrollTop;
    const renderResult = await super.render(options, _options);
    // set the scroll location
    if (scrollTop) {
      const scroll = this.element.querySelector(".scroll");
      if (scroll !== null) scroll.scrollTop = scrollTop;
    }
    return renderResult;
  }

  _attachPartListeners(
    partId,
    htmlElement,
    options
  ) {
    super._attachPartListeners(partId, htmlElement, options);

    for (const input of htmlQueryAll(htmlElement, ".skill input")) {
      input.addEventListener("change", this.#onSkillChange.bind(this));
    }
    for (const input of htmlQueryAll(htmlElement, ".skill-group input")) {
      input.addEventListener("change", this.#onSkillGroupChange.bind(this));
    }
  }

  #onSkillChange(event) {
    const input = event.currentTarget;
    const slug = input.dataset.slug;
    if (!slug) return;
    const value = parseInt(input.value);
    if (isNaN(value)) return;

    const skill = this.skills.find((skill) => skill.slug === slug);
    if (!skill) return;

    skill.investment = value;
    this.render({});
  }

  #onSkillGroupChange(event) {
    const input = event.currentTarget;
    const slug = input.dataset.slug;
    if (!slug) return;
    const value = parseInt(input.value);
    if (isNaN(value)) return;

    const group = this.skillGroups.find((group) => group.slug === slug);
    if (!group) return;

    group.investment = value;
    this.render({});
  }

  static #onResetSkills(skilleditor) {
    const document = this.document;

    foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.format("PTR2E.SkillsEditor.ResetSkills.title", {
          name: document.name,
        }),
      },
      content: game.i18n.format("PTR2E.SkillsEditor.ResetSkills.content", {
        name: document.name,
      }),
      yes: {
        callback: async () => {
          await document.update({
            "system.skills": document.system.skills.map((skill) => {
              if (skill.slug === "resources") return {
                ...skill,
                rvs: 0,
                value: 10,
              };
              return {
                ...skill,
                rvs: 0,
              };
            }),
            "system.skillGroups": document.system.skillGroups.map((group) => {
              return {
                ...group,
                rvs: 0,
              }
            }),
          });
          this.skills = this.resetSkills();
          this.skillGroups = this.resetSkillGroups();
          this.render({});
        },
      },
    });
  }

  static #onChangeResources(skilleditor) {
    const document = this.document;
    const resources = document.system.skills.find((skill) => skill.slug === "resources");
    if (!resources) return;

    foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.format("PTR2E.SkillsEditor.ChangeResources.title", {
          name: document.name,
        }),
      },
      content: game.i18n.format("PTR2E.SkillsEditor.ChangeResources.content", {
        name: document.name,
        value: resources.total,
      }),
      ok: {
        action: "submit",
        label: game.i18n.localize("PTR2E.SkillsEditor.ChangeResources.submit"),
        callback: async (event) => {
          const input = (event.currentTarget).querySelector(
            "input"
          );
          if (!input) return;

          const value = parseInt(input.value);
          if (isNaN(value) || !value) return;
          const resources = this.skills.find((skill) => skill.slug === "resources");
          if (resources.value + (resources.rvs ?? 0) + value < 1) {
            ui.notifications.warn(
              game.i18n.format("PTR2E.SkillsEditor.ChangeResources.warn", {
                name: document.name,
              })
            );
            return;
          }

          this.skills.find((skill) => skill.slug === "resources").rvs =
            (resources.rvs ?? 0) + value;

          await document.update({
            "system.skills": document.system.skills.map((skill) => {
              return skill.slug === "resources"
                ? {
                  ...skill,
                  rvs: (skill.rvs ?? 0) + value,
                }
                : skill;
            }),
          });
          this.render({});
        },
      },
    });
  }

  static #onChangeLuck(skilleditor) {
    const document = this.document;
    const luck = document.system.skills.find((skill) => skill.slug === "luck");
    if (!luck) return;

    foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.format("PTR2E.SkillsEditor.ChangeLuck.title", {
          name: document.name,
        }),
      },
      content: game.i18n.format("PTR2E.SkillsEditor.ChangeLuck.content", {
        name: document.name,
        value: luck.total,
      }),
      ok: {
        action: "submit",
        label: game.i18n.localize("PTR2E.SkillsEditor.ChangeLuck.submit"),
        callback: async (event) => {
          const input = (event.currentTarget).querySelector(
            "input"
          );
          if (!input) return;

          const value = parseInt(input.value);
          if (isNaN(value) || !value) return;
          const luck = this.skills.find((skill) => skill.slug === "luck");
          if (luck.value + value <= 0) {
            ui.notifications.warn(
              game.i18n.format("PTR2E.SkillsEditor.ChangeLuck.warn", {
                name: document.name,
              })
            );
            return;
          }

          this.skills.find((skill) => skill.slug === "luck").value =
            (luck.value ?? 0) + value;

          await document.update({
            "system.skills": document.system.skills.map((skill) => {
              return skill.slug === "luck"
                ? {
                  ...skill,
                  value: (skill.value ?? 0) + value,
                }
                : skill;
            }),
          });
          this.render({});
        },
      },
    });
  }

  static async #onRollLuck(skilleditor) {
    const document = this.document;
    const luck = document.system.skills.find((skill) => skill.slug === "luck");
    if (!luck) return;

    const levelOne = this.document.system.advancement.level === 1;
    const isReroll =
      !levelOne || (levelOne && this.document.system.skills.get("luck").value > 1);

    const rollAndApplyLuck = async (isReroll = false) => {
      const roll = await new Roll("3d6 * 5").roll();
      const flavor = isReroll
        ? game.i18n.format("PTR2E.SkillsEditor.RollLuck.reroll", { name: document.name })
        : game.i18n.format("PTR2E.SkillsEditor.RollLuck.roll", { name: document.name });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: document }),
        flavor,
        content: `<p>${flavor}</p>${await roll.render()}<p>${game.i18n.format(
          "PTR2E.SkillsEditor.RollLuck.result",
          {
            result: roll.total,
          }
        )}</p>`,
      });

      this.skills.find((skill) => skill.slug === "luck").value = roll.total;
      await document.update({
        "system.skills": document.system.skills.map((skill) => {
          return skill.slug === "luck"
            ? {
              ...skill,
              value: roll.total,
            }
            : skill;
        }),
      });
      this.render({});
    };

    if (!isReroll) {
      await rollAndApplyLuck();
      return;
    }

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.format("PTR2E.SkillsEditor.RollLuck.title", {
          name: document.name,
        }),
      },
      content: game.i18n.format("PTR2E.SkillsEditor.RollLuck.content", {
        name: document.name,
      }),
      yes: {
        callback: rollAndApplyLuck.bind(this, true),
      },
    });
  }

  static async #onSubmit(
    _event,
    _form,
    formData
  ) {
    const data = foundry.utils.expandObject(formData.object);
    const skills = this.document.system.toObject().skills;
    const skillGroups = this.document.getFlag(MODULENAME, "skillGroups") ?? PTR2eSkillGroups.skillGroups();
    const max = this.document.system.advancement.level === 1 ? 90 : 100;
    const avoidValidation = !!((_event)?.submitter?.getAttribute("formnovalidate"));

    for (const group of Object.values(skillGroups)) {
      const groupData = data[group.slug];
      if (!groupData) continue;
      const investment = parseInt(groupData.investment);
      if (isNaN(investment) || !investment) continue;

      if (avoidValidation) {
        group.rvs = (group.rvs ?? 0) + investment;
      } else {
        group.rvs = Math.clamp((group.rvs ?? 0) + investment, 0, group.points);
      }
      delete data[group.slug];
    }

    // check for groups that are no longer allowed to be pointed
    for (const group of Object.values(skillGroups)) {
      const ancestors = game.ptr.data.skillGroups.groupChain(group).slice(1);
      if (ancestors.some(ancestor => (skillGroups[ancestor.slug]?.rvs ?? 0) < ancestor.points)) {
        group.rvs = 0;
      }
    }

    let resourceMod = 0;
    for (const skill of skills) {
      // check if this skill is not allowed to be pointed
      const skillGroup = skillGroups[skill.group];
      if (skillGroup && (skillGroup.rvs ?? 0) < skillGroup.points) {
        // remove all points
        skill.rvs = 0;
        delete data[skill.slug];
        continue;
      }

      const skillData = data[skill.slug];
      if (!skillData) continue;
      const investment = parseInt(skillData.investment);
      if (isNaN(investment) || !investment) continue;

      if (skill.slug === "resources" && investment < 0) resourceMod = investment;
      if (avoidValidation) {
        skill.rvs = (skill.rvs ?? 0) + investment;
      } else {
        skill.rvs = Math.clamp((skill.rvs ?? 0) + investment, skill.slug === "resources" ? -max : 0, max);
      }
      delete data[skill.slug];
    }

    for (const slug in data) {
      const investment = parseInt(data[slug].investment);
      if (isNaN(investment) || !investment) continue;

      const skillData = game.ptr.data.skills.get(slug);
      if (!skillData || !game.ptr.data.skills.isCustomSkill(skillData)) continue;

      if (slug === "resources" && investment < 0) resourceMod = investment;

      const rvs = avoidValidation ? investment : Math.clamp(investment, slug === "resources" ? -max : 0, max);

      skills.push({
        slug,
        value: 1,
        rvs,
        favourite: skillData.favourite ?? false,
        hidden: skillData.hidden ?? false,
        group: skillData.group || undefined,
      });
    }

    if (this.document.system.advancement.level === 1) {
      const resourceIndex = skills.findIndex((skill) => skill.slug === "resources");
      if (resourceIndex !== -1) {
        const resources = skills[resourceIndex];
        resources.value += (resources.rvs ?? 0) + resourceMod;
        resources.rvs = 0;
      }
    }

    await this.document.update({
      "system.skills": skills,
      [`flags.${MODULENAME}.skillGroups`]: skillGroups,
    });
  }
};




