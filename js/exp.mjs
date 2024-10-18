import { MODULENAME } from "./utils.mjs";


function xpToReachLevel(level, isHumanoid) {
  if (isHumanoid) {
    return Math.ceil((5 * Math.pow(Math.min(level, 100), 3)) / 4);
  }
  return Math.ceil((3 * Math.pow(Math.min(level, 100), 3)) / 6)
}

export class ExpApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {//ApplicationV2Expanded) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      tag: "form",
      classes: ["ptr2e", "sheet", "xp-sheet"],
      position: {
        height: 'auto',
        width: 325,
      },
      window: {
        minimizable: true,
        resizable: false,
      },
      form: {
        submitOnChange: false,
        closeOnSubmit: true,
        handler: ExpApp.#onSubmit,
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

  name;
  documents;
  circumstances;

  constructor(name, documents, options = {}) {
    options.id = `exp-${documents.length ? documents[0].id || fu.randomID() : fu.randomID()}`;
    super(options);
    this.name = name;
    this.documents = documents;
    this.circumstances = [];

    if (this.level < 10) {
      this.circumstances.push({
        name: "Baby's First Steps",
        bonus: 100,
      })
    }
  }

  async _prepareContext() {
    const party = this.documents.map(a=>({
        img: a.img,
        name: a.name,
        uuid: a.uuid,
    }));

    const cm = this.circumstances.map(c=>`${c.name}: ${c.bonus}`);

    const ber = this.ber;
    const modifier = `+${this.modifier}%`;
    const total = this.total;

    return {
        id: this.options.id,
        party,
        modifier,
        cm,
        ber,
        total,
    };
  }

  get title() {
    return `${this.name} - ${game.i18n.localize("PTR2E.XP.title")}`;
  }

  get level() {
    return Math.ceil(this.documents.reduce((l, d) => {
      const xp = (d?.system?.advancement?.experience?.current ?? 1) + (d.getFlag(MODULENAME, "pendingXp") ?? 0);
      const level = (()=>{
        if (d?.isHumanoid?.()) {
          return Math.clamp(Math.floor(Math.cbrt(((xp || 1) * 4) / 5)), 1, 100);
        }
        return Math.clamp(Math.floor(Math.cbrt(((xp || 1) * 6) / 3)), 1, 100);
      })() ?? 1;
      return l + level;
    }, 0) / this.documents.length)
  }

  get ber() {
    const avgLevel = this.level;
    const isHumanoid = this.documents.some(c => c?.isHumanoid?.())
    return Math.floor((xpToReachLevel(avgLevel + 1, isHumanoid) - xpToReachLevel(avgLevel, isHumanoid)) / 4);
  }

  get modifier() {
    return this.circumstances.reduce((m, c)=>m + (c.bonus ?? 0), 0);
  }

  get total() {
    return Math.floor(this.ber * ((100 + this.modifier) / 100));
  }

  static getNestedFolderContents(folder) {
    let contents = new Set(folder.contents);
    for (const subfolder of folder.children) {
      contents = contents.union(ExpApp.getNestedFolderContents(subfolder.folder));
    }
    return contents;
  }

  static async #onSubmit() {
    const total = this.total;

    const toApply = (()=>{
      // do only the owner and party if XP All is not set

      // do this if XP All is set
      let docs = new Set(this.documents);
      for (const owner of this.documents) {
        if (owner.folder.owner == "") continue;
        docs = docs.union(ExpApp.getNestedFolderContents(owner.folder));
      }
      return docs;
    })();

    console.log("apply to all", toApply);

    const notification = ui.notifications.info(game.i18n.localize("PTR2E.XP.Notifications.Info"));

    await Promise.all(toApply.map((d)=>{
      const pendingXp = d.getFlag(MODULENAME, "pendingXp") ?? 0; 
      return d.setFlag(MODULENAME, "pendingXp", pendingXp + total);
    }))

    ui.notifications.remove(notification);
    ui.notifications.info(game.i18n.localize("PTR2E.XP.Notifications.Success"));
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
    levelUpButton.addEventListener("click", ()=>{
      return actor.update({
        "system.advancement.experience.current": newXp,
        [`flags.${MODULENAME}.pendingXp`]: 0,
      })
    });
  } else {
    // TODO: add a bar?
  }
}





export function register() {
  const module = game.modules.get(MODULENAME);
  module.api ??= {};
  module.api.ExpApp = ExpApp;

  Object.defineProperty(game, "playerCharacters", {
    get() {
      return game.users.filter(u => !u.isGM).map(u => u.character)
    }
  });

  Hooks.on("renderActorSheetPTRV2", OnRenderActorSheetPTRV2);
}