import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import classNames from '@/utils/classNames'
import { useAuth } from '@/auth'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const validationSchema = z.object({
    email: z
        .string()
        .min(1, { message: 'Please enter your email' }),
    password: z
        .string()
        .min(1, { message: 'Please enter your password' }),
})

const SignInForm = (props) => {
    const [isSubmitting, setSubmitting] = useState(false)
    const [step, setStep] = useState(null) // null | { methods, email, password }
    const [otp, setOtp] = useState('')
    const [emailNote, setEmailNote] = useState('')

    const { disableSubmit = false, className, setMessage, passwordHint } = props

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
        resolver: zodResolver(validationSchema),
    })

    const { signIn } = useAuth()

    const onSignIn = async (values) => {
        const { email, password } = values

        if (!disableSubmit) {
            setSubmitting(true)

            const result = await signIn({ email, password })

            if (result?.status === 'otp') {
                setStep({ methods: result.methods, email, password })
            } else if (result?.status === 'failed') {
                setMessage?.(result.message)
            }
        }

        setSubmitting(false)
    }

    const verify = async () => {
        if (!otp.trim()) return
        setSubmitting(true)
        const result = await signIn({ email: step.email, password: step.password, otp: otp.trim() })
        if (result?.status === 'failed') { setMessage?.(result.message); setOtp('') }
        setSubmitting(false)
    }
    const sendEmail = async () => {
        setEmailNote('')
        try {
            const r = await fetch('/api/crm/auth/2fa/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: step.email, password: step.password }) })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) setMessage?.(j.error || 'Could not send the code')
            else setEmailNote(`Code sent to ${j.to}`)
        } catch { setMessage?.('Could not send the code') }
    }

    if (step) {
        return (
            <div className={className}>
                <div className="mb-5">
                    <h4 className="mb-1">Two-step verification</h4>
                    <p className="text-sm text-gray-500">{step.methods?.app ? 'Enter the 6-digit code from your authenticator app.' : 'Request a code by email, then enter it below.'} You can also use a recovery code.</p>
                </div>
                <Input autoFocus inputMode="text" autoComplete="one-time-code" placeholder="123456" maxLength={20} className="mb-3 text-center text-xl tracking-[0.3em]" value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} />
                <Button block loading={isSubmitting} variant="solid" onClick={verify}>Verify and sign in</Button>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    {step.methods?.email ? <button type="button" className="text-primary hover:underline" onClick={sendEmail}>Email me a code</button> : <span />}
                    <button type="button" className="text-gray-500 hover:underline" onClick={() => { setStep(null); setOtp(''); setEmailNote('') }}>Use a different account</button>
                </div>
                {emailNote && <p className="mt-2 text-sm text-emerald-600">{emailNote}</p>}
            </div>
        )
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(onSignIn)}>
                <FormItem
                    label="Email"
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email?.message}
                >
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="email"
                                placeholder="Email"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Password"
                    invalid={Boolean(errors.password)}
                    errorMessage={errors.password?.message}
                    className={classNames(
                        passwordHint ? 'mb-0' : '',
                        errors.password?.message ? 'mb-8' : '',
                    )}
                >
                    <Controller
                        name="password"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <PasswordInput
                                type="text"
                                placeholder="Password"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                {passwordHint}
                <Button
                    block
                    loading={isSubmitting}
                    variant="solid"
                    type="submit"
                >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
            </Form>
        </div>
    )
}

export default SignInForm
