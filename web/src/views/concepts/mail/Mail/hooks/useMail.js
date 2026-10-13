import { useMailStore } from '../store/mailStore'
import { apiGetMails, apiGetMail } from '@/services/MailServices'
import useSWRMutation from 'swr/mutation'

async function getMails(_, { arg }) {
    const data = await apiGetMails(arg)
    return data
}

async function getMail(_, { arg }) {
    const data = await apiGetMail({ id: arg })
    return data
}

const useMail = () => {
    const {
        setMailList,
        setMail,
        selectedMailId,
        setMailListFetched,
        setSelectedMail,
    } = useMailStore()

    const { trigger: fetchMails, isMutating: isMailsFetching } = useSWRMutation(
        `/api/mails/`,
        getMails,
        {
            onSuccess: (list) => {
                setSelectedMail([])
                setMailList(list)
                setMailListFetched(true)
            },
        },
    )

    const { trigger: fetchMail, isMutating: isMailFetching } = useSWRMutation(
        `/api/mail/${selectedMailId}`,
        getMail,
        {
            onSuccess: (mail) => {
                setMail(mail)
            },
        },
    )

    return {
        fetchMails,
        isMailsFetching,
        fetchMail,
        isMailFetching,
    }
}

export default useMail
