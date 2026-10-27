import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { AtSign, Check, KeyRound, Loader2, Lock, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Page, PageHeader, SectionTitle } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { accountInitials, authErrorMessage, useLogout, useMe, useUpdateAccount, type Account } from '@/features/auth/auth-api'
import { FormAlert } from '@/features/auth/auth-layout'
import { useBattles, useCharacters, useSquads } from '@/features/game/game-api'
import { battleOutcome } from '@/features/game/game-labels'
import { apiErrorMessage, httpStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

// Minha conta (PATCH /me): nome exibido e senha. O username e o papel não mudam pela API.

// Mesmas regras do backend: nome 2 a 30, senha 8 a 72
const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(30, 'Máximo de 30 caracteres'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(8, 'Mínimo de 8 caracteres').max(72, 'Máximo de 72 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha nova'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'A senha nova é igual à atual',
  })

type ProfileForm = z.input<typeof profileSchema>
type ProfileData = z.output<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function AccountPage() {
  const { data: account } = useMe()

  return (
    <Page>
      <PageHeader eyebrow="Conta" title="Minha conta" description="Seu perfil, sua senha e seu registro de combate." />

      {/* O AppShell só aparece com a conta carregada (RequireAuth) */}
      {account && (
        <>
          <Identity account={account} />

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-5">
              <SectionTitle index="01">Perfil</SectionTitle>
              <ProfileSection account={account} />
            </section>

            <section className="space-y-5">
              <SectionTitle index="02">Senha</SectionTitle>
              <PasswordSection username={account.username} />
            </section>
          </div>

          <section className="space-y-5">
            <SectionTitle index="03">Sessão</SectionTitle>
            <SessionSection />
          </section>
        </>
      )}
    </Page>
  )
}

/** Cartão do jogador: avatar, nome, papel e os números da conta. */
function Identity({ account }: { account: Account }) {
  const characters = useCharacters()
  const squads = useSquads()
  const battles = useBattles()

  const finished = battles.data?.filter((b) => b.status === 'FINISHED') ?? []
  const wins = finished.filter((b) => battleOutcome(b) === 'WIN').length
  const rate = finished.length ? Math.round((wins / finished.length) * 100) : null
  const topLevel = characters.data?.length ? Math.max(...characters.data.map((c) => c.level)) : null

  return (
    <div className="relative overflow-hidden border border-line bg-gradient-surface">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-pill bg-gradient-glow opacity-60" />

      <div className="relative flex flex-wrap items-center gap-6 p-6 lg:p-8">
        <span className="chamfer flex size-20 shrink-0 items-center justify-center font-display text-3xl font-extrabold text-primary-soft shadow-glow [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(139_92_246/0.6)] [--cut:14px]">
          {accountInitials(account.displayName)}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <span className="size-1.5 rounded-pill bg-success" /> Conectado
            </Badge>
            {account.role === 'ADMIN' && (
              <Badge tone="primary">
                <ShieldCheck className="size-3" /> Admin
              </Badge>
            )}
          </div>
          <p className="truncate font-display text-4xl font-extrabold uppercase italic leading-none tracking-wide text-silver-bright sm:text-5xl">
            {account.displayName}
          </p>
          <p className="font-mono text-sm text-fg-subtle">@{account.username}</p>
        </div>
      </div>

      {/* gap-px sobre a cor da linha = divisórias entre os números */}
      <dl className="relative grid grid-cols-2 gap-px border-t border-line/70 bg-line/70 sm:grid-cols-4">
        <Figure label="Personagens" value={characters.data?.length} detail={topLevel != null ? `maior nível ${topLevel}` : undefined} to="/personagens" />
        <Figure label="Esquadrões" value={squads.data?.length} to="/esquadroes" />
        <Figure label="Combates" value={battles.data ? finished.length : undefined} detail={`${wins} vitória${wins === 1 ? '' : 's'}`} to="/historico" />
        <Figure label="Aproveitamento" value={rate != null ? `${rate}%` : battles.data ? '—' : undefined} tone="text-success" to="/historico">
          {rate != null && (
            <div className="mt-2 h-1 bg-overlay">
              <div className="h-full bg-success" style={{ width: `${rate}%` }} />
            </div>
          )}
        </Figure>
      </dl>
    </div>
  )
}

function Figure({ label, value, detail, tone, to, children }: {
  label: string
  /** `undefined` enquanto carrega. */
  value: ReactNode | undefined
  detail?: string
  tone?: string
  to: string
  children?: ReactNode
}) {
  return (
    <Link
      to={to}
      className="focus-ring group bg-surface p-4 transition-colors hover:bg-raised lg:px-6"
    >
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle group-hover:text-fg-muted">{label}</dt>
      <dd>
        {value === undefined ? (
          <span className="mt-1 block h-8 w-12 animate-pulse bg-raised" />
        ) : (
          <span className={cn('font-display text-4xl leading-none font-extrabold italic tabular-nums', tone ?? 'text-silver-bright')}>
            {value}
          </span>
        )}
        {detail && value !== undefined && <span className="mt-1 block font-mono text-[11px] text-fg-muted">{detail}</span>}
        {children}
      </dd>
    </Link>
  )
}

function ProfileSection({ account }: { account: Account }) {
  const mutation = useUpdateAccount()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm, unknown, ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: account.displayName },
    mode: 'onTouched',
  })

  const onSubmit = (data: ProfileData) =>
    mutation.mutate(
      { displayName: data.displayName },
      {
        onSuccess: (updated) => {
          reset({ displayName: updated.displayName })
          setSaved(true)
        },
      },
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} onChange={() => setSaved(false)} noValidate className="space-y-5">
      {mutation.isError && <FormAlert>{authErrorMessage(mutation.error)}</FormAlert>}

      <Input
        label="Nome de exibição"
        icon={<UserRound />}
        placeholder="Como os outros vão te ver"
        autoComplete="nickname"
        error={errors.displayName?.message}
        {...register('displayName')}
      />

      <div className="space-y-1.5">
        <Input label="Usuário" icon={<AtSign />} value={account.username} readOnly disabled className="cursor-not-allowed" />
        <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <Lock className="size-3" /> O usuário é o seu login e não muda.
        </p>
      </div>

      <FormFooter saved={saved} savedText="Nome atualizado">
        <Button type="submit" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Salvar nome
        </Button>
      </FormFooter>
    </form>
  )
}

function PasswordSection({ username }: { username: string }) {
  const mutation = useUpdateAccount()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), mode: 'onTouched' })

  const onSubmit = ({ currentPassword, newPassword }: PasswordForm) =>
    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset()
          setSaved(true)
        },
        onError: (error) => {
          // senha atual errada é 400 (não 401): marca o campo em vez do alerta
          if (httpStatus(error) === 400 && /senha atual/i.test(apiErrorMessage(error))) {
            setError('currentPassword', { message: 'Senha atual incorreta' }, { shouldFocus: true })
          }
        },
      },
    )

  const fieldError = errors.currentPassword?.type === 'manual'
  const showAlert = mutation.isError && !fieldError

  return (
    <form onSubmit={handleSubmit(onSubmit)} onChange={() => setSaved(false)} noValidate className="space-y-5">
      {showAlert && <FormAlert>{authErrorMessage(mutation.error)}</FormAlert>}

      {/* para o gerenciador de senhas saber de qual conta é a senha nova */}
      <input type="text" name="username" value={username} autoComplete="username" readOnly hidden />

      <PasswordInput
        label="Senha atual"
        icon={<Lock />}
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />

      <PasswordInput
        label="Senha nova"
        icon={<KeyRound />}
        placeholder="Mínimo de 8 caracteres"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />

      <PasswordInput
        label="Confirmar senha nova"
        icon={<ShieldCheck />}
        placeholder="Repita a senha nova"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <p className="border-l-2 border-warning/60 pl-3 text-xs text-fg-muted">
        Trocar a senha encerra a sessão nos outros aparelhos. Este continua conectado.
      </p>

      <FormFooter saved={saved} savedText="Senha trocada">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Trocar senha
        </Button>
      </FormFooter>
    </form>
  )
}

function FormFooter({ saved, savedText, children }: { saved: boolean; savedText: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-4 border-t border-line/60 pt-4">
      {saved && (
        <p role="status" className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-success">
          <Check className="size-3.5" /> {savedText}
        </p>
      )}
      {children}
    </div>
  )
}

function SessionSection() {
  const logout = useLogout()

  return (
    <div className="hud-corners flex flex-wrap items-center justify-between gap-4 border border-line/60 bg-surface/60 p-5 [--hud-color:var(--color-line-strong)]">
      <div>
        <p className="font-display text-lg font-semibold uppercase tracking-wide text-fg">Sair deste aparelho</p>
        <p className="text-sm text-fg-muted">Encerra só esta sessão. Para sair de todos os aparelhos, troque a senha.</p>
      </div>
      <Button variant="danger" onClick={() => logout.mutate()} disabled={logout.isPending}>
        {logout.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        Sair
      </Button>
    </div>
  )
}
