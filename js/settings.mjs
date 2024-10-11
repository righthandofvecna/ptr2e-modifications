
import { MODULENAME } from "./utils.mjs";

export function register() {
  game.settings.register(MODULENAME, "perkPrerequisites", {
		name: "Perk Prerequisite Checking",
		default: true,
		type: Boolean,
		scope: "world",
		requiresReload: true,
		config: true,
		hint: "Enable basic automated perk prerequisite checking"
	});

  game.settings.register(MODULENAME, "enableAutoStatusMoves", {
		name: "Automate Status Moves",
		default: true,
		type: Boolean,
		scope: "world",
		requiresReload: true,
		config: true,
		hint: `Allow users to roll status moves, as well as attacks. WARNING: Enabling this may entail "any amount of unforeseen consequences", including and limited to: a slightly wonky chat message. ${String.fromCodePoint(0x1F631)}`
	});

  game.settings.register(MODULENAME, "categorizedSkills", {
		name: "Categorized Nested Skills",
		default: true,
		type: Boolean,
		scope: "world",
		requiresReload: true,
		config: true,
		hint: "Enable using categorized nested skills"
	});
}