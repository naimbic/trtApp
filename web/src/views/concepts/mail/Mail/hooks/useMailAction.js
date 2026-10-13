import { useMailStore } from '../store/mailStore'
import cloneDeep from 'lodash/cloneDeep'

const useMailAction = () => {
    const { mailList, setMail, setMailList, setSelectedMail } = useMailStore()

    const updateMailList = (newMail) => {
        const newMailList = cloneDeep(mailList).map((mail) => {
            if (mail.id === newMail.id) {
                mail = newMail
            }
            return mail
        })
        setMailList(newMailList)
    }

    const onStarToggle = (mail, shouldSetMail = true) => {
        const newMail = cloneDeep(mail)
        newMail.starred = !newMail.starred
        if (shouldSetMail) {
            setMail(newMail)
        }
        updateMailList(newMail)
    }

    const onFlagToggle = (mail, shouldSetMail = true) => {
        const newMail = cloneDeep(mail)
        newMail.flagged = !newMail.flagged
        if (shouldSetMail) {
            setMail(newMail)
        }
        updateMailList(newMail)
    }

    const onCheckboxToggle = (mail) => {
        const newMail = cloneDeep(mail)
        newMail.checked = !newMail.checked
        updateMailList(newMail)
    }

    const onMoveMailClick = (mail, destination) => {
        const newMail = cloneDeep(mail)
        newMail.label = destination
        updateMailList(newMail)
    }

    const onBatchMoveMailClick = (mailsId, destination) => {
        setMailList(
            mailList.map((mail) => {
                if (mailsId.includes(mail.id)) {
                    mail.label = destination
                    mail.checked = false
                }

                return mail
            }),
        )
        setSelectedMail([])
    }

    const onMailDelete = (mailsId) => {
        setMailList(mailList.filter((mail) => !mailsId.includes(mail.id)))
        setSelectedMail([])
    }

    const onResetChecked = () => {
        setMailList(
            mailList.map((mail) => {
                mail.checked = false
                return mail
            }),
        )
        setSelectedMail([])
    }

    return {
        onStarToggle,
        onMailDelete,
        onFlagToggle,
        onMoveMailClick,
        onCheckboxToggle,
        onResetChecked,
        onBatchMoveMailClick,
    }
}

export default useMailAction
