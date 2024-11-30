import { MODULENAME } from "./utils.mjs";

function Token_prepareSize(wrapper, token) {
  const type = token?.actor?.type;
  if (!type) return wrapper(token);
  if (type === "humanoid" && !game.settings.get(MODULENAME, "disableSmallHumanoidTokens")) return wrapper(token);
  if (type === "pokemon" && !game.settings.get(MODULENAME, "disableSmallPokemonTokens")) return wrapper(token);

  const { width, height } = token;
  const { scaleX, scaleY } = token.texture;
  wrapper(token);
  if (token.flags.ptr2e.linkToActorSize && token.actor) {
    if (token.width < width) token.width = width;
    if (token.height < height) token.height = height;
  }
  if (game.ptr.settings.tokens.autoscale && token.flags.ptr2e.autoscale) {
    if (token.texture.scaleX < scaleX) token.texture.scaleX = scaleX;
    if (token.texture.scaleY < scaleY) token.texture.scaleY = scaleY;
  }
}


export function register() {
  libWrapper.register(MODULENAME, "CONFIG.PTR.Token.documentClass.prepareSize", Token_prepareSize, "WRAPPER");
}