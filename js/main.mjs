import * as perks from "./perks.mjs";
import * as actions from "./actions.mjs";


Hooks.on("init", ()=>{
  perks.register();
  actions.register();
});