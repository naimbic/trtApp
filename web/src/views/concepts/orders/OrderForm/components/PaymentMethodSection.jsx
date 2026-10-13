import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import FormCustomFormatInput from '@/components/shared/CustomFormatInput'
import FormPatternInput from '@/components/shared/PatternInput'
import { Controller } from 'react-hook-form'
import { TbCreditCard, TbBrandPaypal, TbBuildingBank } from 'react-icons/tb'
import { components } from 'react-select'

const paymentMethodOptions = [
    {
        label: 'Credit/Debit card',
        value: 'creditOrDebitCard',
        icon: <TbCreditCard />,
    },
    { label: 'Paypal', value: 'paypal', icon: <TbBrandPaypal /> },
    { label: 'Bank transfer', value: 'bankTransfer', icon: <TbBuildingBank /> },
]

function limit(val, max) {
    if (val.length === 1 && val[0] > max[0]) {
        val = '0' + val
    }

    if (val.length === 2) {
        if (Number(val) === 0) {
            val = '01'
        } else if (val > max) {
            val = max
        }
    }

    return val
}

function cardExpiryFormat(val) {
    const month = limit(val.substring(0, 2), '12')
    const date = limit(val.substring(2, 4), '31')

    return month + (date.length ? '/' + date : '')
}

const { Control } = components

const CustomSelectOption = (props) => {
    return (
        <DefaultOption
            {...props}
            customLabel={(data, label) => (
                <span className="flex items-center gap-2">
                    <span className="text-xl">{data.icon}</span>
                    <span>{label}</span>
                </span>
            )}
        />
    )
}

const CustomControl = ({ children, ...props }) => {
    const selected = props.getValue()[0]
    return (
        <Control {...props}>
            {selected && (
                <span className="text-xl ltr:ml-4 rtl:mr-4 text-primary">
                    {selected.icon}
                </span>
            )}
            {children}
        </Control>
    )
}

const PaymentMethodSection = ({ control, errors, selectedPaymentMethod }) => {
    return (
        <Card id="payment">
            <h4 className="mb-6">Payment</h4>
            <FormItem
                label="Payment method"
                invalid={Boolean(errors.paymentMethod)}
                errorMessage={errors.paymentMethod?.message}
            >
                <Controller
                    name="paymentMethod"
                    control={control}
                    render={({ field }) => (
                        <Select
                            options={paymentMethodOptions}
                            {...field}
                            components={{
                                Option: CustomSelectOption,
                                Control: CustomControl,
                            }}
                            placeholder=""
                            value={paymentMethodOptions.filter(
                                (option) => option.value === field.value,
                            )}
                            onChange={(option) => field.onChange(option?.value)}
                        />
                    )}
                />
            </FormItem>
            {selectedPaymentMethod === 'creditOrDebitCard' && (
                <>
                    <FormItem
                        label="User Name"
                        invalid={Boolean(errors.cardHolderName)}
                        errorMessage={errors.cardHolderName?.message}
                    >
                        <Controller
                            name="cardHolderName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Card holder name"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Credit card number"
                        invalid={Boolean(errors.ccNumber)}
                        errorMessage={errors.ccNumber?.message}
                    >
                        <Controller
                            name="ccNumber"
                            control={control}
                            render={({ field }) => (
                                <FormPatternInput
                                    placeholder="•••• •••• •••• ••••"
                                    format="#### #### #### ####"
                                    value={field.value}
                                    onValueChange={(e) => {
                                        field.onChange(e.value)
                                    }}
                                />
                            )}
                        />
                    </FormItem>
                    <div className="grid grid-cols-2 gap-4">
                        <FormItem
                            label="Expiration date"
                            invalid={Boolean(errors.cardExpiry)}
                            errorMessage={errors.cardExpiry?.message}
                        >
                            <Controller
                                name="cardExpiry"
                                control={control}
                                render={({ field }) => (
                                    <FormCustomFormatInput
                                        placeholder="••/••"
                                        format={cardExpiryFormat}
                                        value={field.value}
                                        onValueChange={(e) => {
                                            field.onChange(e.value)
                                        }}
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="CVV"
                            invalid={Boolean(errors.code)}
                            errorMessage={errors.code?.message}
                        >
                            <Controller
                                name="code"
                                control={control}
                                render={({ field }) => (
                                    <FormPatternInput
                                        placeholder="•••"
                                        format="###"
                                        value={field.value}
                                        onValueChange={(e) => {
                                            field.onChange(e.value)
                                        }}
                                    />
                                )}
                            />
                        </FormItem>
                    </div>
                </>
            )}
            {selectedPaymentMethod === 'paypal' && (
                <>
                    <FormItem
                        label="Paypal email"
                        invalid={Boolean(errors.paypalEmail)}
                        errorMessage={errors.paypalEmail?.message}
                    >
                        <Controller
                            name="paypalEmail"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="email"
                                    autoComplete="off"
                                    placeholder="Email"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </>
            )}
            {selectedPaymentMethod === 'bankTransfer' && (
                <>
                    <FormItem
                        label="Bank name"
                        invalid={Boolean(errors.bankName)}
                        errorMessage={errors.bankName?.message}
                    >
                        <Controller
                            name="bankName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Bank name"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Account number"
                        invalid={Boolean(errors.accountNumber)}
                        errorMessage={errors.accountNumber?.message}
                    >
                        <Controller
                            name="accountNumber"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Account number"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Account holder name"
                        invalid={Boolean(errors.accountHolderName)}
                        errorMessage={errors.accountHolderName?.message}
                    >
                        <Controller
                            name="accountHolderName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Account holder name"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <div className="grid grid-cols-2 gap-4">
                        <FormItem
                            label="IBAN"
                            invalid={Boolean(errors.IBAN)}
                            errorMessage={errors.IBAN?.message}
                        >
                            <Controller
                                name="IBAN"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="text"
                                        autoComplete="off"
                                        placeholder="IBAN"
                                        {...field}
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="Reference number"
                            invalid={Boolean(errors.referenceNumber)}
                            errorMessage={errors.referenceNumber?.message}
                        >
                            <Controller
                                name="referenceNumber"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="text"
                                        autoComplete="off"
                                        placeholder="Reference number"
                                        {...field}
                                    />
                                )}
                            />
                        </FormItem>
                    </div>
                </>
            )}
        </Card>
    )
}

export default PaymentMethodSection
