
export const MODULENAME = "ptr2e-modifications";

export function early_isGM() {
	const level = game.data.users.find(u => u._id == game.data.userId).role;
	const gmLevel = CONST.USER_ROLES.ASSISTANT;
	return level >= gmLevel;
}

export function htmlQueryAll(parent, selectors) {
  if (!(parent instanceof Element || parent instanceof Document)) return [];
  return Array.from(parent.querySelectorAll(selectors));
}


