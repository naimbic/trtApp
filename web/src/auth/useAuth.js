import { useContext } from 'react'
import AuthContext from './AuthContext'
import { tr } from '@/utils/t'

const useAuth = () => {
    const context = useContext(AuthContext)

    if (context === undefined) {
        throw new Error(tr("useAuth must be used under a AuthProvider"))
    }

    return context
}

export default useAuth
