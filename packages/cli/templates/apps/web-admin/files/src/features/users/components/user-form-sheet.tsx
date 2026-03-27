import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { FormSheet } from '@/components/admin/forms/form-sheet'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  userRoleOptions,
  userTeamOptions,
  userStatuses,
  type UserRecord,
} from '@/features/users/data/mock-users'
import {
  getUserFormDefaults,
  userFormSchema,
  type UserFormValues,
} from '@/features/users/lib/schema'

interface UserFormSheetProps {
  initialUser?: UserRecord | null
  mode: 'create' | 'edit'
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UserFormValues) => void
  open: boolean
  submitting?: boolean
}

export function UserFormSheet({
  initialUser,
  mode,
  onOpenChange,
  onSubmit,
  open,
  submitting = false,
}: UserFormSheetProps) {
  const form = useForm<UserFormValues>({
    defaultValues: getUserFormDefaults(initialUser),
    resolver: zodResolver(userFormSchema),
  })

  useEffect(() => {
    form.reset(getUserFormDefaults(initialUser))
  }, [form, initialUser, mode, open])

  const handleSubmit = form.handleSubmit((values) => onSubmit(values))

  return (
    <FormSheet
      description={
        mode === 'create'
          ? 'Create a new operator account using the shared admin form container.'
          : 'Update the selected operator using the same reusable form contract.'
      }
      onOpenChange={onOpenChange}
      onSubmit={() => void handleSubmit()}
      open={open}
      submitLabel={mode === 'create' ? 'Create user' : 'Save changes'}
      submitting={submitting}
      title={mode === 'create' ? 'Create user' : 'Edit user'}
    >
      <Form {...form}>
        <form className='space-y-6' onSubmit={(event) => event.preventDefault()}>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Alex Johnson' {...field} />
                </FormControl>
                <FormDescription>Display name shown across the admin shell.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='alex@wps.local' {...field} />
                </FormControl>
                <FormDescription>Used for notifications and sign-in handoff.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid gap-6 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a role' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRoleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='team'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a team' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTeamOptions.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select a status' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {userStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormSheet>
  )
}
