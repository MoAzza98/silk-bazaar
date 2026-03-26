export const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max)

export const remap = (
  v: number, inMin: number, inMax: number,
  outMin: number, outMax: number
) => outMin + (clamp(v, inMin, inMax) - inMin) / (inMax - inMin) * (outMax - outMin)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function getSectionProgress(el: HTMLElement): number {
  const top    = el.getBoundingClientRect().top
  const height = el.offsetHeight
  const vh     = window.innerHeight
  return clamp(-top / (height - vh), 0, 1)
}
