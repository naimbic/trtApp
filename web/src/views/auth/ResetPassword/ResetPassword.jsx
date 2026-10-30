import { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import ActionLink from '@/components/shared/ActionLink'
import ResetPasswordForm from './components/ResetPasswordForm'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useNavigate, useSearchParams } from 'react-router'
import { apiCheckResetToken } from '@/services/AuthService'
import { tr } from '@/utils/t'

export const ResetPasswordBase = ({ signInUrl = '/sign-in' }) => {
    const [resetComplete, setResetComplete] = useState(false)

    const [message, setMessage] = useTimeOutMessage()

    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [link, setLink] = useState({ checking: true, valid: false })

    useEffect(() => {
        apiCheckResetToken(params.get('token'))
            .then((r) => setLink({ checking: false, ...r }))
            .catch(() => setLink({ checking: false, valid: false }))
    }, [params])

    const invite = link.purpose === 'invite'

    const handleContinue = () => {
        navigate(signInUrl)
    }

    return (
        <div>
            <div className="mb-6">
                {resetComplete ? (
                    <>
                        <h3 className="mb-1">{invite ? tr("Password set") : tr("Reset done")}</h3>
                        <p className="font-semibold heading-text">
                            {invite ? tr("Your password is ready. You can now sign in.") : tr("Your password has been reset. You have been signed out everywhere, so please sign in again.")}
                        </p>
                    </>
                ) : (
                    <>
                        <h3 className="mb-1">{link.checking ? tr("Checking link…") : !link.valid ? tr("Link not valid") : invite ? tr("Welcome — set your password") : tr("Set new password")}</h3>
                        <p className="font-semibold heading-text">
                            {link.valid ? tr("{email} · use at least 8 characters", { email: link.email }) : link.checking ? '' : tr("This link is invalid, already used, or has expired.")}
                        </p>
                    </>
                )}
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            {!resetComplete && !link.checking && !link.valid ? (
                <Button block variant="solid" type="button" data-href={'/forgot-password'} onClick={() => navigate('/forgot-password')}>
                    {tr("Request a new link")}
                </Button>
            ) : (
            <ResetPasswordForm
                resetComplete={resetComplete}
                setMessage={setMessage}
                setResetComplete={setResetComplete}
            >
                <Button
                    block
                    variant="solid"
                    type="button"
                    onClick={handleContinue}
                >
                    {tr("Continue")}
                </Button>
            </ResetPasswordForm>
            )}
            <div className="mt-4 text-center">
                <span>{tr("Back to")} </span>
                <ActionLink
                    to={signInUrl}
                    className="heading-text font-bold"
                    themeColor={false}
                >
                    {tr("Sign in")}
                </ActionLink>
            </div>
        </div>
    )
}

const ResetPassword = () => {
    return <ResetPasswordBase />
}

export default ResetPassword
