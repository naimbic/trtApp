import Container from '@/components/shared/Container'
import classNames from '@/utils/classNames'
import { APP_NAME } from '@/constants/app.constant'
import { PAGE_CONTAINER_GUTTER_X } from '@/constants/theme.constant'
import { Link } from 'react-router'
import { VERSION } from '@/configs/changelog'
import { tr } from '@/utils/t'

const FooterContent = () => {
    return (
        <div className="flex items-center justify-between flex-auto w-full">
            <span>
                {tr("Copyright ©")} {`${new Date().getFullYear()}`}{' '}
                <span className="font-semibold">{`${APP_NAME}`}</span> {tr("All rights reserved.")}
                <span className="mx-2 text-muted">·</span>
                <Link to="/versions" className="hover:underline" title={tr("What's new")}>v{VERSION}</Link>
                <span className="mx-2 text-muted">·</span>
                {tr("Dev by")} <a className="font-semibold hover:underline" href="https://www.trtdigital.ma" target="_blank" rel="noopener noreferrer">trtAgency</a>
            </span>
            <div className="">
                <a
                    className="text-gray"
                    href="/#"
                    onClick={(e) => e.preventDefault()}
                >
                    {tr("Term & Conditions")}
                </a>
                <span className="mx-2 text-muted"> | </span>
                <a
                    className="text-gray"
                    href="/#"
                    onClick={(e) => e.preventDefault()}
                >
                    {tr("Privacy & Policy")}
                </a>
            </div>
        </div>
    )
}

export default function Footer({ pageContainerType = 'contained', className }) {
    return (
        <footer
            className={classNames(
                `footer flex flex-auto items-center h-16 ${PAGE_CONTAINER_GUTTER_X}`,
                className,
            )}
        >
            {pageContainerType === 'contained' ? (
                <Container>
                    <FooterContent />
                </Container>
            ) : (
                <FooterContent />
            )}
        </footer>
    )
}
