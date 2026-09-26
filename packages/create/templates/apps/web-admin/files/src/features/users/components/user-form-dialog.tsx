import { FormDialog } from '@/components/admin/forms/form-dialog';
import {
  FieldGroup,
  FormFieldLayout,
  useAppForm
} from '@/components/shared/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  userRoleOptions,
  userTeamOptions,
  userStatuses,
  type UserRecord
} from '@/features/users/data/mock-users';
import {
  getUserFormDefaults,
  userFormSchema,
  type UserFormValues
} from '@/features/users/lib/schema';

interface UserFormDialogProps {
  initialUser?: UserRecord | null;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  open: boolean;
  submitting?: boolean;
}

export function UserFormDialog(props: UserFormDialogProps) {
  if (!props.open) return null;
  return (
    <UserFormContent
      key={`${props.mode}-${props.initialUser?.id ?? 'new'}`}
      {...props}
    />
  );
}

function UserFormContent({
  initialUser,
  mode,
  onOpenChange,
  onSubmit,
  open,
  submitting = false
}: UserFormDialogProps) {
  const form = useAppForm({
    defaultValues: getUserFormDefaults(initialUser),
    validators: { onSubmit: userFormSchema },
    onSubmit: ({ value }) => onSubmit(userFormSchema.parse(value))
  });

  return (
    <form.Subscribe
      selector={(state) => [state.isDirty, state.isSubmitting] as const}
    >
      {([isDirty, isSubmitting]) => (
        <FormDialog
          description={
            mode === 'create'
              ? 'Create a new operator account.'
              : 'Update the selected operator.'
          }
          isDirty={isDirty}
          onOpenChange={onOpenChange}
          onSubmit={() => form.handleSubmit()}
          open={open}
          submitLabel={mode === 'create' ? 'Create user' : 'Save changes'}
          submitting={submitting || isSubmitting}
          title={mode === 'create' ? 'Create user' : 'Edit user'}
        >
          <FieldGroup className='gap-6'>
            <form.Field name='name'>
              {(field) => (
                <FormFieldLayout
                  label='Name'
                  name={field.name}
                  errors={field.state.meta.errors}
                  description='Display name shown across the admin shell.'
                >
                  {(control) => (
                    <Input
                      {...control}
                      placeholder='Alex Johnson'
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  )}
                </FormFieldLayout>
              )}
            </form.Field>
            <form.Field name='email'>
              {(field) => (
                <FormFieldLayout
                  label='Email'
                  name={field.name}
                  errors={field.state.meta.errors}
                  description='Used for notifications and sign-in handoff.'
                >
                  {(control) => (
                    <Input
                      {...control}
                      type='email'
                      placeholder='alex@example.com'
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  )}
                </FormFieldLayout>
              )}
            </form.Field>
            {(
              [
                ['role', 'Role', userRoleOptions],
                ['team', 'Team', userTeamOptions],
                ['status', 'Status', userStatuses]
              ] as const
            ).map(([name, label, options]) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <FormFieldLayout
                    label={label}
                    name={field.name}
                    errors={field.state.meta.errors}
                  >
                    {(control) => (
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(
                            userFormSchema.shape[name].parse(value)
                          )
                        }
                      >
                        <SelectTrigger
                          {...control}
                          onBlur={field.handleBlur}
                          className='w-full'
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormFieldLayout>
                )}
              </form.Field>
            ))}
          </FieldGroup>
        </FormDialog>
      )}
    </form.Subscribe>
  );
}
