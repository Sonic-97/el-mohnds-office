import { useEffect, useState } from 'react'
import { Compass } from 'lucide-react'
import { fileUrl, loadBranding, onBrandingChanged } from '../lib/branding'

interface LogoProps {
  size?: number
  className?: string
}

export default function Logo({ size = 48, className = '' }: LogoProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const b = await loadBranding()
      if (!cancelled) {
        setSrc(fileUrl(b.logo) ?? '/logo.png')
        setFailed(false)
      }
    }
    load()
    const off = onBrandingChanged(load)
    return () => {
      cancelled = true
      off()
    }
  }, [])

  if (failed || !src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-navy-900 rounded-xl flex items-center justify-center ring-2 ring-gold-500 ${className}`}
      >
        <Compass style={{ width: size * 0.55, height: size * 0.55 }} className="text-gold-400" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="المهندس"
      style={{ width: size, height: size }}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
