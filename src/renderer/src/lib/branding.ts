export type BrandingKind = 'logo' | 'banner' | 'background'

export interface BrandingAssets {
  logo: string | null
  banner: string | null
  background: string | null
}

export const BRANDING_EVENT = 'almohands:branding-changed'

export function fileUrl(p: string | null | undefined): string | null {
  if (!p) return null
  return 'file:///' + p.replace(/\\/g, '/')
}

export function notifyBrandingChanged(): void {
  window.dispatchEvent(new Event(BRANDING_EVENT))
}

export function onBrandingChanged(handler: () => void): () => void {
  window.addEventListener(BRANDING_EVENT, handler)
  return () => window.removeEventListener(BRANDING_EVENT, handler)
}

export function loadBranding(): Promise<BrandingAssets> {
  return window.api.branding.get()
}

export async function saveBrandingFile(kind: BrandingKind, file: File): Promise<string> {
  const path = window.api.getPathForFile(file)
  if (path) return window.api.branding.save(kind, path)
  const buf = new Uint8Array(await file.arrayBuffer())
  return window.api.branding.save(kind, Array.from(buf))
}
