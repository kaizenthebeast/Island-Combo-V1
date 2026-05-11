'use client'

import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addCategorySchema, AddCategoryFormValues } from '@/form-schema/categorySchema'
import { createCategory } from '@/lib/category'
import { Field, Input } from './CategoryUIForm'

type Props = {
  onSuccess: (data: AddCategoryFormValues) => void
  onCancel: () => void
}

export function AddCategoryForm({ onSuccess, onCancel }: Props) {
  const methods = useForm<AddCategoryFormValues>({
    resolver: zodResolver(addCategorySchema),
    defaultValues: {
      name: '',
      subCategories: [],
    },
  })

  const { handleSubmit, setError, register, control, formState: { isSubmitting, errors } } = methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subCategories',
  })

  const onSubmit = async (data: AddCategoryFormValues) => {
    const result = await createCategory(data)

    if (!result.success) {
      setError('root', { message: result.message })
      return
    }

    onSuccess(data)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {errors.root && (
          <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="text-[12px] text-rose-700 font-medium">
              {errors.root.message}
            </p>
          </div>
        )}

        {/* Parent category */}
        <Field label="Parent category" required error={errors.name?.message}>
          <Input
            {...register('name')}
            placeholder="e.g. Apparel"
          />
        </Field>

        {/* Sub-categories */}
        {fields.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="h-px bg-slate-100" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400 select-none">
              Sub-categories
            </p>

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                {/* Indent line */}
                <div className="flex flex-col items-center self-stretch pt-2 pl-2">
                  <div className="w-3 h-3 border-l-2 border-b-2 border-slate-200 rounded-bl-sm" />
                </div>

                <Field
                  label=""
                  error={errors.subCategories?.[index]?.name?.message}
                  className="flex-1"
                >
                  <Input
                    {...register(`subCategories.${index}.name`)}
                    placeholder={`Sub-category ${index + 1}`}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-1 rounded-md p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add sub-category button */}
        <button
          type="button"
          onClick={() => append({ name: '' })}
          className="flex items-center gap-1.5 w-fit text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add sub-category
        </button>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-800 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating…' : 'Create category'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}