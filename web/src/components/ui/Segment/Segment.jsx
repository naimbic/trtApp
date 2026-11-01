import { useMemo } from 'react'
import classNames from '../utils/classNames'
import { SegmentContextProvider } from './context'
import useControllableState from '../hooks/useControllableState'

const Segment = (props) => {
    const {
        children,
        className,
        defaultValue,
        onChange = () => {
            // empty callback
        },
        ref,
        selectionType = 'single',
        size,
        value: valueProp,
        ...rest
    } = props

    const [value, setValue] = useControllableState({
        prop: valueProp,
        defaultProp: defaultValue,
        onChange: onChange,
    })

    const onActive = (itemValue) => {
        setValue(itemValue)
    }

    const onDeactivate = (itemValue) => {
        if (selectionType === 'single') {
            setValue('')
        }

        if (selectionType === 'multiple') {
            setValue((prevValue = []) => {
                return prevValue.filter((value) => value !== itemValue)
            })
        }
    }

    const segmentValue = useMemo(() => {
        if (selectionType === 'single') {
            if (Array.isArray(value)) {
                return value
            }
            // Accept any non-empty primitive — numbers too, not just strings — so a
            // numeric single-select (e.g. Impact/Effort/Priority = 1/2/3) highlights.
            return value === '' || value === null || value === undefined ? [] : [value]
        }

        if (selectionType === 'multiple') {
            return value ? value : []
        }
    }, [selectionType, value])

    return (
        <SegmentContextProvider
            value={{
                value: segmentValue,
                onActive: onActive,
                onDeactivate: onDeactivate,
                selectionType,
                size,
            }}
        >
            <div
                ref={ref}
                className={classNames(
                    'segment',
                    'gap-2 bg-gray-100 dark:bg-gray-700',
                    className,
                )}
                {...rest}
            >
                {children}
            </div>
        </SegmentContextProvider>
    )
}

export default Segment
