import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Package, Sparkles, Store, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { Dialog } from '@/components/ui/dialog'
import { rarityOrder, useChests, useOpenChest, type Chest, type OpenChestResult } from '@/features/economy/economy-api'
import { rarityTone } from '@/features/economy/economy-labels'
import { ChestArt, Coins, FragmentDeltaList, RarityTag } from '@/features/economy/economy-ui'
import { WalletBar } from '@/features/economy/wallet-bar'
import { CharacterPortrait } from '@/features/game/character-art'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, useTemplates, type Template } from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const CHESTS_ART = '/art/banner-baus.jpg'

/** Tempo mínimo do baú tremendo antes de mostrar o que saiu (o servidor responde rápido demais para ter suspense). */
const SUSPENSE_MS = 1100

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Baús fechados da conta (comprados no Mercado ou caídos na batalha) e a abertura de cada um. */
export function ChestsPage() {
  const chests = useChests()
  const [opening, setOpening] = useState<Chest | null>(null)

  // do nível mais alto para o mais baixo; no mesmo nível, o mais antigo primeiro (a ordem do servidor)
  const sorted = useMemo(
    () => [...(chests.data ?? [])].sort((a, b) => rarityOrder.indexOf(b.tier) - rarityOrder.indexOf(a.tier)),
    [chests.data],
  )

  return (
    <div className="pb-12">
      <PageBanner
        art={CHESTS_ART}
        tutorial="baus"
        outlineWord="Baús"
        meta={
          <>
            <Badge tone="primary">
              <Package className="size-3" />
              Economia
            </Badge>
            {chests.data && (
              <BannerMeta>
                {chests.data.length} {chests.data.length === 1 ? 'baú fechado' : 'baús fechados'}
              </BannerMeta>
            )}
          </>
        }
        title={
          <>
            Ba
            <span className="text-gradient-primary pr-3">ús</span>
          </>
        }
        description="Cada baú traz um item da raridade sorteada, um personagem novo ou moeda, e alguns fragmentos."
      />

      <Page className="pt-10 lg:pt-10">
        <WalletBar />

        {chests.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-64 animate-pulse bg-raised" />
            ))}
          </div>
        ) : chests.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar os baús. Recarregue a página.</p>
        ) : sorted.length === 0 ? (
          <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
            <ChestArt tier="E" className="h-16 w-20 opacity-60" />
            <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Nenhum baú fechado</p>
            <p className="max-w-md text-sm text-fg-muted">Compre no Mercado com a moeda das batalhas. Às vezes um baú cai no fim da batalha.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link to="/mercado" className={buttonClasses({ size: 'sm' })}>
                <Store className="size-4" /> Ir ao Mercado
              </Link>
              <Link to="/batalhar" className={buttonClasses({ size: 'sm', variant: 'secondary' })}>
                <Swords className="size-4" /> Batalhar
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.map((chest) => (
              <li key={chest.id}>
                <ChestCard chest={chest} onOpen={() => setOpening(chest)} />
              </li>
            ))}
          </ul>
        )}
      </Page>

      {opening && (
        <OpenChestDialog
          // key: abrir o próximo recomeça a animação
          key={opening.id}
          chest={opening}
          next={sorted.find((c) => c.id !== opening.id) ?? null}
          onNext={setOpening}
          onClose={() => setOpening(null)}
        />
      )}
    </div>
  )
}

function ChestCard({ chest, onOpen }: { chest: Chest; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-ring chamfer group flex w-full flex-col items-center p-5 text-center [--chamfer-bg:var(--color-surface)] [--cut:16px] transition-all hover:[--chamfer-bg:var(--color-raised)]"
      style={{ '--chamfer-border': `color-mix(in srgb, ${rarityTone[chest.tier].color} 40%, transparent)` } as React.CSSProperties}
    >
      <span className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
        <span>{chest.source === 'BATTLE' ? 'Da batalha' : 'Comprado'}</span>
        <span className="tabular-nums">{dateFormat.format(new Date(chest.createdAt))}</span>
      </span>
      <ChestArt tier={chest.tier} className="my-4 h-24 w-28 transition-transform duration-200 ease-out-soft group-hover:-translate-y-1" />
      <span className="font-display text-2xl font-bold uppercase tracking-wide text-silver-bright">
        Baú <span className={rarityTone[chest.tier].text}>{chest.tier}</span>
      </span>
      <span className="mt-3 inline-flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-primary-soft">
        Abrir <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

function OpenChestDialog({ chest, next, onNext, onClose }: {
  chest: Chest
  next: Chest | null
  onNext: (chest: Chest) => void
  onClose: () => void
}) {
  const open = useOpenChest()
  const templates = useTemplates()
  const [result, setResult] = useState<OpenChestResult | null>(null)
  // uma abertura por baú (o pai troca a key), mesmo com o efeito rodando duas vezes no StrictMode: a segunda daria
  // 400 "já aberto"
  const started = useRef(false)

  // abre ao montar; o resultado só aparece depois do suspense mínimo
  useEffect(() => {
    if (started.current) return
    started.current = true
    const at = Date.now()
    open.mutate(chest.id, {
      onSuccess: (data) => setTimeout(() => setResult(data), Math.max(0, SUSPENSE_MS - (Date.now() - at))),
    })
  }, [chest.id, open])

  const contents = result?.chest.contents
  const busy = !result && !open.isError

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      size="sm"
      eyebrow={chest.source === 'BATTLE' ? 'Baú da batalha' : 'Baú comprado'}
      title={`Baú ${chest.tier}`}
      footer={
        !busy && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
            {next && result && (
              <Button size="sm" onClick={() => onNext(next)}>
                <Package className="size-4" /> Abrir o próximo (Baú {next.tier})
              </Button>
            )}
          </div>
        )
      }
    >
      {open.isError ? (
        <p className="text-sm text-danger">{apiErrorMessage(open.error)}</p>
      ) : !contents ? (
        <div className="flex flex-col items-center gap-4 py-6" aria-live="polite">
          <ChestArt tier={chest.tier} className="h-28 w-32 motion-safe:animate-chest-shake" />
          <p className="animate-pulse font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">Abrindo...</p>
        </div>
      ) : (
        <Reveal result={result!} templates={templates.data} />
      )}
    </Dialog>
  )
}

function Reveal({ result, templates }: { result: OpenChestResult; templates?: Template[] }) {
  const contents = result.chest.contents!
  const templateKey = contents.character?.templateKey ?? contents.convertedTemplateKey
  const template = templates?.find((t) => t.key === templateKey)
  const tone = rarityTone[contents.rarity]
  const isNew = !!contents.character
  const Icon = template ? classIcons[template.characterClass] : Sparkles

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex flex-col items-center text-center motion-safe:animate-reveal">
        <div
          className="relative flex size-36 items-center justify-center overflow-hidden border-2 bg-bg"
          style={{ borderColor: tone.color, boxShadow: `0 0 40px -8px ${tone.color}` }}
        >
          <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 50% 30%, ${tone.color}, transparent 70%)` }} />
          {template ? (
            <CharacterPortrait
              templateKey={template.key}
              characterClass={template.characterClass}
              zoom={1.6}
              className={cn('relative size-full', !isNew && 'grayscale')}
              iconClassName="size-14 text-silver/60"
            />
          ) : (
            <Coins value={contents.coins} className="relative text-2xl font-bold text-silver-bright" iconClassName="size-6" />
          )}
        </div>

        <p className="mt-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
          Raridade <RarityTag rarity={contents.rarity} />
        </p>

        {isNew && template ? (
          <>
            <p className={cn('mt-2 font-display text-4xl leading-none font-extrabold uppercase italic', tone.text)}>{template.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
              <Icon className="size-4" /> {classLabels[template.characterClass]}
            </p>
            <Badge tone="success" className="mt-3">
              <Sparkles className="size-3" /> Novo no elenco
            </Badge>
          </>
        ) : template ? (
          <>
            <p className="mt-2 font-display text-3xl leading-none font-extrabold uppercase italic text-fg-muted">{template.name}</p>
            <p className="mt-2 text-sm text-fg-muted">
              Você já tem esse personagem: virou <Coins value={contents.coins} className="text-fg" />.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">
            Nenhum personagem de raridade {contents.rarity} disponível: virou <Coins value={contents.coins} className="text-fg" />.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-line pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Também veio</p>
        <FragmentDeltaList fragments={contents.fragments} className="justify-center" />
      </div>

      {result.character && (
        <Link to={`/personagens/${result.character.id}`} className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'w-full' })}>
          Ver a ficha de {result.character.name}
        </Link>
      )}
    </div>
  )
}
