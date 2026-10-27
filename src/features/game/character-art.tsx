import { useState, type CSSProperties } from 'react'
import { classIcons } from '@/features/game/class-icons'
import { characterImage } from '@/features/game/character-images'
import type { CharacterClass } from '@/features/game/game-api'
import { cn } from '@/lib/cn'

/** Imagens que não carregaram (ainda não existem): guardadas para não piscar nem pedir de novo a cada render. */
const missing = new Set<string>()

function useArt(templateKey: string) {
  const [, rerender] = useState(0)
  return {
    failed: missing.has(templateKey),
    onError: () => {
      missing.add(templateKey)
      rerender((n) => n + 1)
    },
  }
}

/**
 * Retrato para os menus: a imagem ampliada a partir do topo, mostrando rosto e tronco (a cabeça fica no alto da arte).
 * `zoom` = quantas vezes a altura do quadro (2,3 ≈ cabeça e tronco; ~4 só o rosto). Sem imagem, o ícone da classe.
 */
export function CharacterPortrait({ templateKey, characterClass, zoom = 2.3, mirror, hideOnHover, className, iconClassName }: {
  templateKey: string
  characterClass: CharacterClass
  zoom?: number
  /** Inimigo: virado para a esquerda. */
  mirror?: boolean
  /** Some no hover do card (`group`) para a camada do PortraitPop entrar; o ícone de quem não tem imagem fica. */
  hideOnHover?: boolean
  className?: string
  iconClassName?: string
}) {
  const { failed, onError } = useArt(templateKey)
  const Icon = classIcons[characterClass]

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {failed ? (
        <span className="flex size-full items-center justify-center">
          <Icon className={iconClassName ?? 'size-1/2 text-silver/40'} strokeWidth={1.25} />
        </span>
      ) : (
        <img
          src={characterImage(templateKey)}
          alt=""
          draggable={false}
          loading="lazy"
          onError={onError}
          className={cn(
            'pointer-events-none absolute top-0 left-1/2 aspect-square max-w-none -translate-x-1/2 select-none',
            mirror && '-scale-x-100',
            hideOnHover && 'transition-opacity duration-300 group-hover:opacity-0',
          )}
          style={{ height: `${zoom * 100}%` }}
        />
      )}
    </span>
  )
}

/**
 * Camada do hover dos cards: o personagem de corpo inteiro, sem o recorte do card, com os pés na base dele; aparece
 * crescendo a partir da base (`group-hover`) e sai por cima e pelos lados, nunca por baixo (o que passa por baixo
 * aumentaria a altura da página). Um degradê suave atrás do texto mantém o nome e os stats legíveis.
 * Vai depois do fundo e antes do texto. Sem imagem, não mostra nada (o ícone do fundo já basta).
 */
export function PortraitPop({ templateKey }: { templateKey: string }) {
  // trata o próprio erro: sem a imagem, a camada some (não fica a moldura de imagem quebrada no hover)
  const { failed, onError } = useArt(templateKey)
  if (failed) return null

  // A camada é mais larga que o card: a imagem é quadrada (o corpo inteiro na altura do card) e mais larga que ele.
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-px -inset-x-1/2 block origin-bottom opacity-0 transition-all duration-300 ease-out-soft',
        'group-hover:scale-[1.14] group-hover:opacity-100',
        'group-focus-visible:scale-[1.14] group-focus-visible:opacity-100 motion-reduce:group-hover:scale-100',
      )}
    >
      <img
        src={characterImage(templateKey)}
        alt=""
        draggable={false}
        onError={onError}
        className="absolute bottom-0 left-1/2 aspect-square h-full max-w-none -translate-x-1/2 select-none"
      />
      <span className="absolute inset-x-1/4 bottom-0 h-1/2 bg-linear-to-t from-surface/85 via-surface/45 to-transparent" />
    </span>
  )
}

/**
 * Boneco da batalha: a imagem inteira em pé sobre uma sombra no chão, ocupando a caixa com os pés na base (quem posiciona
 * e escala é o campo, `battle-board.tsx`). O inimigo é espelhado para os
 * dois lados se encararem. Animações (index.css): respirar sempre; avançar ao agir (`attackKey`), tremer e piscar no dano
 * (`hitKey`); a mudança de chave reinicia a animação. Morto fica cinza e apagado.
 */
export function CharacterSprite({ templateKey, characterClass, side, dead, active, attackKey, hitKey, breathDelay }: {
  templateKey: string
  characterClass: CharacterClass
  side: 'PLAYER' | 'OPPONENT'
  dead?: boolean
  /** Vez dele: brilho na cor do lado. */
  active?: boolean
  /** Muda quando ele age (null = parado). */
  attackKey?: number | null
  /** Muda quando ele leva dano (null = sem dano agora). */
  hitKey?: number | null
  /** Segundos: cada unidade respira num tempo diferente. */
  breathDelay: number
}) {
  const { failed, onError } = useArt(templateKey)
  const ally = side === 'PLAYER'
  const Icon = classIcons[characterClass]

  return (
    <span className="pointer-events-none absolute inset-0 block" aria-hidden>
      {/* sombra elíptica no chão (a imagem não tem sombra) */}
      <span className="absolute bottom-0 left-1/2 h-[9%] w-[62%] -translate-x-1/2 translate-y-1/2 rounded-pill bg-[radial-gradient(closest-side,rgb(0_0_0/0.85),transparent)]" />

      <span
        key={attackKey ?? 'parado'}
        // a caixa toda, pés na base: o campo posiciona e escala (inclusive pelo `characterScale`)
        className={cn('absolute inset-0 block', attackKey != null && 'motion-safe:animate-lunge')}
        style={{ '--lunge': ally ? '28px' : '-28px' } as CSSProperties}
      >
        <span
          className={cn(
            'block size-full origin-bottom transition-[filter] duration-300',
            !dead && 'motion-safe:animate-breathe',
            active && (ally ? 'drop-shadow-[0_0_10px_var(--color-ally)]' : 'drop-shadow-[0_0_10px_var(--color-enemy)]'),
          )}
          style={{ animationDelay: `-${breathDelay}s` }}
        >
          <span key={hitKey ?? 'inteiro'} className={cn('block size-full', hitKey != null && 'motion-safe:animate-hit motion-reduce:animate-flash')}>
            {failed ? (
              <span className="flex size-full items-center justify-center">
                <Icon className={cn('size-1/3', dead ? 'text-fg-subtle/40' : ally ? 'text-silver-bright' : 'text-silver')} strokeWidth={1.5} />
              </span>
            ) : (
              <img
                src={characterImage(templateKey)}
                alt=""
                draggable={false}
                onError={onError}
                className={cn(
                  'size-full select-none object-contain object-bottom transition-[filter,opacity] duration-500',
                  !ally && '-scale-x-100',
                  dead && 'opacity-35 grayscale',
                )}
              />
            )}
          </span>
        </span>
      </span>
    </span>
  )
}
