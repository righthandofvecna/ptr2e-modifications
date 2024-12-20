

/** from src/scripts/config/skills.ts */
export const BaseSkills = {
  luck: {
    slug: "luck",
    favourite: true,
  },
  resources: {
    slug: "resources",
    favourite: true,
    value: 10
  },
  accounting: { slug: "accounting", group: "practical-group", label: "PTR2E.Skills.accounting.label" },
  acrobatics: { slug: "acrobatics", group: "athletics-group", label: "PTR2E.Skills.actrobatics.label" },
  appraise: { slug: "appraise", label: "PTR2E.Skills.appraise.label" },
  archaeology: { slug: "archaeology", group: "science-group", label: "PTR2E.Skills.archaeology.label" },
  painting: { slug: "painting", group: "arts-group", label: "PTR2E.Skills.arts.painting.label" },
  sculpting: { slug: "sculpting", group: "arts-group", label: "PTR2E.Skills.arts,sculpting.label" },
  acting: { slug: "acting", group: "arts-group", label: "PTR2E.Skills.arts.acting.label" },
  dancing: { slug: "dancing", group: "arts-group", label: "PTR2E.Skills.arts.dancing.label" },
  singing: { slug: "singing", group: "arts-group", label: "PTR2E.Skills.arts.singing.label" },
  "flower-arrangement": { slug: "flower-arrangement", group: "arts-group", label: "PTR2E.Skills.arts.flower-arrangement.label" },
  writing: { slug: "writing", group: "arts-group", label: "PTR2E.Skills.arts.writing.label" },
  "aura-mastery": { slug: "aura-mastery", group: "athletics-group", label: "PTR2E.Skills.aura-mastery.label" },
  climb: { slug: "climb", group: "athletics-group", label: "PTR2E.Skills.climb.label" },
  computers: { slug: "computers", group: "technology-group", label: "PTR2E.Skills.computers.label" },
  conversation: { slug: "conversation", group: "social-group", label: "PTR2E.Skills.conversation.label" },
  disguise: { slug: "disguise", group: "social-group", label: "PTR2E.Skills.disguise.label" },
  electronics: { slug: "electronics", group: "technology-group", label: "PTR2E.Skills.electronics.label" },
  engineering: { slug: "engineering", group: "technology-group", label: "PTR2E.Skills.engineering.label" },
  "fast-talk": { slug: "fast-talk", group: "social-group", label: "PTR2E.Skills.fast-talk.label" },
  flying: { slug: "flying", group: "athletics-group", label: "PTR2E.Skills.flying.label" },
  handiwork: { slug: "handiwork", group: "practical-group", label: "PTR2E.Skills.handiwork.label" },
  history: { slug: "history", label: "PTR2E.Skills.history.label" },
  husbandry: { slug: "husbandry", group: "practical-group", label: "PTR2E.Skills.husbandry.label" },
  intimidate: { slug: "intimidate", group: "social-group", label: "PTR2E.Skills.intimidate.label" },
  leadership: { slug: "leadership", group: "social-group", label: "PTR2E.Skills.leadership.label" },
  legal: { slug: "legal", label: "PTR2E.Skills.legal.label" },
  lift: { slug: "lift", group: "athletics-group", label: "PTR2E.Skills.lift.label" },
  listen: { slug: "listen", group: "wilderness-group", label: "PTR2E.Skills.wilderness.label" },
  locksmith: { slug: "locksmith", group: "practical-group", label: "PTR2E.Skills.locksmith.label" },
  mechanics: { slug: "mechanics", group: "technology-group", label: "PTR2E.Skills.mechanics.label" },
  medicine: { slug: "medicine", label: "PTR2E.Skills.medicine.label" },
  "natural-world": { slug: "natural-world", group: "wilderness-group", label: "PTR2E.Skills.natural-world.label" },
  navigate: { slug: "navigate", group: "practical-group", label: "PTR2E.Skills.navigate.label" },
  negotiation: { slug: "negotiation", group: "social-group", label: "PTR2E.Skills.negotiation.label" },
  dragon: { slug: "dragon", group: "occult-group", label: "PTR2E.Skills.occult.dragon.label" },
  fairy: { slug: "fairy", group: "occult-group", label: "PTR2E.Skills.occult.fairy.label" },
  ghost: { slug: "ghost", group: "occult-group", label: "PTR2E.Skills.occult.ghost.label" },
  psychic: { slug: "psychic", group: "occult-group", label: "PTR2E.Skills.occult.psychic.label" },
  spiritual: { slug: "spiritual", group: "occult-group", label: "PTR2E.Skills.occult.psychic.label" },
  legendary: { slug: "legendary", group: "occult-group", label: "PTR2E.Skills.occult.legendary.label" },
  paradox: { slug: "paradox", group: "occult-group", label: "PTR2E.Skills.occult.paradox.label" },
  beauty: { slug: "beauty", group: "performance-group", label: "PTR2E.Skills.beauty.label" },
  cool: { slug: "cool", group: "performance-group", label: "PTR2E.Skills.cool.label" },
  clever: { slug: "clever", group: "performance-group", label: "PTR2E.Skills.clever.label" },
  cute: { slug: "cute", group: "performance-group", label: "PTR2E.Skills.cute.label" },
  tough: { slug: "tough", group: "performance-group", label: "PTR2E.Skills.tough.label" },
  bike: { slug: "bike", group: "pilot-group", label: "PTR2E.Skills.pilot.bike.label" },
  "small-motor-vehicles": { slug: "small-motor-vehicles", group: "cars-group", label: "PTR2E.Skills.pilot.small-motor-vehicles.label" },
  cars: { slug: "cars", group: "cars-group", label: "PTR2E.Skills.pilot.cars.label" },
  "utility-vehicles": { slug: "utility-vehicles", group: "cars-group", label: "PTR2E.Skills.pilot.utility-vehicles.label" },
  "military-ground-vehicles": { slug: "military-ground-vehicles", group: "cars-group", label: "PTR2E.Skills.pilot.military-ground-vehicles.label" },
  walkers: { slug: "walkers", group: "pilot-group", label: "PTR2E.Skills.pilot.walkers.label" },
  aircraft: { slug: "aircraft", group: "aircraft-group", label: "PTR2E.Skills.pilot.aircraft.label" },
  "aerospace-vehicles": { slug: "aerospace-vehicles", group: "aircraft-group", label: "PTR2E.Skills.pilot.aerospace-vehicles.label" },
  watercraft: { slug: "watercraft", group: "pilot-group", label: "PTR2E.Skills.pilot.watercraft.label" },
  psychology: { slug: "psychology", group: "science-group", label: "PTR2E.Skills.science.psychology.label" },
  "read-lips": { slug: "read-lips", label: "PTR2E.Skills.read-lips.label" },
  research: { slug: "research", label: "PTR2E.Skills.research.label" },
  ride: { slug: "ride", group: "athletics-group", label: "PTR2E.Skills.ride.label" },
  running: { slug: "running", group: "athletics-group", label: "PTR2E.Skills.running.label" },
  astronomy: { slug: "astronomy", group: "science-group", label: "PTR2E.Skills.science.astronomy.label" },
  biology: { slug: "biology", group: "biology-group", label: "PTR2E.Skills.science.biology.label" },
  botany: { slug: "botany", group: "science-group", label: "PTR2E.Skills.science.botany.label" },
  chemistry: { slug: "chemistry", group: "chemistry-group", label: "PTR2E.Skills.science.chemistry.label" },
  cryptography: { slug: "cryptography", group: "mathematics-group", label: "PTR2E.Skills.science.cryptography.label" },
  forensics: { slug: "forensics", group: "science-group", label: "PTR2E.Skills.science.forensics.label" },
  geology: { slug: "geology", group: "science-group", label: "PTR2E.Skills.science.geology.label" },
  mathematics: { slug: "mathematics", group: "mathematics-group", label: "PTR2E.Skills.science.mathematics.label" },
  meteorology: { slug: "meteorology", group: "science-group", label: "PTR2E.Skills.science.meteorology.label" },
  paleontology: { slug: "paleontology", group: "science-group", label: "PTR2E.Skills.science.paleontology.label" },
  parapsychology: { slug: "parapsychology", group: "science-group", label: "PTR2E.Skills.science.parapsychology.label" },
  pharmacy: { slug: "pharmacy", group: "chemistry-group", label: "PTR2E.Skills.science.pharmacy.label" },
  physics: { slug: "physics", group: "science-group", label: "PTR2E.Skills.science.physics.label" },
  zoology: { slug: "zoology", group: "biology-group", label: "PTR2E.Skills.science.zoology.label" },
  eschatobiology: { slug: "eschatobiology", group: "biology-group", label: "PTR2E.Skills.science.eschatobiology.label" },
  megalobiology: { slug: "megalobiology", group: "biology-group", label: "PTR2E.Skills.science.megalobiology.label" },
  terastology: { slug: "terastology", group: "biology-group", label: "PTR2E.Skills.science.terastology.label" },
  ultrology: { slug: "ultrology", group: "biology-group", label: "PTR2E.Skills.science.ultrology.label" },
  "paradoxian-studies": { slug: "paradoxian-studies", group: "biology-group", label: "PTR2E.Skills.science.paradoxican-studies.label" },
  "sleight-of-hand": { slug: "sleight-of-hand", label: "PTR2E.Skills.sleight-of-hand.label" },
  spot: { slug: "spot", group: "wilderness-group", label: "PTR2E.Skills.spot.label" },
  stealth: { slug: "stealth", group: "wilderness-group", label: "PTR2E.Skills.stealth.label" },
  survival: { slug: "survival", group: "wilderness-group", label: "PTR2E.Skills.survival.label" },
  swim: { slug: "swim", group: "athletics-group", label: "PTR2E.Skills.swim.label" },
  teaching: { slug: "teaching", group: "social-group", label: "PTR2E.Skills.teaching.label" },
  track: { slug: "track", group: "wilderness-group", label: "PTR2E.Skills.track.label" },
}

export const BaseSkillGroups = {
  "arts-group": { slug: "arts-group", points: 20 },
  "athletics-group": { slug: "athletics-group", points: 20 },
  "social-group": { slug: "social-group", points: 20 },
  "practical-group": { slug: "practical-group", points: 20 },
  "wilderness-group": { slug: "wilderness-group", points: 20 },
  "technology-group": { slug: "technology-group", points: 20 },
  "occult-group": { slug: "occult-group", points: 20 },
  "performance-group": { slug: "performance-group", points: 20 },
  "pilot-group": { slug: "pilot-group", points: 20 },
  "cars-group": { slug: "cars-group", parentGroup: "pilot-group", points: 20 },
  "aircraft-group": { slug: "aircraft-group", parentGroup: "pilot-group", points: 20 },
  "science-group": { slug: "science-group", points: 20 },
  "biology-group": { slug: "biology-group", parentGroup: "science-group", points: 20 },
  "chemistry-group": { slug: "chemistry-group", parentGroup: "science-group", points: 20 },
  "mathematics-group": { slug: "mathematics-group", parentGroup: "science-group", points: 20 },
};