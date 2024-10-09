import * as settings from "./settings.mjs";
import * as perks from "./perks.mjs";
import * as actions from "./actions.mjs";
import * as skills from "./categorized-skill-system/index.mjs";


Hooks.on("init", ()=>{
  try {
    settings.register();
  } catch (e) {
    console.error("settings.register():", e);
  }

  try {
    perks.register();
  } catch (e) {
    console.error("perks.register():", e);
  }

  try {
    skills.register();
  } catch (e) {
    console.error("skills.register():", e);
  }
});

Hooks.on("ready", ()=>{
  try {
    actions.register();
  } catch (e) {
    console.error("actions.register():", e);
  }
})