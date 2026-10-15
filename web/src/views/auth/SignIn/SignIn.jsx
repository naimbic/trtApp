import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignInForm from './components/SignInForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'

export const SignInBase = ({
    forgetPasswordUrl = '/forgot-password',
    disableSubmit,
}) => {
    const [message, setMessage] = useTimeOutMessage()

    const mode = useThemeStore((state) => state.mode)

    return (
        <>
            <div className="mb-10">
                <Logo
                    type="full"
                    mode={mode}
                    imgClass="h-12 w-full object-contain object-left"
                    logoWidth={200}
                />
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <SignInForm
                disableSubmit={disableSubmit}
                setMessage={setMessage}
                passwordHint={
                    <div className="mb-7 mt-2">
                        <ActionLink
                            to={forgetPasswordUrl}
                            className="font-semibold heading-text mt-2 underline"
                            themeColor={false}
                        >
                            Forgot password
                        </ActionLink>
                    </div>
                }
            />
        </>
    )
}

const SignIn = () => {
    return <SignInBase />
}

export default SignIn
