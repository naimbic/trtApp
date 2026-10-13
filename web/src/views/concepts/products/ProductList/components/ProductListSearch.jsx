import Input from '@/components/ui/Input'
import useDebounce from '@/utils/hooks/useDebounce'
import { TbSearch } from 'react-icons/tb'

const ProductListSearch = (props) => {
    const { onInputChange } = props

    function handleDebounceFn(value) {
        onInputChange?.(value)
    }

    const debounceFn = useDebounce(handleDebounceFn, 500)

    const handleInputChange = (e) => {
        debounceFn(e.target.value)
    }

    return (
        <Input
            placeholder="Search"
            suffix={<TbSearch className="text-lg" />}
            onChange={handleInputChange}
        />
    )
}

export default ProductListSearch
