import Container from '@/components/shared/Container'
import SpaceSignBoard from '@/assets/svg/SpaceSignBoard'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router'
import { tr } from '@/utils/t'

const AccessDenied = () => {
    const nav = useNavigate()
    return (
        <Container className="h-full">
            <div className="h-full flex flex-col items-center justify-center">
                <SpaceSignBoard height={280} width={280} />
                <div className="mt-10 text-center">
                    <h3 className="mb-2">{tr("Access Denied!")}</h3>
                    <p className="text-base">
                        {tr("You have no permission to visit this page")}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{tr("Ask an administrator if you need access.")}</p>
                    <Button className="mt-6" variant="solid" onClick={() => nav('/team-dashboard')}>{tr("Back to my dashboard")}</Button>
                </div>
            </div>
        </Container>
    )
}

export default AccessDenied
