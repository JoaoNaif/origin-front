import { useState, type ReactNode } from 'react'
import { TutorialButton } from '@/features/tutorial/tutorial-button'
import type { TutorialId } from '@/features/tutorial/tutorial-context'
import { cn } from '@/lib/cn'

type PageBannerProps = {
  /** Arte em public/art (16:9, personagem à direita). Sem o arquivo, fica só o fundo. */
  art: string
  /** Palavra gigante vazada no fundo. */
  outlineWord: string
  /** Linha acima do título (badge + texto em mono). */
  meta: ReactNode
  title: ReactNode
  description: ReactNode
  /** Tutorial da tela: o botão "Tutorial" ao lado do meta. */
  tutorial?: TutorialId
}

/**
 * Topo das páginas do hub: arte à direita, título enorme à esquerda. A arte aparece inteira (altura do banner, largura
 * na proporção dela, colada à direita); em tela estreita sobra para a esquerda, que é a parte vazia da arte.
 */
export function PageBanner({ art, outlineWord, meta, title, description, tutorial }: PageBannerProps) {
  const [artLoaded, setArtLoaded] = useState(false)

  return (
    <section className="relative isolate flex min-h-104 items-center overflow-hidden border-b border-line lg:min-h-128 2xl:min-h-144">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-bg">
        <BannerArt src={art} loaded={artLoaded} onLoad={() => setArtLoaded(true)} />
        {!artLoaded && <div className="absolute inset-0 bg-grid mask-[linear-gradient(to_bottom,black,transparent_85%)]" />}
        {/* só o necessário para o texto ficar legível: a arte fica limpa da metade para a direita */}
        <div className="absolute inset-0 bg-linear-to-r from-bg via-bg/60 via-30% to-transparent to-60%" />
        <div className="absolute inset-0 bg-linear-to-t from-bg to-transparent to-20%" />
        <div className="absolute inset-0 scanlines" />
        <span className="absolute -bottom-8 -left-4 font-display text-[11rem] leading-none font-extrabold uppercase italic text-outline select-none">
          {outlineWord}
        </span>
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          {meta}
          {tutorial && <TutorialButton id={tutorial} />}
        </div>
        <h1 className="mt-5 font-display text-6xl leading-[0.85] font-extrabold uppercase italic text-silver-bright sm:text-7xl xl:text-8xl">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-muted">{description}</p>
      </div>
    </section>
  )
}

/**
 * Arte 16:9 inteira, sem recorte: altura do pai, largura na proporção, colada à direita. A borda esquerda some no fundo
 * (a arte pode ser mais estreita que o banner).
 */
export function BannerArt({ src, loaded, onLoad, className }: { src: string; loaded: boolean; onLoad: () => void; className?: string }) {
  return (
    <div className={cn('absolute inset-y-0 right-0 transition-opacity duration-700 ease-out-soft', loaded ? 'opacity-100' : 'opacity-0', className)}>
      <img src={src} alt="" onLoad={onLoad} onError={(e) => (e.currentTarget.hidden = true)} className="block h-full w-auto max-w-none" />
      <div className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-bg to-transparent" />
    </div>
  )
}

/** Texto em mono ao lado do badge no `meta` do banner. */
export function BannerMeta({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">{children}</span>
}
