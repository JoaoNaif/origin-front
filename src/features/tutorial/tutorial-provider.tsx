import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Compass } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { useCharacters } from '@/features/game/game-api'
import { TutorialContext, type TutorialApi, type TutorialId } from '@/features/tutorial/tutorial-context'
import { tourOrder, tutorialIcons, tutorials } from '@/features/tutorial/tutorials'
import { cn } from '@/lib/cn'

// Guarda, por conta e por navegador, que a pergunta do primeiro acesso já foi respondida (sim ou não).
const seenKey = (accountId: string) => `origin:tutorial-seen:${accountId}`

function readSeen(accountId: string) {
  try {
    return localStorage.getItem(seenKey(accountId)) === '1'
  } catch {
    // sem armazenamento: não pergunta a cada carregamento
    return true
  }
}

function markSeen(accountId: string) {
  try {
    localStorage.setItem(seenKey(accountId), '1')
  } catch {
    // sem armazenamento: só não lembra
  }
}

type Session = { id: TutorialId; step: number; tour: boolean }

/**
 * Tutoriais das telas (dentro do RequireAuth, então vale também para a batalha em tela cheia). No primeiro acesso
 * pergunta se a pessoa quer o tour; aceito, o modal passa pelas telas de `tourOrder`, navegando até cada uma.
 */
export function TutorialProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const characters = useCharacters()
  const [session, setSession] = useState<Session | null>(null)
  const [seen, setSeen] = useState(() => readSeen(accountId))

  // a ficha do tour é a do personagem de maior nível
  const firstCharacterId = useMemo(() => [...(characters.data ?? [])].sort((a, b) => b.level - a.level)[0]?.id, [characters.data])

  /** Para onde o tour leva em cada tutorial (null = fica onde está; a batalha só existe com uma partida aberta). */
  function pathOf(id: TutorialId): string | null {
    switch (id) {
      case 'lobby':
        return '/'
      case 'personagens':
        return '/personagens'
      case 'personagem':
        if (pathname.startsWith('/personagens/')) return null
        return firstCharacterId ? `/personagens/${firstCharacterId}` : null
      case 'esquadroes':
      case 'formacao':
        return '/esquadroes'
      case 'batalhar':
        return '/batalhar'
      case 'historico':
        return '/historico'
      case 'conta':
        return '/conta'
      case 'batalha':
        return null
    }
  }

  function goTo(id: TutorialId, step: number) {
    const path = pathOf(id)
    if (path && path !== pathname) navigate(path)
    setSession({ id, step, tour: true })
  }

  function answerWelcome(startTour: boolean) {
    markSeen(accountId)
    setSeen(true)
    if (startTour) goTo(tourOrder[0], 0)
    else toast.success('Sem problema', 'Quando quiser, o botão Tutorial no topo de cada tela explica como ela funciona.')
  }

  const api = useMemo<TutorialApi>(
    () => ({
      open: (id) => setSession({ id, step: 0, tour: false }),
      startTour: () => {
        markSeen(accountId)
        setSeen(true)
        setSession({ id: tourOrder[0], step: 0, tour: true })
        navigate('/')
      },
    }),
    [accountId, navigate],
  )

  // a pergunta não interrompe a batalha
  const welcomeOpen = !seen && !session && !pathname.startsWith('/batalha/')

  return (
    <TutorialContext.Provider value={api}>
      {children}
      <WelcomeDialog open={welcomeOpen} onAnswer={answerWelcome} />
      {session && (
        <TutorialDialog
          session={session}
          onStep={(step) => setSession({ ...session, step })}
          onGoTo={goTo}
          onClose={() => setSession(null)}
        />
      )}
    </TutorialContext.Provider>
  )
}

function TutorialDialog({ session, onStep, onGoTo, onClose }: {
  session: Session
  onStep: (step: number) => void
  onGoTo: (id: TutorialId, step: number) => void
  onClose: () => void
}) {
  const tutorial = tutorials[session.id]
  const { steps } = tutorial
  const step = Math.min(session.step, steps.length - 1)
  const last = step === steps.length - 1
  const tourIndex = session.tour ? tourOrder.indexOf(session.id) : -1
  const nextId = tourIndex >= 0 ? tourOrder[tourIndex + 1] : undefined
  const prevId = tourIndex > 0 ? tourOrder[tourIndex - 1] : undefined
  const bodyRef = useRef<HTMLDivElement>(null)

  // passo novo começa do topo (a rolagem é do corpo do modal)
  useEffect(() => {
    bodyRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 })
  }, [session.id, step])

  function next() {
    if (!last) return onStep(step + 1)
    if (nextId) return onGoTo(nextId, 0)
    if (session.tour) toast.success('Tour concluído', 'Reveja qualquer tela pelo botão Tutorial no topo dela, ou pela lista no Guia.')
    onClose()
  }

  function previous() {
    if (step > 0) return onStep(step - 1)
    if (prevId) onGoTo(prevId, tutorials[prevId].steps.length - 1)
  }

  const nextLabel = !last ? 'Próximo' : nextId ? `Próxima tela: ${tutorials[nextId].title}` : session.tour ? 'Concluir o tour' : 'Entendi'

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow={session.tour ? `Tour · tela ${tourIndex + 1} de ${tourOrder.length}` : 'Tutorial'}
      title={tutorial.title}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={step === 0 && !prevId} onClick={previous}>
            <ArrowLeft className="size-4" />
            Anterior
          </Button>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle tabular-nums sm:block">
            Passo {step + 1} de {steps.length}
          </span>
          <Button size="sm" onClick={next}>
            {nextLabel}
            {last && !nextId ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
          </Button>
        </div>
      }
    >
      <div ref={bodyRef} className="min-h-104 space-y-6">
        {session.tour && <TourTrack current={tourIndex} />}
        <ol className="flex flex-wrap gap-1.5">
          {steps.map(({ title }, index) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => onStep(index)}
                aria-current={index === step ? 'step' : undefined}
                aria-label={`Passo ${index + 1}: ${title}`}
                title={title}
                className={cn(
                  'focus-ring flex h-6 w-8 items-center justify-center rounded-control border font-mono text-[10px] tabular-nums transition-colors',
                  index === step
                    ? 'border-primary-soft bg-primary/25 text-silver-bright'
                    : index < step
                      ? 'border-primary-soft/40 text-primary-soft'
                      : 'border-line text-fg-subtle hover:border-line-strong',
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            </li>
          ))}
        </ol>
        <section key={`${session.id}-${step}`} className="animate-fade-in space-y-5">
          <h3 className="font-display text-2xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{steps[step].title}</h3>
          {steps[step].content}
        </section>
      </div>
    </Dialog>
  )
}

/** Trilha do tour: as telas que já foram, a atual e as que faltam. */
function TourTrack({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-line/60 pb-4" aria-label="Telas do tour">
      {tourOrder.map((id, i) => {
        const Icon = tutorialIcons[id]
        return (
          <li key={id} className="flex items-center gap-1">
            <span
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
                i === current ? 'bg-primary/20 text-silver-bright' : i < current ? 'text-primary-soft' : 'text-fg-subtle',
              )}
            >
              {i < current ? <Check className="size-3" /> : <Icon className="size-3" />}
              <span className={cn(i !== current && 'hidden md:inline')}>{tutorials[id].title}</span>
            </span>
            {i < tourOrder.length - 1 && <span className="h-px w-3 bg-line-strong" />}
          </li>
        )
      })}
    </ol>
  )
}

/** Pergunta do primeiro acesso: quer o tour? Fechar (Esc, X, fora) conta como "agora não". */
function WelcomeDialog({ open, onAnswer }: { open: boolean; onAnswer: (startTour: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onClose={() => onAnswer(false)}
      size="sm"
      eyebrow="Bem-vindo ao Origin"
      title="Primeira vez aqui?"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onAnswer(false)}>
            Agora não
          </Button>
          <Button size="sm" onClick={() => onAnswer(true)}>
            <Compass className="size-4" />
            Começar o tour
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-fg-muted">
          Um tour rápido passa pelas telas principais e explica cada parte delas, do elenco até a batalha.
        </p>
        <ol className="space-y-1.5">
          {tourOrder.map((id, i) => {
            const Icon = tutorialIcons[id]
            return (
              <li key={id} className="flex items-center gap-3">
                <span className="w-5 font-mono text-[10px] text-primary-soft tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <Icon className="size-3.5 text-fg-subtle" />
                <span className="font-display text-sm font-bold uppercase tracking-wide text-fg">{tutorials[id].title}</span>
              </li>
            )
          })}
        </ol>
        <p className="text-xs leading-relaxed text-fg-subtle">
          Pode ver depois também: cada tela tem o botão <span className="text-fg-muted">Tutorial</span> no topo, e o Guia lista todos.
        </p>
      </div>
    </Dialog>
  )
}
