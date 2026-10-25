import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type PageBannerProps = {
  /** Arte em public/art (16:9, personagem à direita). Sem o arquivo, fica só o fundo. */
  art: string
  /** object-position da arte: depende de onde está o rosto (ex.: `object-[right_top]`). */
  artPosition?: string
  /** Palavra gigante vazada no fundo. */
  outlineWord: string
  /** Linha acima do título (badge + texto em mono). */
  meta: ReactNode
  title: ReactNode
  description: ReactNode
}

/** Topo das páginas do hub: arte à direita, título enorme à esquerda. */
export function PageBanner({ art, artPosition = 'object-[right_top]', outlineWord, meta, title, description }: PageBannerProps) {
  const [artLoaded, setArtLoaded] = useState(false)

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-bg">
        <img
          src={art}
          alt=""
          onLoad={() => setArtLoaded(true)}
          onError={(e) => (e.currentTarget.hidden = true)}
          className={cn(
            'absolute inset-y-0 right-0 h-full w-full object-cover transition-opacity duration-700 ease-out-soft lg:w-3/4',
            artPosition,
            artLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
        {!artLoaded && <div className="absolute inset-0 bg-grid mask-[linear-gradient(to_bottom,black,transparent_85%)]" />}
        <div className="absolute inset-0 bg-linear-to-r from-bg via-bg/70 via-45% to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent" />
        <div className="absolute inset-0 scanlines" />
        <span className="absolute -bottom-8 -left-4 font-display text-[11rem] leading-none font-extrabold uppercase italic text-outline select-none">
          {outlineWord}
        </span>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-12 pb-12 lg:px-10 lg:pt-16">
        <div className="flex flex-wrap items-center gap-3">{meta}</div>
        <h1 className="mt-5 font-display text-6xl leading-[0.85] font-extrabold uppercase italic text-silver-bright sm:text-7xl xl:text-8xl">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-muted">{description}</p>
      </div>
    </section>
  )
}

/** Texto em mono ao lado do badge no `meta` do banner. */
export function BannerMeta({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">{children}</span>
}
