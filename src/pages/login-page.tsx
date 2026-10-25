import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Loader2, Lock, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { authErrorMessage, login, meQueryKey } from '@/features/auth/auth-api'
import { AuthHeader, FormAlert } from '@/features/auth/auth-layout'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe seu usuário'),
  password: z.string().min(1, 'Informe sua senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Ao recarregar o /me com a conta, o GuestOnly leva para a página de destino
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  })

  return (
    <>
      <AuthHeader title="Entrar" subtitle="Bem-vindo de volta. Seu esquadrão aguarda." />

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate className="space-y-5">
        {mutation.isError && <FormAlert>{authErrorMessage(mutation.error)}</FormAlert>}

        <Input
          label="Usuário"
          icon={<User />}
          placeholder="seu_usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />

        <PasswordInput
          label="Senha"
          icon={<Lock />}
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" size="lg" className="group w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Entrando
            </>
          ) : (
            <>
              Entrar
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      <div className="my-8 h-px bg-gradient-line" />

      <p className="text-center text-sm text-fg-muted">
        Ainda não tem conta?{' '}
        <Link
          to="/cadastro"
          className="focus-ring rounded-control font-medium text-primary-soft transition-colors hover:text-silver-bright"
        >
          Criar conta
        </Link>
      </p>
    </>
  )
}
