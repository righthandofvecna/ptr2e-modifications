import { MODULENAME, htmlQueryAll } from "./utils.mjs";



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

  name;
  documents;
  circumstances;
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

    this.applyMode = game.settings.get(MODULENAME, "expMode");
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

    return {
      id: this.options.id,
      party,
      noteAppliesTo,
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
      .addEventListener("click", ExpApp.#addCustomCM.bind(this));

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
    return game.settings.get("ptr2e", "expCircumstanceModifiers");
  }

  async setCircumstances(newCircumstances) {
      await game.settings.set("ptr2e", "expCircumstanceModifiers", newCircumstances);
  }

  get level() {
    return (Math.ceil(this.documents.reduce((l, d) => l + actorLevel(d), 0)) ?? 1) / this.documents.length;
  }

  get ber() {
    const apl = this.level;
    return Math.floor(0.25 * (5 / 4) * (Math.pow(apl + 1, 3) - Math.pow(apl, 3)));
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

    game.settings.set("ptr2e", "expCircumstanceModifiers", [...this.circumstances, {
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
    game.settings.set("ptr2e", "expCircumstanceModifiers", this.circumstances.splice(cmIdx, 1)).then(() => this.render(false));
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
      const expAward = this.calculateExpAward(appliedExp.actor, ber, cm, apl);
      await appliedExp.actor.update({
        [`flags.${MODULENAME}.pendingXp`]: appliedExp.pending + expAward,
      });
      appliedExp.new.experience = Math.floor(appliedExp.old.experience + expAward);
      appliedExp.new.level = appliedExp.actor.system.getLevel(appliedExp.new.experience);
    }))
    await this.setCircumstances([]);

    ui.notifications.remove(notification);
    ui.notifications.info(game.i18n.localize("PTR2E.XP.Notifications.Success"));

    await CONFIG.PTR.ChatMessage.documentClass.create({
      type: "experience",
      system: {
        expBase: ber * (1 + (cm / 100)),
        expApplied: toApply,
        modifiers,
      },
    });
  }
}


function OnRenderActorSheetPTRV2(sheet, html) {
  const actor = sheet?.actor;
  if (!actor) return;

  const expHtml = html.querySelector(".sidebar .experience");
  expHtml.querySelector(".xp-current")?.remove?.();
  expHtml.querySelector(".xp-diff")?.remove?.();
  expHtml.querySelector(".xp-next")?.remove?.();

  const pendingXp = actor.getFlag(MODULENAME, "pendingXp") ?? 0
  if (pendingXp >= actor?.system?.advancement?.experience?.diff) {
    const levelUpButton = document.createElement("button", { class: "button", type: "button" });
    levelUpButton.appendChild(document.createTextNode("Level Up!"));
    levelUpButton.style.animation = "glow 1s infinite alternate";
    expHtml.appendChild(levelUpButton);

    const newXp = (actor?.system?.advancement?.experience?.current ?? 0) + pendingXp;
    levelUpButton.addEventListener("click", () => {
      return actor.update({
        "system.advancement.experience.current": newXp,
        [`flags.${MODULENAME}.pendingXp`]: 0,
      })
    });
  } else {
    // TODO: add a bar?
  }
}


function OnRenderSidebarTab() {
  if (!game.user.isGM) return;
  const sidebarButtons = $("#sidebar #actors .directory-header .action-buttons");

  if (sidebarButtons.find(".award-xp").length > 0) return;
  sidebarButtons.append(`<button class="award-xp"><i class="fas fa-users"></i>Award XP</button>`)

  $("#sidebar #actors .directory-header .action-buttons .award-xp").on("click", async (event) => {
    const ExperienceApp = game.modules.get(MODULENAME).api.ExpApp;
    new ExperienceApp("Party", game.playerCharacters)?.render?.(true);
  });
}





export function register() {
  if (!game.settings.get(MODULENAME, "useExpSystem")) return;
  if (typeof CONFIG.PTR?.Applications?.ExpApp !== "undefined") {
    CONFIG.PTR.Applications.ExpApp.DEFAULT_OPTIONS.form.handler = ExpApp.onSubmit;
    Object.defineProperty(CONFIG.PTR.Applications.ExpApp.prototype, "level", {
      get() {
        return (Math.ceil(this.documents.reduce((l, d) => l + actorLevel(d), 0)) ?? 1) / this.documents.length;
      }
    });
    Hooks.on("renderActorSheetPTRV2", OnRenderActorSheetPTRV2);
    return;
  }

  const module = game.modules.get(MODULENAME);
  module.api ??= {};
  module.api.ExpApp = ExpApp;

  Object.defineProperty(game, "playerCharacters", {
    get() {
      return game.users.filter(u => !u.isGM).map(u => u.character)
    }
  });

  game.settings.register(MODULENAME, "expMode", {
    name: "Experience Mode",
    default: "party",
    type: String,
    choices: {
      "individual": "Individual",
      "party": "Party",
      "all": "All"
    },
    scope: "world",
    requiresReload: false,
    config: true,
    hint: "Who to distribute XP to. Individual distributes it only to the individuals, Party distributes XP among the party members, and All distributes XP to party members and pokemon in the box.",
  });

  game.settings.register("ptr2e", "expCircumstanceModifiers", {
    name: "PTR2E.Settings.ExpCircumstanceModifiers.Name",
    hint: "PTR2E.Settings.ExpCircumstanceModifiers.Hint",
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });

  // add default Circumstance Modifiers
  CONFIG.PTR.data.circumstanceModifiers = {
    succeedAgainstAllOdds: {
      bonus: 20,
      label: "Succeed Against All Odds",
      groups: ["Combat", "Social", "Exploration", "Contests", "Pokeathlons"],
      hint: "<p>Succeed on a Skill Check in which you have less than 20 points invested!</p>"
    },
    captureNewSpecies: {
      bonus: 10,
      label: "Capture a New Species",
      groups: ["Combat", "Social", "Exploration", "Contests", "Pokeathlons"],
      hint: "<p>Capture a species you've never captured before.</p>"
    },

    majorNpcDefeated: {
      bonus: 200,
      label: "Major NPC Defeated",
      groups: ["Combat"],
      hint: "<p>Defeated a major NPC, such as a Gym Leader, Team Rocket Lieutenant or Rival. Feel free to increase this reward for higher-stakes fights with bosses such as Legendaries, or Elite Four members, or even Giovanni himself!</p>"
    },
    wonEncounter: {
      bonus: 50,
      label: "Won Encounter",
      groups: ["Combat"],
      hint: "<p>The players unambiguously won the encounter</p>"
    },
    thwartedEvilPlans: {
      bonus: 40,
      label: "Thwarted Evil Plans",
      groups: ["Combat"],
      hint: "<p>Think defeating a Pokemon that was terrorizing an area after Team Rocket pissed it off by attacking its young!</p><p>Or if you are the evil doers… thwarting the Forces of Good can be just as enticing…</p>"
    },
    impressiveUseOfStrategy: {
      bonus: 40,
      label: "Impressive Use of Strategy",
      groups: ["Combat"],
      hint: "<p>This can be anything like the Players using the terrain to their advantage; to impressive teamwork or even just quick thinking on the spot! Award your players for their ingenuity!</p><p>Some more examples:</p><ul><li>Defeating the Kangaskhan by having Scorbunny run around its legs with rope to take it down like an AT-AT</li><li>Destroy the nearby Water Tower to make everyone Wet and in for a Shocking Surprise.</li><li>The Stealth Rocks that Skarmory put up made it so that the Charizard couldn’t charge in against it and instead force it to come in close and fight the Seismitoad ready to fight in close-quarters with this Lizard!</li><li>You managed to allow the entire party to benefit from your Sandstorm strategy; yet they barely even have any Ground, Steel or Rock types!</li></ul>"
    },
    impressingMajorNPCs: {
      bonus: 20,
      label: "Impressing (Major) NPCs",
      groups: ["Combat"],
      hint: "<p>You may not have beaten the Elite Four member with your 3 gym badges… But they're impressed by how good you already are!</p><p>You can consider not giving the “Lost Encounter” penalty when awarding this bonus.</p>"
    },
    entertainTheCrowd: {
      bonus: 20,
      label: "Entertain The Crowd",
      groups: ["Combat"],
      hint: "<p>You really know how to give a show! The NPCs watching your fight be it Humans or Pokemon really loved watching that, or are happy and thankful you resolved the situation before it could further get out of hand.</p>"
    },
    allySaved: {
      bonus: 10,
      label: "Ally Saved",
      groups: ["Combat"],
      hint: "<p>You managed to save a Player-controlled or NPC ally; be it by reducing the damage they would receive by lowering it; making an attack miss; taking the hit yourself, or plainly removing the source of damage! Teamwork is the dreamwork!</p>"
    },
    fledEncounter: {
      bonus: 0,
      label: "Fled Encounter",
      groups: ["Combat"],
      hint: "<p>Running away is always a valid option!</p>"
    },
    destroyedPublicInfrastructure: {
      bonus: -15,
      label: "Destroyed Public Infrastructure",
      groups: ["Combat"],
      hint: "<p>You better have a good explanation for Officer Jenny…</p><p>Don't award this penalty if players received permission.</p>"
    },
    lostEncounter: {
      bonus: -30,
      label: "Lost Encounter",
      groups: ["Combat"],
      hint: "<p>Even the protagonist loses sometimes…</p>"
    },
    gruesome: {
      bonus: -30,
      label: "Gruesome",
      groups: ["Combat"],
      hint: "<p>Half the party or more fainted! Yikes. You may have bitten off a bit more than you can comfortably chew…</p>"
    },
    partyDefeat: {
      bonus: -50,
      label: "Party Defeat",
      groups: ["Combat"],
      hint: "<p>There certainly is experience to be gained in this manner… but not the type you were hoping for…</p>"
    },
    majorInfluencer: {
      bonus: 100,
      label: "Major Influencer",
      groups: ["Social"],
      hint: "<p>There certainly is experience to be gained in this manner… but not the type you were hoping for…</p>"
    },
    avoidedAFight: {
      bonus: 50,
      label: "Avoided a Fight",
      groups: ["Social"],
      hint: "<p>Wow that was gonna be scary, glad you talked your way out of it!</p><p>Only award this if the Fight was going to be challenging; talking down an angry Caterpie with your Charizard ain’t gonna award you additional EXP.</p>"
    },
    convincingStory: {
      bonus: 30,
      label: "Convincing Story",
      groups: ["Social"],
      hint: "<p>Who knows you could convince someone like that! You managed to convince someone of a fact that wasn’t… quite true, but surely it will help you achieve your goal!</p>"
    },
    veryPersuasive: {
      bonus: 30,
      label: "Very Persuasive",
      groups: ["Social"],
      hint: "<p>Sway someone to do something they didn’t originally plan to do; or didn’t agree with before, to now help you out / agree with!</p>"
    },
    whatAnArgument: {
      bonus: 30,
      label: "What an Argument!",
      groups: ["Social"],
      hint: "<p>You just made the GM stutter with how ingenious your argument was, awesome work.</p>"
    },
    awesomeRoleplay: {
      bonus: 30,
      label: "Awesome Roleplay",
      groups: ["Social"],
      hint: "<p>That was super in-character, absolutely loved it!</p>"
    },
    madeTheTableLaugh: {
      bonus: 30,
      label: "Made the Table Laugh",
      groups: ["Social"],
      hint: "<p>We’re playing games for fun right? Sometimes a Dad joke is appropriate after all…</p>"
    },
    quickWitted: {
      bonus: 30,
      label: "Quick-Witted",
      groups: ["Social"],
      hint: "<p>You handled that situation with ease despite being unprepared, or perhaps your information was incorrect? Either way, you did a great job!</p>"
    },
    offendedTheNPC: {
      bonus: -20,
      label: "Offended the NPC",
      groups: ["Social"],
      hint: "<p>You were trying to befriend them… not offend them…</p>"
    },
    findWhatYoureLookingFor: {
      bonus: 30,
      label: "Find What You're Looking For",
      groups: ["Exploration"],
      hint: "<p>You found what you were looking for.</p>"
    },
    successfulCamp: {
      bonus: 30,
      label: "Successful Camp",
      groups: ["Exploration"],
      hint: "<p>Succeed at more than half of your Camping Checks (min 1).</p>"
    },
    clearBlockedPath: {
      bonus: 30,
      label: "Clear a Blocked Path",
      groups: ["Exploration"],
      hint: ""
    },
    solvePuzzle: {
      bonus: 30,
      label: "Solve a Puzzle",
      groups: ["Exploration"],
      hint: ""
    },
    participateInSkillChallenge: {
      bonus: 30,
      label: "Participate in a Skill Challenge",
      groups: ["Exploration"],
      hint: "<p>Whether you succeed or lost; you helped move the plot forward! Succeed at a skill challenge set-up by the GM.</p>"
    },

    placeFirst: {
      bonus: 100,
      label: "Place First Overall",
      groups: ["Contests", "Pokeathlons"],
      hint: ""
    },
    placeSecond: {
      bonus: 50,
      label: "Place Second Overall",
      groups: ["Contests", "Pokeathlons"],
      hint: ""
    },
    placeThird: {
      bonus: 25,
      label: "Place Third Overall",
      groups: ["Contests", "Pokeathlons"],
      hint: ""
    },
    placeFourth: {
      bonus: -10,
      label: "Get Fourth Place or Worse Overall",
      groups: ["Contests", "Pokeathlons"],
      hint: ""
    },
    endFirst: {
      bonus: 20,
      label: "End First in the Introduction / Visual Phase",
      groups: ["Contests"],
      hint: ""
    },
    trickOpponent: {
      bonus: 20,
      label: "Trick Your Opponent",
      groups: ["Contests"],
      hint: "<p>Make your opponent Fumble through the usage of a cleverly timed move.</p>"
    },
    topPerformer: {
      bonus: 20,
      label: "Top Performer",
      groups: ["Contests"],
      hint: "<p>Score the highest amount of appeal in any round of the 'Secondary Judging' better known as the 'Moves Evaluation'</p>"
    },
    placeFirstInSection: {
      bonus: 20,
      label: "Place First in a Section of a Triathlon",
      groups: ["Pokeathlons"],
      hint: ""
    },
    derailing: {
      bonus: -20,
      label: "Derailing!",
      groups: ["Metagaming"],
      hint: "<p>Every time your players choose to actively derail the game, feel free to punish them.</p><p>Such as, if they went to explore a random tree, or went to take a nap and ignore the active quest to visit Professor Oak at his lab.</p>"
    },
    outOfCharacter: {
      bonus: -40,
      label: "Acting Significantly Out of Character",
      groups: ["Metagaming"],
      hint: "<p>Sure, breaking the fourth wall is often funny! But doing so in a way to metagame a scenario to \"win\" isn't always the best course of action. Nor the most fun!</p>"
    },
    capturingFaintedPokemon: {
      bonus: -30,
      label: "Capturing a Fainted Pokemon",
      groups: ["Metagaming"],
      hint: "<p>Many players' rationalizations after beating a Pokemon in combat is \"wait, why can't I catch this Pokemon? It's just lying there, motionless!\" Well, that goes against the \"spirit\" of the game!</p><p>Well, kind of. You can get around this by, say, nursing the fainted creature back to health, befriending it once it's awake, and capturing it properly.</p>"
    },
  }

  Hooks.on("renderActorSheetPTRV2", OnRenderActorSheetPTRV2);
  Hooks.on("renderSidebarTab", OnRenderSidebarTab);
}