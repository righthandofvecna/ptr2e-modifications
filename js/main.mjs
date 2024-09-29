import * as perks from "./perks.mjs";


Hooks.on("init", ()=>{
  perks.register();
});