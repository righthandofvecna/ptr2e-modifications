import { MODULENAME, htmlQueryAll, sluggify } from "../utils.mjs";



function toCM(number) {
  if (number >= 0) return `+${number}%`;
  return `${number}%`;
}

function actorLevel(actor) {
  const xp = (actor?.system?.advancement?.experience?.current ?? 1) + (actor.getFlag(MODULENAME, "pendingXp") ?? 0);
  if (actor?.isHumanoid?.()) {
    return Math.clamp(Math.floor(Math.cbrt(((xp || 1) * 4) / 5)), 1, 100);
  }
  return Math.clamp(Math.floor(Math.cbrt(((xp || 1) * 6) / 3)), 1, 100);
}

export class ExpApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {//ApplicationV2Expanded) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      tag: "form",
      classes: ["ptr2e", "sheet", "xp-sheet"],
      position: {
        height: 'auto',
        width: 425,
      },
      window: {
        minimizable: true,
        resizable: false,
      },
      form: {
        submitOnChange: false,
        closeOnSubmit: true,
        handler: ExpApp.onSubmit,
      },
    },
    { inplace: false }
  );

  static PARTS = {
    actions: {
      id: "actions",
      template: "modules/ptr2e-modifications/templates/xp-award.hbs",
      scrollable: [".scroll"],
    },
  };

  static F_BAND = 2.5;
  static NON_PARTY_MODIFIER = 1 / 4;
  static UNEVOLVED_BONUS = 1.2;

  name;
  documents;
  applyMode;

  constructor(name, documents, options = {}) {
    options.id = `exp-${documents.length ? documents[0].id || fu.randomID() : fu.randomID()}`;
    super(options);
    this.name = name;
    this.documents = documents;

    if (this.level < 10 && !this.circumstances.find(cm => cm.label === "Baby's First Steps")) {
      this.setCircumstances([...this.circumstances, {
        label: "Baby's First Steps",
        bonus: 100,
      }])
    };

    this.applyMode = options.applyMode ?? game.settings.get(MODULENAME, "expMode");
  }

  async _prepareContext() {
    const party = this.documents.map(a => ({
      img: a.img,
      name: a.name,
      uuid: a.uuid,
    }));

    const cm = this.circumstances.sort((a, b) => b.bonus - a.bonus).map(c => ({
      label: c.label,
      bonus: toCM(c.bonus),
    }));

    const exampleCircumstanceModifiers = {};
    for (const [key, val] of Object.entries(CONFIG.PTR.data.circumstanceModifiers)) {
      const cmVal = {
        key,
        label: val.label,
        hint: val.hint,
        bonus: toCM(val.bonus),
        sort: val.bonus,
      }
      for (const category of val.groups) {
        exampleCircumstanceModifiers[category] ??= [];
        exampleCircumstanceModifiers[category].push(cmVal);
      }
    }
    for (const contents of Object.values(exampleCircumstanceModifiers)) {
      contents.sort((a, b) => b.sort - a.sort);
    }

    const ber = this.ber;
    const modifier = this.modifier;
    const modifierLabel = toCM(modifier);

    const noteAppliesTo = game.i18n.localize(`PTR2E.XP.ApplyMode.${this.applyMode}.hint`);
    const additionalAppliesTo = this.appliesTo.difference(new Set(this.documents)).map(a => ({
        img: a.img,
        name: a.name,
        uuid: a.uuid,
    }));

    return {
      id: this.options.id,
      party,
      noteAppliesTo,
      additionalAppliesTo,
      modifier,
      modifierLabel,
      cm,
      ber,
      exampleCircumstanceModifiers,
    };
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    htmlElement.querySelector(".prospective-circumstance-modifiers .addCustomCircumstance")
      ?.addEventListener("click", ExpApp.#addCustomCM.bind(this));

    for (const input of htmlQueryAll(htmlElement, ".prospective-circumstance-modifiers .cm button.add[data-modifier-key]")) {
      input.addEventListener("click", ExpApp.#addCM.bind(this));
    }

    for (const input of htmlQueryAll(htmlElement, ".applied-circumstance-modifiers .cm button.remove")) {
      input.addEventListener("click", ExpApp.#removeCM.bind(this));
    }
  }

  get title() {
    return `${this.name} - ${game.i18n.localize("PTR2E.XP.title")}`;
  }

  get circumstances() {
    return game.settings.get("ptr2e", "expCircumstanceModifiers") ?? [];
  }

  async setCircumstances(newCircumstances) {
    await game.settings.set("ptr2e", "expCircumstanceModifiers", newCircumstances);
  }

  get level() {
    return (Math.ceil(this.documents.reduce((l, d) => l + actorLevel(d), 0)) ?? 1) / this.documents.length;
  }

  get ber() {
    const apl = this.level;
    return Math.max(10, Math.floor(0.25 * (5 / 4) * (Math.pow(apl + 1, 3) - Math.pow(apl, 3))));
  }

  get modifier() {
    return this.circumstances.reduce((m, c) => m + (c.bonus ?? 0), 0);
  }

  get appliesTo() {
    let docs = new Set(this.documents);

    // only give exp to the individuals indicated in the dialog
    if (this.applyMode === "individual") return docs;

    // give exp to the individuals in the dialog and their party members
    if (this.applyMode === "party") {
      for (const owner of this.documents) {
        const party = owner.party;
        if (!party) continue;
        for (const partyMember of party.party) {
          docs.add(partyMember);
        }
      }
      return docs;
    }

    // give exp to the individuals in the dialog and all their owned pokemon
    for (const owner of this.documents) {
      if (owner?.folder?.owner == "") continue;
      docs = docs.union(ExpApp.getNestedFolderContents(owner.folder));
    }
    return docs;
  }

  async render(options, _options) {
    if (!this.element) return super.render(options, _options);

    const groupsOpen = htmlQueryAll(this.element, "details[data-group]").reduce((m, d) => ({ ...m, [d.dataset.group]: d.open }), {});
    const prospectiveScrollTop = this.element?.querySelector(".prospective-circumstance-modifiers")?.scrollTop;
    const appliedScrollTop = this.element?.querySelector(".applied-circumstance-modifiers")?.scrollTop;

    // render the new page
    const renderResult = await super.render(options, _options);

    // set the open groups and scroll location
    for (const group of htmlQueryAll(this.element, "details[data-group]")) {
      group.open = groupsOpen[group.dataset.group] ?? false;
    }

    const prospective = this.element.querySelector(".prospective-circumstance-modifiers");
    if (prospective !== null) prospective.scrollTop = prospectiveScrollTop;

    const applied = this.element.querySelector(".applied-circumstance-modifiers");
    if (applied !== null) applied.scrollTop = appliedScrollTop;

    return renderResult;
  }

  static getNestedFolderContents(folder) {
    let contents = new Set(folder.contents);
    for (const subfolder of folder.children) {
      contents = contents.union(ExpApp.getNestedFolderContents(subfolder.folder));
    }
    return contents;
  }

  static calculateExpAward(actor, ber, cr, apl) {
    let calculatedExp = ber;
    // apply CR
    calculatedExp *= (1 + (cr / 100));
    // apply F_band
    calculatedExp *= Math.pow((2 * apl + 10) / (apl + actorLevel(actor) + 10), ExpApp.F_BAND);
    // apply party modifier
    if (!actor.party) {
      calculatedExp *= ExpApp.NON_PARTY_MODIFIER;
    }
    // TODO: apply bonus_ue
    return Math.floor(calculatedExp);
  }

  static #addCustomCM(event) {
    const cmLabel = this.element.querySelector(".prospective-circumstance-modifiers .customCircumstanceLabel").value || "Custom Circumstance";
    const cmBonus = parseInt(this.element.querySelector(".prospective-circumstance-modifiers .customCircumstanceBonus").value);
    if (isNaN(cmBonus)) return;

    this.setCircumstances([...this.circumstances, {
      label: cmLabel,
      bonus: cmBonus,
    }]).then(() => this.render(false));
  }

  static #addCM(event) {
    const button = event.currentTarget;
    const cmKey = button.dataset.modifierKey;
    game.settings.set("ptr2e", "expCircumstanceModifiers", [
      ...this.circumstances,
      CONFIG.PTR.data.circumstanceModifiers[cmKey]
    ]).then(() => this.render(false));
  }

  static #removeCM(event) {
    const button = event.currentTarget;
    const cmIdx = button.dataset.modifierIdx;
    this.setCircumstances(this.circumstances.splice(cmIdx, 1)).then(() => this.render(false));
  }

  static async onSubmit() {
    const ber = this.ber;
    const cm = this.modifier;
    const apl = this.level;

    const toApply = this.appliesTo.map(doc => {
      const pending = doc.getFlag(MODULENAME, "pendingXp") ?? 0;
      const xp = Math.floor(doc.system.advancement.experience.current + pending);
      const level = doc.system.getLevel(xp);
      return {
        uuid: doc.uuid,
        pending: pending,
        old: {
          experience: xp,
          level: level,
        },
        new: {
          experience: xp,
          level: level,
        },
        actor: doc,
      }
    });
    const modifiers = this.circumstances;

    const notification = ui.notifications.info(game.i18n.localize("PTR2E.XP.Notifications.Info"));

    await Promise.all(toApply.map(async (appliedExp) => {
      const expAward = ExpApp.calculateExpAward(appliedExp.actor, ber, cm, apl);
      await appliedExp.actor.update({
        [`flags.${MODULENAME}.pendingXp`]: appliedExp.pending + expAward,
      });
      appliedExp.new.experience = Math.floor(appliedExp.old.experience + expAward);
      appliedExp.new.level = appliedExp.actor.system.getLevel(appliedExp.new.experience);
    }))
    await this.setCircumstances([]);

    ui.notifications.remove(notification);
    ui.notifications.info(game.i18n.localize("PTR2E.XP.Notifications.Success"));

    const expChatType = ("experience" in CONFIG.PTR.ChatMessage.dataModels) ? "experience" : `${MODULENAME}.experience`;
    await CONFIG.PTR.ChatMessage.documentClass.create({
      type: expChatType,
      system: {
        expBase: ber * (1 + (cm / 100)),
        expApplied: toApply,
        modifiers,
      },
    });
  }
}

async function ApplyLevelUp(actor) {
  if (!actor || !actor?.system?.advancement) return;
  const pendingXp = actor.getFlag(MODULENAME, "pendingXp") ?? 0
  const newXp = (actor?.system?.advancement?.experience?.current ?? 0) + pendingXp;

  const oldLevel = actor.system.advancement.level;

  const actorUpdates = {
    "system.advancement.experience.current": newXp,
    [`flags.${MODULENAME}.pendingXp`]: 0,
  };
  const newLevel = actorLevel(actor);

  const existingSpecies = actor.system.species || actor.itemTypes.species?.at(0);
  const esSystem = existingSpecies?.system;

  let evolution = (()=>{
    function _getEvolution(evos) {
      if (!evos) return null;
      for (const evo of evos) {
        if (evo.name === esSystem.slug) return evo;
        const subEvo = _getEvolution(evo.evolutions);
        if (!!subEvo) return subEvo;
      }
      return null;
    }
    if (!esSystem?.evolutions) return null;
    return _getEvolution([esSystem.evolutions])
  })();

  const originalEvolution = evolution;

  let speciesUpdateItem = null;

  let evolutionsDenied = new Set();
  const newMoves = []; // the moves you should learn on level-up
  for (let level = oldLevel+1; level <= newLevel; level++) {
    // give moves by level up!
    newMoves.push(...(esSystem.moves.levelUp.filter(m=>m.level === level)));

    if (!evolution) continue;

    // check if we should evolve this level
    const availableEvolutions = evolution.evolutions.filter(e=>e.methods.some(m=>m.type === "level" && m.level <= level) && !evolutionsDenied.has(e.name));
    if (availableEvolutions.length > 0) {
      const evoOptions = availableEvolutions.reduce((o, evo)=>o+`<option value="${evo.name}">${evo.name.titleCase()}</option>`, "");
      const selectedEvolution = await new Promise(async (resolve)=>{
        Dialog.prompt({
          title: `${actor.name} is evolving!`,
          content: `
              <div class="form-group">
                <label for="evolution">Evolution</label>
                <select name="evolution">
                  ${evoOptions}
                  <option value="">Do Not Evolve</option>
                </select>
              </div>
          `,
          callback: (html) => resolve(html.find('[name="evolution"]')?.val() ?? ""),
        }).catch((e)=>{
          console.error("Error making dialog for selecting evolution:", e);
          resolve("");
        });
      });
      if (!selectedEvolution) {
        // add all the evolutions to evolutionsDenied
        availableEvolutions.forEach(evo=>evolutionsDenied.add(evo.name));
      } else {
        // do the evolution!
        evolution = availableEvolutions.find(evo=>evo.name === selectedEvolution);
        const species = await fromUuid(evolution.uuid);
        if (!!species) {
          const speciesUpdate = {};
          foundry.utils.mergeObject(speciesUpdate, foundry.utils.deepClone(species.toObject()));
          delete speciesUpdate.id;
          speciesUpdate._id = existingSpecies.id;
          speciesUpdate.name = speciesUpdate.name.titleCase();
          speciesUpdateItem = speciesUpdate;

          // add moves learned at evolution level
          newMoves.push(...(species.system.moves.levelUp.filter(m=>m.level === level)));
          ui.notifications.info(`Evolved into ${evolution.name.titleCase()}!`);
        } else {
          ui.notifications.error(`Cannot evolve into ${evolution.name.titleCase()}!`);
        }
      }
    }
  }

  // name really seems like it's a slug for these moves...
  const moves = (await Promise.all(newMoves
    .filter(move => !actor.itemTypes.move.some(item => item.slug == move.name))
    .map(move => fromUuid(move.uuid)))
  ).flatMap(move => move ?? []);

  actorUpdates.items ??= [];
  if (speciesUpdateItem) actorUpdates.items.push(speciesUpdateItem);
  actorUpdates.items.push(...moves.map(move => move.toObject()));
  actorUpdates["flags.ptr2e-modifications.movesToAdd"] = actorUpdates.items;

  // fire off a pre-evolve hook
  if (evolution !== originalEvolution) {
    Hooks.call("ptr2e.preEvolve", actor, actorUpdates);
  }

  const originalName = actor.name;
  
  await actor.update(actorUpdates);

  let message = `<p>${originalName} reached Level ${actor.system.advancement.level}!</p>`;
  if (evolution !== originalEvolution) {
    message += `<p>${originalName} evolved into ${existingSpecies?.name ?? "Nothing"}</p>`;
  }
  if (moves.length > 0) {
    message += `<p>${actor.name} learned the following moves:</p><ul>` + moves.reduce((a, m)=>a + `<li>${m.link}</li>`, "") + "</ul>"
  }
  // level-up notification
  await CONFIG.PTR.ChatMessage.documentClass.create({
    type: "base",
    title: `${actor.name} Level Up!`,
    content: message,
  });
}

// this is dumb, but un-do the auto-level up assigned moves
export function OnPreUpdateActor(actor, changes) {
  if (!changes?.flags?.["ptr2e-modifications"]?.movesToAdd) return;
  changes.items = changes.flags["ptr2e-modifications"].movesToAdd;
  changes.flags["ptr2e-modifications"].movesToAdd = undefined;
}


export function OnRenderActorSheetPTRV2(sheet, html) {
  const actor = sheet?.actor;
  if (!actor) return;

  const expHtml = html.querySelector(".sidebar .experience");
  if (!!expHtml.querySelector("button")) return;
  // TODO: the same thing for the bar

  expHtml.querySelector(".xp-current")?.remove?.();
  expHtml.querySelector(".xp-diff")?.remove?.();
  expHtml.querySelector(".xp-next")?.remove?.();

  const pendingXp = actor.getFlag(MODULENAME, "pendingXp") ?? 0
  if (pendingXp >= actor?.system?.advancement?.experience?.diff) {
    const levelUpButton = document.createElement("button", { class: "button", type: "button" });
    levelUpButton.appendChild(document.createTextNode("Level Up!"));
    levelUpButton.style.animation = "glow 1s infinite alternate";
    expHtml.appendChild(levelUpButton);

    levelUpButton.addEventListener("click", () => ApplyLevelUp(actor), { once: true });
  } else {
    // TODO: add a bar?
  }
}


export function OnRenderSidebarTab() {
  if (!game.user.isGM) return;
  const sidebarButtons = $("#sidebar #actors .directory-header .action-buttons");

  if (sidebarButtons.find(".award-xp").length > 0) return;
  sidebarButtons.append(`<button class="award-xp"><i class="fas fa-users"></i>Award XP</button>`)

  $("#sidebar #actors .directory-header .action-buttons .award-xp").on("click", async (event) => {
    const ExperienceApp = game.modules.get(MODULENAME).api.ExpApp;
    new ExperienceApp("Party", game.playerCharacters)?.render?.(true);
  });
}

