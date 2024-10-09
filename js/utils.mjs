
export const MODULENAME = "ptr2e-modifications";

export function htmlQueryAll(parent, selectors) {
  if (!(parent instanceof Element || parent instanceof Document)) return [];
  return Array.from(parent.querySelectorAll(selectors));
}


