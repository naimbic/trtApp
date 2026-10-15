import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignUpForm from './components/SignUpForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'
import { tr } from '@/utils/t'

export const SignUpBase = ({ signInUrl = '/sign-in', disableSubmit }) => {
    const [message, setMessage] = useTimeOutMessage()

    const mode = useThemeStore((state) => state.mode)

    return (
        <>
            <div className="mb-8">
                <Logo
                    type="full"
                    mode={mode}
                    imgClass="h-12 w-full object-contain object-left"
                    logoWidth={200}
                />
            </div>
            <div className="mb-8">
                <h3 className="mb-1">{tr("Sign Up")}</h3>
                <p className="font-semibold heading-text">
                    {tr("And lets get started with your free trial")}
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <SignUpForm disableSubmit={disableSubmit} setMessage={setMessage} />
            <div>
                <div className="mt-6 text-center">
                    <span>{tr("Already have an account?")} </span>
                    <ActionLink
                        to={signInUrl}
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        {tr("Sign in")}
                    </ActionLink>
                </div>
            </div>
        </>
    )
}

const SignUp = () => {
    return <SignUpBase />
}

export default SignUp
