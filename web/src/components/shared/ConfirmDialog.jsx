import {
    HiCheckCircle,
    HiOutlineInformationCircle,
    HiOutlineExclamation,
    HiOutlineExclamationCircle,
} from 'react-icons/hi'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'

const StatusIcon = ({ status }) => {
    switch (status) {
        case 'info':
            return (
                <Avatar
                    className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100"
                    shape="circle"
                >
                    <span className="text-2xl">
                        <HiOutlineInformationCircle />
                    </span>
                </Avatar>
            )
        case 'success':
            return (
                <Avatar
                    className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100"
                    shape="circle"
                >
                    <span className="text-2xl">
                        <HiCheckCircle />
                    </span>
                </Avatar>
            )
        case 'warning':
            return (
                <Avatar
                    className="text-amber-600 bg-amber-100 dark:text-amber-100"
                    shape="circle"
                >
                    <span className="text-2xl">
                        <HiOutlineExclamationCircle />
                    </span>
                </Avatar>
            )
        case 'danger':
            return (
                <Avatar
                    className="text-red-600 bg-red-100 dark:text-red-100"
                    shape="circle"
                >
                    <span className="text-2xl">
                        <HiOutlineExclamation />
                    </span>
                </Avatar>
            )

        default:
            return null
    }
}

const ConfirmDialog = (props) => {
    const {
        type = 'info',
        title,
        children,
        onCancel,
        onConfirm,
        cancelText = 'Cancel',
        confirmText = 'Confirm',
        confirmButtonProps,
        cancelButtonProps,
        ...rest
    } = props

    const handleCancel = () => {
        onCancel?.()
    }

    const handleConfirm = () => {
        onConfirm?.()
    }

    return (
        <Dialog {...rest}>
            <div className="flex pb-5 pt-1">
                <div>
                    <StatusIcon status={type} />
                </div>
                <div className="ml-4 pr-8 rtl:mr-4 rtl:pl-8 rtl:pr-0">
                    <h5 className="mb-2">{title}</h5>
                    {children}
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                <Button size="sm" onClick={handleCancel} {...cancelButtonProps}>
                    {cancelText}
                </Button>
                <Button
                    size="sm"
                    variant="solid"
                    className={type === 'danger' ? '!bg-red-500 hover:!bg-red-600 active:!bg-red-700' : undefined}
                    onClick={handleConfirm}
                    {...confirmButtonProps}
                >
                    {confirmText}
                </Button>
            </div>
        </Dialog>
    )
}

export default ConfirmDialog
