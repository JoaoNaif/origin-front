import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, AtSign, Loader2, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { authErrorMessage, meQueryKey, register as registerAccount } from '@/features/auth/auth-api'
import { AuthHeader, FormAlert } from '@/features/auth/auth-layout'
import { httpStatus } from '@/lib/api'

// Mesmas regras do backend (POST /accounts): username 3 a 20 (minúsculas, números e _), nome 2 a 30, senha 8 a 72
const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(30, 'Máximo de 30 caracteres'),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Mínimo de 3 caracteres')
      .max(20, 'Máximo de 20 caracteres')
      .regex(/^[a-z0-9_]+$/, 'Use só letras minúsculas, números e _'),
    password: z.string().min(8, 'Mínimo de 8 caracteres').max(72, 'Máximo de 72 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

type RegisterForm = z.input<typeof registerSchema>
type RegisterData = z.output<typeof registerSchema>

export function RegisterPage() {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterForm, unknown, RegisterData>({ resolver: zodResolver(registerSchema), mode: 'onTouched' })

  // Ao recarregar o /me com a conta nova, o GuestOnly leva para a home
  const mutation = useMutation({
    mutationFn: ({ displayName, username, password }: RegisterData) =>
      registerAccount({ displayName, username, password }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
    onError: (error) => {
      if (httpStatus(error) === 409) setError('username', { message: 'Esse usuário já está em uso' })
    },
  })

  const showAlert = mutation.isError && httpStatus(mutation.error) !== 409

  return (
    <>
      <AuthHeader title="Criar conta" subtitle="Monte seu esquadrão e prove sua estratégia." />

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate className="space-y-5">
        {showAlert && <FormAlert>{authErrorMessage(mutation.error)}</FormAlert>}

        <Input
          label="Nome de exibição"
          icon={<UserRound />}
          placeholder="Como os outros vão te ver"
          autoComplete="nickname"
          autoFocus
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <Input
          label="Usuário"
          icon={<AtSign />}
          placeholder="seu_usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username')}
        />

        <PasswordInput
          label="Senha"
          icon={<Lock />}
          placeholder="Mínimo de 8 caracteres"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirmar senha"
          icon={<ShieldCheck />}
          placeholder="Repita a senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" className="group w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Criando conta
            </>
          ) : (
            <>
              Criar conta
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      <div className="my-8 h-px bg-gradient-line" />

      <p className="text-center text-sm text-fg-muted">
        Já tem conta?{' '}
        <Link
          to="/login"
          className="focus-ring rounded-control font-medium text-primary-soft transition-colors hover:text-silver-bright"
        >
          Entrar
        </Link>
      </p>
    </>
  )
}
