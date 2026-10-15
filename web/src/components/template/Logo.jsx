import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import useBranding from '@/utils/hooks/useBranding'
import { tr } from '@/utils/t'

const LOGO_SRC_PATH = '/img/logo/'

const Logo = (props) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    const brand = useBranding()
    const custom = type === 'full' ? (mode === 'dark' ? brand?.logoDark || brand?.logo : brand?.logo) : brand?.favicon
    return (
        <div
            className={classNames('logo', className)}
            style={{
                ...style,
                ...{ width: logoWidth },
            }}
        >
            <img
                className={imgClass}
                src={custom || `${LOGO_SRC_PATH}logo-${mode}-${type}.svg`}
                alt={tr("{APP_NAME} logo", { APP_NAME: APP_NAME })}
            />
        </div>
    )
}

export default Logo
