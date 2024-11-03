
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


export function sluggify(text, { camel } = { camel: null }) {
	if (typeof text !== "string") {
			console.warn("Non-string argument passed to `sluggify`");
			return "";
	}

	// A hyphen by its lonesome would be wiped: return it as-is
	if (text === "-") return text;

	if (camel === null)
			return text
					.replace(lowerCaseThenUpperCaseRE, "$1-$2")
					.toLowerCase()
					.replace(/['’]/g, "")
					.replace(nonWordCharacterRE, " ")
					.trim()
					.replace(/[-\s]+/g, "-");

	if (camel === "bactrian") {
			const dromedary = sluggify(text, { camel: "dromedary" });
			return dromedary.charAt(0).toUpperCase() + dromedary.slice(1);
	}

	if (camel === "dromedary")
			return text
					.replace(nonWordCharacterHyphenOrSpaceRE, "")
					.replace(/[-_]+/g, " ")
					.replace(upperOrWordBoundariedLowerRE, (part, index) =>
							index === 0 ? part.toLowerCase() : part.toUpperCase()
					)
					.replace(/\s+/g, "");

	throw new Error(`I'm pretty sure that's not a real camel: ${camel}`);
}
