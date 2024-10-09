import * as perks from "./perks.mjs";
import * as actions from "./actions.mjs";


Hooks.on("init", ()=>{
  perks.register();
});

Hooks.on("ready", ()=>{
  try {
    actions.register();
  } catch (e) {
    console.error(e);
  }
})