import { useState } from 'react'
import { useSearchParams } from 'react-router'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import { apiResetPassword } from '@/services/AuthService'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { tr } from '@/utils/t'

const validationSchema = z
    .object({
        newPassword: z.string().min(8, tr("Use at least 8 characters")),
        confirmPassword: z.string().min(1, tr("Confirm Password Required")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: tr("Your passwords do not match"),
        path: ['confirmPassword'],
    })

const ResetPasswordForm = (props) => {
    const [isSubmitting, setSubmitting] = useState(false)
    const [params] = useSearchParams()
    const token = params.get('token')

    const { className, setMessage, setResetComplete, resetComplete, children } =
        props

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm({
        resolver: zodResolver(validationSchema),
    })

    const onResetPassword = async (values) => {
        const { newPassword } = values
        setSubmitting(true)

        try {
            const resp = await apiResetPassword({
                token,
                password: newPassword,
            })
            if (resp) {
                setSubmitting(false)
                setResetComplete?.(true)
            }
        } catch (errors) {
            setMessage?.(
                typeof errors === 'string'
                    ? errors
                    : tr("Failed to reset password"),
            )
            setSubmitting(false)
        }

        setSubmitting(false)
    }

    return (
        <div className={className}>
            {!resetComplete ? (
                <Form onSubmit={handleSubmit(onResetPassword)}>
                    <FormItem
                        label={tr("Password")}
                        invalid={Boolean(errors.newPassword)}
                        errorMessage={errors.newPassword?.message}
                    >
                        <Controller
                            name="newPassword"
                            control={control}
                            render={({ field }) => (
                                <PasswordInput
                                    autoComplete="off"
                                    placeholder="••••••••••••"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label={tr("Confirm Password")}
                        invalid={Boolean(errors.confirmPassword)}
                        errorMessage={errors.confirmPassword?.message}
                    >
                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field }) => (
                                <PasswordInput
                                    autoComplete="off"
                                    placeholder={tr("Confirm Password")}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <Button
                        block
                        loading={isSubmitting}
                        variant="solid"
                        type="submit"
                    >
                        {isSubmitting ? tr("Submiting...") : tr("Submit")}
                    </Button>
                </Form>
            ) : (
                <>{children}</>
            )}
        </div>
    )
}

export default ResetPasswordForm
