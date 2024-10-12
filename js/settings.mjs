
import { MODULENAME } from "./utils.mjs";

export function register() {

  game.settings.register(MODULENAME, "pointsSkillBase", {
		name: "Base Skill Points",
		default: 110,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, step: 1, default: 110}),
		scope: "world",
		requiresReload: false,
		config: true,
		hint: "The base number of skill points any actor gets, human or pokemon, at level 1"
	});

  game.settings.register(MODULENAME, "pointsSkillLevel", {
		name: "Per-Level Skill Points",
		default: 10,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, default: 10}),
		scope: "world",
		requiresReload: false,
		config: true,
		hint: "The number of skill points any actor gets, human or pokemon, for each level above 1st"
	});

  game.settings.register(MODULENAME, "pointsSkillAce", {
		name: "Ace Skill Points",
		default: 290,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, default: 290}),
		scope: "world",
		requiresReload: false,
		config: true,
		hint: "The bonus number of skill points any [Ace] actor gets, human or pokemon"
	});

  game.settings.register(MODULENAME, "pointsPerkBase", {
		name: "Base Humanoid Perk Points",
		default: 20,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, step: 1, default: 20}),
		scope: "world",
		requiresReload: false,
		config: true,
		hint: "The base number of perk points any human actor gets at level 1"
	});

  game.settings.register(MODULENAME, "pointsPerkAce", {
		name: "Ace Bonus Perk Points",
		default: 0,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, step: 1, default: 0}),
		scope: "world",
		requiresReload: false,
		config: true,
		hint: "A bonus number of perk points any [Ace] actor gets at level 1 (modified by the Pokemon Perk Points Modifier for Pokemon characters)"
	});

  game.settings.register(MODULENAME, "pointsPerkPokemon", {
		name: "Pokemon Perk Points Modifier",
		default: 0.5,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, default: 0.5}),
		scope: "world",
		requiresReload: false,
		config: true,
		hint: "The modifier for number of perk points any pokemon actor gets"
	});

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