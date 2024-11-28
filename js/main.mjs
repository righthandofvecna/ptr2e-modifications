import * as settings from "./settings.mjs";
import * as actor from "./actor.mjs";
import * as perks from "./perks.mjs";
import * as actions from "./actions.mjs";
import * as clocks from "./clocks.mjs";
import * as encounter from "./encounter-building.mjs";
import * as exp from "./exp.mjs";
import * as tokenDisplay from "./token-display.mjs";
import * as tokenDrop from "./token-drop.mjs";
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
    exp.register();
  } catch (e) {
    console.error("exp.register():", e);
  }

  try {
    tokenDisplay.register();
  } catch (e) {
    console.error("tokenDisplay.register():", e);
  }

  try {
    tokenDrop.register();
  } catch (e) {
    console.error("tokenDrop.register():", e);
  }

  try {
    skills.register();
  } catch (e) {
    console.error("skills.register():", e);
  }

  try {
    actor.register();
  } catch (e) {
    console.error("actor.register():", e);
  }

  try {
    encounter.register();
  } catch (e) {
    console.error("encounter.register():", e);
  }

  try {
    clocks.register();
  } catch (e) {
    console.error("clocks.register():", e);
  }
});

Hooks.on("ready", ()=>{
  try {
    actions.register();
  } catch (e) {
    console.error("actions.register():", e);
  }
})