'use client'

import { useFormContext } from 'react-hook-form'
import type { CashVoucherFormValues } from '@/features/cash-vouchers/validations/cash-voucher'

export const PRESET_AMOUNTS = [50, 100, 500, 1000, 500, 2000]

const inputClass = (hasError?: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand ${
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
  }`

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-red-500 mt-1">{message}</p> : null

const StepOne = () => {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CashVoucherFormValues>()

  const selectedIndex = watch('selectedIndex')
  const customAmount = watch('customAmount') ?? ''

  const selectPreset = (amount: number, index: number) => {
    setValue('selectedIndex', index)
    setValue('customAmount', '')
    setValue('amount', amount, { shouldValidate: true })
  }

  const changeCustom = (raw: string) => {
    setValue('selectedIndex', null)
    setValue('customAmount', raw)
    // Cast: an empty input means "no amount yet"; the schema reports it as required.
    setValue('amount', (raw.trim() === '' ? undefined : Number(raw)) as number, {
      shouldValidate: true,
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Select Amount</h2>
      <div className="grid grid-cols-2 gap-3">
        {PRESET_AMOUNTS.map((amount, index) => (
          <button
            type="button"
            key={index}
            onClick={() => selectPreset(amount, index)}
            className={`py-3 rounded-lg border text-sm font-medium transition-all
              ${
                selectedIndex === index
                  ? 'bg-brand border-brand text-white'
                  : 'bg-white border-brand text-gray-700 hover:border-brand'
              }`}
          >
            ${amount}
          </button>
        ))}
      </div>
      <div>
        <label className="text-sm text-gray-600 mb-1 block">Custom amount:</label>
        <input
          type="number"
          min="0"
          placeholder="$0.00"
          value={customAmount}
          onChange={(e) => changeCustom(e.target.value)}
          className={inputClass(!!errors.amount)}
        />
        <FieldError message={errors.amount?.message} />
      </div>
    </div>
  )
}

const StepTwo = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<CashVoucherFormValues>()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Recipient Details</h2>
        <span className="text-xs text-brand border border-brand rounded-full px-2 py-0.5">
          Needs Valid ID
        </span>
      </div>
      <div>
        <input
          type="text"
          placeholder="First name *"
          {...register('firstName')}
          className={inputClass(!!errors.firstName)}
        />
        <FieldError message={errors.firstName?.message} />
      </div>
      <div>
        <input
          type="text"
          placeholder="Last name *"
          {...register('lastName')}
          className={inputClass(!!errors.lastName)}
        />
        <FieldError message={errors.lastName?.message} />
      </div>
      <div>
        <input
          type="email"
          placeholder="Email *"
          {...register('email')}
          className={inputClass(!!errors.email)}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
        <span className="text-orange-400">ℹ</span>
        <p className="text-xs text-gray-600">
          Your recipient must bring a <span className="font-semibold">valid ID</span> that matches
          their name.
        </p>
      </div>
    </div>
  )
}

const CashVoucherForm = ({ currentStep }: { currentStep: number }) => {
  switch (currentStep) {
    case 1:
      return <StepOne />
    case 2:
      return <StepTwo />
    default:
      return null
  }
}

export default CashVoucherForm
