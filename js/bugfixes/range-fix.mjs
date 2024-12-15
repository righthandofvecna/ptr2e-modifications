import { MODULENAME } from "../utils.mjs";

// CONFIG.Item.dataModels.move.schema.fields.actions.element.types.attack.model.prototype.getRangeIncrement
function Attack_getRangeIncrement(distance, size) {
  console.log("Attack_getRangeIncrement", arguments);

  if (
    distance === null ||
    !this.range ||
    !["ally", "enemy", "creature", "object"].includes(this.range.target)
  )
    return null;
  const dangerClose = !!this.traits.get("danger-close");

  const reach = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 1,
      5: 2,
      6: 3,
      7: 4,
      8: 5
  }[size.rank] ?? 1;
  
  const rangeSizeMultiplier = {
      0: 1,
      1: 1,
      2: 1,
      3: 1,
      4: 1.1,
      5: 1.2,
      6: 1.3,
      7: 1.4,
      8: 1.5
  }[size.rank] ?? 1;

  if (this.range.distance <= 1) return distance > reach ? Infinity : 0;

  const attackRange = this.range.distance * rangeSizeMultiplier;
  const rangeIncrement = Math.max(Math.ceil(distance / attackRange), 1) - 1;
  return dangerClose
    ? rangeIncrement == 0
      ? -Infinity
      : rangeIncrement - 1
    : rangeIncrement;
}


function _get3DSteps(c1, c2) {
  let dx = Math.abs(c1.i - c2.i);
  let dy = Math.abs(c1.j - c2.j);
  let dz = Math.abs(c1.e - c2.e);

  let totalDiagonalSteps = Math.min(dx, dy, dz);
  dx -= totalDiagonalSteps;
  dy -= totalDiagonalSteps;
  dz -= totalDiagonalSteps;

  let diagonalStepsXY = Math.min(dx, dy);
  dx -= diagonalStepsXY;
  dy -= diagonalStepsXY;

  let diagonalStepsXZ = Math.min(dx, dz);
  dx -= diagonalStepsXZ;
  dz -= diagonalStepsXZ;

  let diagonalStepsYZ = Math.min(dy, dz);
  dy -= diagonalStepsYZ;
  dz -= diagonalStepsYZ;

  let remainingDiagonalSteps = diagonalStepsXY + diagonalStepsXZ + diagonalStepsYZ;
  let straightSteps = dx + dy + dz;

  return {
      /** 3D Diagonals */
      doubleDiagonals: totalDiagonalSteps,
      /** 2D Diagonals */
      diagonals: remainingDiagonalSteps,
      /** Straights */
      straights: straightSteps,
  };
}

// CONFIG.PTR.Grid.square.prototype.getDistanceBetweenTokens
function Grid_getDistanceBetweenTokens(t1, t2) {
  console.log("Grid_getDistanceBetweenTokens", t1, t2);

  // find the elevation/height differential between the tokens
  const dz = (()=>{
    if (t1.elevation == t2.elevation) return 0;
    if (t1.elevation < t2.elevation) {
      return Math.max(0, t2.elevation - t1.elevation - Math.max(t1.w, t1.h));
    }
    return Math.max(0, t1.elevation - t2.elevation - Math.max(t2.w, t2.h));
  })();

  // find the x differential between the tokens
  const dx = (()=>{
    if (t1.x == t2.x) return 0;
    if (t1.x < t2.x) {
      return Math.max(0, t2.x - t1.x - t1.w);
    }
    return Math.max(0, t1.x - t2.x - t2.w);
  })();

  // find the y differential between the tokens
  const dy = (()=>{
    if (t1.y == t2.y) return 0;
    if (t1.y < t2.y) {
      return Math.max(0, t2.y - t1.y - t1.h);
    }
    return Math.max(0, t1.y - t2.y - t2.h);
  })();

  // return Math.sqrt(dx**2 + dy**2 + dz**2) / this.size; // is this just better?

  const getDistance = (c1, c2) => {
      const measurements = _get3DSteps(c1, c2);
      return (
          (measurements.doubleDiagonals * Math.sqrt(3) +
              measurements.diagonals * Math.sqrt(2) +
              measurements.straights) *
          this.distance
      );
  };
  return getDistance({ i: 0, j: 0, e: 0 }, { i: dx, j: dy, e: dz }) / this.size;
}


export function register() {
  libWrapper.register(MODULENAME, "CONFIG.Item.dataModels.move.schema.fields.actions.element.types.attack.model.prototype.getRangeIncrement", Attack_getRangeIncrement, "OVERRIDE");
  libWrapper.register(MODULENAME, "CONFIG.PTR.Grid.square.prototype.getDistanceBetweenTokens", Grid_getDistanceBetweenTokens, "OVERRIDE");
}