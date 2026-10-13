import { useState } from 'react'
import Input from '@/components/ui/Input'

const ControlledInput = () => {
    const [value, setValue] = useState('')
    const handleChange = (e) => setValue(e.target.value)

    return (
        <div>
            <Input
                value={value}
                placeholder="Sample placeholder"
                onChange={handleChange}
            />
        </div>
    )
}

export default ControlledInput
