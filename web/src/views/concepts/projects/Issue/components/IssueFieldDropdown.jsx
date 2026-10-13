import Dropdown from '@/components/ui/Dropdown'
import IssueField from './IssueField'
const IssueFieldDropdown = (props) => {
    const { title, children, icon, dropdownTrigger } = props

    return (
        <IssueField title={title} icon={icon}>
            <Dropdown
                className="w-full h-full"
                toggleClassName="hover:bg-gray-100 dark:hover:bg-gray-700 flex px-3 focus:bg-gray-100 cursor-pointer rounded-xl min-h-[46px] w-full"
                placement="bottom-start"
                renderTitle={
                    <div className="inline-flex items-center gap-1">
                        {dropdownTrigger}
                    </div>
                }
            >
                {children}
            </Dropdown>
        </IssueField>
    )
}

export default IssueFieldDropdown
