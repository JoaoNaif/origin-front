import type { CSSProperties } from 'react'
import { ChevronRight, Lock, PawPrint } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBeasts } from '@/features/beasts/beast-api'
import { beastGradeColors } from '@/features/beasts/beast-labels'
import { BeastEmblem, BeastGradeTag, ContractTag } from '@/features/beasts/beast-ui'
import type { Character } from '@/features/game/game-api'

/**
 * Bestas na ficha (D154): as com contrato e o slot da build que a invocação toma na batalha. Firmar, trocar o slot e
 * desfazer ficam na página Bestas.
 */
export function CharacterBeastsPanel({ character }: { character: Character }) {
  const beasts = useBeasts()
  const list = character.beasts ?? []
  const first = character.name.split(' ')[0]

  if (list.length === 0) {
    return (
      <div className="hud-corners flex flex-wrap items-center gap-4 border border-line/60 bg-surface/40 px-5 py-5 [--hud-color:var(--color-line-strong)]">
        <span className="chamfer flex size-14 items-center justify-center [--chamfer-bg:var(--color-bg)] [--chamfer-border:var(--color-line)] [--cut:9px]">
          <PawPrint className="relative size-5 text-fg-subtle" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold uppercase tracking-wide text-fg">Sem besta</p>
          <p className="text-sm text-fg-muted">
            Com uma besta na conta, firme o contrato com {first}: a invocação toma um slot da build e ela luta do seu lado.
          </p>
        </div>
        <Link to="/bestas" className="focus-ring font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle transition-colors hover:text-primary-soft">
          Ver bestas →
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {list.map((b) => {
        const skill = character.skills.find((s) => s.buildSlot === b.slot)
        const req = beasts.data?.find((x) => x.id === b.id)?.requirementsWithHolder
        return (
          <li key={b.id}>
            <Link
              to={`/bestas?besta=${b.id}`}
              style={{ '--tone': beastGradeColors[b.grade] } as CSSProperties}
              className="focus-ring chamfer group flex items-center gap-4 p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_40%,transparent)] [--cut:14px] transition-all hover:[--chamfer-border:var(--tone)]"
            >
              <BeastEmblem grade={b.grade} contract={b.contract} size="lg" />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display text-xl leading-none font-extrabold uppercase italic text-silver-bright">{b.name}</span>
                  <BeastGradeTag grade={b.grade} />
                </span>
                <ContractTag contract={b.contract} />
                <span className="block text-xs text-fg-muted">
                  Invocação no <b className="font-mono text-beast">slot {b.slot}</b>
                  {skill && (
                    <>
                      , no lugar de <span className="text-fg">{skill.name}</span>
                    </>
                  )}
                  .
                </span>
                {req && !req.meets && (
                  <span className="flex items-center gap-1.5 text-xs text-danger-hover">
                    <Lock className="size-3.5" /> Requisitos do Mestre em falta: a batalha não começa.
                  </span>
                )}
              </span>
              <ChevronRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary-soft" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
