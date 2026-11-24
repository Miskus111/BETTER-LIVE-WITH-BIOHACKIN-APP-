/**
 * The real type of an uploaded lab report, from its first bytes — the browser-declared type is only a hint and
 * a renamed file would otherwise cost an AI call and land in storage. Undefined for anything else.
 */
export type LabFileType = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp'

export function sniffLabFile(b: Uint8Array): LabFileType | undefined {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x)
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf' // %PDF-
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp' // RIFF....WEBP
  return undefined
}
