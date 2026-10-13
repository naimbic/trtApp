import DebounceInput from '@/components/shared/DebouceInput'

function Example() {
    const handleSearch = (e) => {
        window.alert(e.target.value)
    }

    return (
        <DebounceInput
            placeholder="Search..."
            wait={1000}
            onChange={handleSearch}
        />
    )
}

export default Example
