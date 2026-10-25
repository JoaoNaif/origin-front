import { useState } from 'react'
import { LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SectionTitle } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormationEditor } from '@/features/squads/formation-editor'
import { useCharacters, useDeleteSquad, useSquads, type Squad } from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const SQUADS_ART = '/art/lobby-ecko.jpg'

const NEW = 'novo'

export function SquadsPage() {
  const squads = useSquads()
  const characters = useCharacters()
  const [params, setParams] = useSearchParams()

  const list = squads.data ?? []
  // Sem nada na URL: o primeiro salvo, ou um novo se ainda não há nenhum
  const selectedId = params.get('id') ?? list[0]?.id ?? NEW
  const squad = list.find((s) => s.id === selectedId)
  const select = (id: string) => setParams({ id }, { replace: true })

  return (
    <div className="pb-12">
      <Banner count={squads.data?.length} />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 pt-10 lg:grid-cols-[16rem_1fr] lg:px-10">
        {/* Esquadrões salvos */}
        <aside className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">{'// '}Salvos</p>
          {squads.isPending ? (
            <div className="h-40 animate-pulse bg-raised" />
          ) : (
            <ul className="space-y-1.5">
              {list.map((s, i) => (
                <li key={s.id}>
                  <SquadTab squad={s} index={i + 1} active={s.id === selectedId} onClick={() => select(s.id)} />
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => select(NEW)}
                  aria-pressed={selectedId === NEW}
                  className={cn(
                    'focus-ring chamfer flex h-11 w-full items-center gap-2 px-3 font-display text-base font-semibold uppercase tracking-widest [--cut:8px] transition-all',
                    selectedId === NEW
                      ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.14)] [--chamfer-border:rgb(139_92_246/0.5)]'
                      : 'text-fg-muted [--chamfer-bg:transparent] [--chamfer-border:var(--color-line)] hover:text-fg hover:[--chamfer-border:var(--color-line-strong)]',
                  )}
                >
                  <Plus className="size-4" />
                  Novo esquadrão
                </button>
              </li>
            </ul>
          )}
        </aside>

        {/* Editor */}
        <section className="min-w-0 space-y-6">
          <SectionTitle index={squad ? String(list.indexOf(squad) + 1).padStart(2, '0') : '+'} actions={squad && <DeleteSquad squad={squad} onDeleted={() => setParams({}, { replace: true })} />}>
            {squad ? squad.name : 'Novo esquadrão'}
          </SectionTitle>

          {squads.isPending || characters.isPending ? (
            <div className="h-96 animate-pulse bg-raised" />
          ) : squads.isError || characters.isError ? (
            <p className="text-sm text-danger">Não foi possível carregar os esquadrões. Recarregue a página.</p>
          ) : params.get('id') && selectedId !== NEW && !squad ? (
            <p className="text-sm text-fg-muted">Esse esquadrão não existe mais.</p>
          ) : (
            // key: trocar de esquadrão recomeça o rascunho
            <FormationEditor key={selectedId} squad={squad} characters={characters.data ?? []} onCreated={(created) => select(created.id)} />
          )}
        </section>
      </div>
    </div>
  )
}

function Banner({ count }: { count?: number }) {
  return (
    <PageBanner
      art={SQUADS_ART}
      outlineWord="Formação"
      meta={
        <>
          <Badge tone="primary">
            <LayoutGrid className="size-3" />
            Coleção
          </Badge>
          {count !== undefined && (
            <BannerMeta>
              {count === 0 ? 'Nenhum esquadrão salvo' : `${count} ${count === 1 ? 'esquadrão salvo' : 'esquadrões salvos'}`}
            </BannerMeta>
          )}
        </>
      }
      title={
        <>
          Esqua
          <span className="text-gradient-primary pr-3">drões</span>
        </>
      }
      description="4 personagens na grade 3x3. Quem fica na frente segura o golpe; quem fica no fundo escolhe o alvo. A posição decide tanto quanto as skills."
    />
  )
}

function SquadTab({ squad, index, active, onClick }: { squad: Squad; index: number; active: boolean; onClick: () => void }) {
  const cells = new Set(squad.members.map((m) => `${m.row}:${m.column}`))

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'focus-ring chamfer flex w-full items-center gap-3 p-3 text-left [--cut:10px] transition-all duration-150 ease-out-soft',
        active
          ? '[--chamfer-bg:rgb(139_92_246/0.12)] [--chamfer-border:rgb(139_92_246/0.5)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:var(--color-line-strong)]',
      )}
    >
      {/* Miniatura da formação (frente à direita) */}
      <span className="grid shrink-0 grid-cols-3 gap-0.5" aria-hidden>
        {[0, 1, 2].flatMap((row) =>
          [2, 1, 0].map((column) => (
            <span key={`${row}:${column}`} className={cn('size-2', cells.has(`${row}:${column}`) ? 'bg-primary-soft' : 'bg-overlay')} />
          )),
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg leading-tight font-bold uppercase tracking-wide text-fg">{squad.name}</span>
      </span>
      <span className={cn('font-mono text-[10px]', active ? 'text-primary-soft' : 'text-fg-subtle')}>{String(index).padStart(2, '0')}</span>
    </button>
  )
}

/** Apagar pede confirmação (segundo clique). */
function DeleteSquad({ squad, onDeleted }: { squad: Squad; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const remove = useDeleteSquad()

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 className="size-3.5" />
        Apagar
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {remove.isError && <span className="text-xs text-danger">{apiErrorMessage(remove.error)}</span>}
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={remove.isPending}>
        Cancelar
      </Button>
      <Button variant="danger" size="sm" onClick={() => remove.mutate(squad.id, { onSuccess: onDeleted })} disabled={remove.isPending}>
        {remove.isPending ? 'Apagando...' : 'Confirmar'}
      </Button>
    </div>
  )
}
