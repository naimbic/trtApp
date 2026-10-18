import { TabsContextProvider } from './context'
import useControllableState from '../hooks/useControllableState'
import { useId } from 'react'
import classNames from 'classnames'

const Tabs = (props) => {
    const {
        className,
        defaultValue,
        onChange,
        ref,
        value: valueProp,
        variant = 'underline',
        ...rest
    } = props

    const [value, setValue] = useControllableState({
        prop: valueProp,
        onChange: onChange,
        defaultProp: defaultValue,
    })

    const barId = useId() // the sliding pill of this set of tabs
    const tabsClass = classNames('tabs', className)

    return (
        <TabsContextProvider
            value={{
                value: value,
                onValueChange: setValue,
                variant,
                barId,
            }}
        >
            <div className={tabsClass} {...rest} ref={ref} />
        </TabsContextProvider>
    )
}

export default Tabs
