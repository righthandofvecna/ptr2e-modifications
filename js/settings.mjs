
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
		hint: `Allow users to roll status moves, as well as attacks. WARNING: this may not work. I have so far been unable to find a scenario where it doesn't work... but it's not guaranteed.`,
	});

  game.settings.register(MODULENAME, "categorizedSkills", {
		name: "Categorized Nested Skills",
		default: false,
		type: Boolean,
		scope: "world",
		requiresReload: true,
		config: false,
		hint: "Enable using categorized nested skills"
	});

	game.settings.register(MODULENAME, "maxGroupInvestment", {
		name: "Max Group Investment",
		default: 20,
		type: new foundry.data.fields.NumberField({nullable: false, min: 0, step: 1, default: 20}),
		scope: "world",
		requiresReload: true,
		config: game.settings.get(MODULENAME, "categorizedSkills"),
		hint: "The maximum points you can put in a group"
	});

	game.settings.register(MODULENAME, "useExpSystem", {
		name: "Modify Exp System",
		default: false,
		type: Boolean,
		scope: "world",
		requiresReload: true,
		config: true,
		hint: "Whether to use a level-up button and pending exp flags",
	});

	if (game.modules.get("item-piles")?.active) {
		game.settings.register(MODULENAME, "excludeItemPileFromCombat", {
			name: "Exclude Item Pile From Combat",
			default: true,
			type: Boolean,
			scope: "world",
			requiresReload: false,
			config: true,
			hint: "Whether to exclude item piles from being added to the initiative tracker when selecting and adding many tokens. Even if enabled, you can still add them individually. If you use the same actors for both combat and also as merchants configured as item piles, you may wish to disable this setting.",
		});
	}
}