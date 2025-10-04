'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createContactGroup } from '@/lib/database'
import { groupCreationSchema, type GroupCreationFormData } from '@/lib/validations'
import { toast } from 'sonner'

interface GroupCreationFormProps {
  onSuccess?: (groupId: string, shareToken: string) => void
  onCancel?: () => void
}

export function GroupCreationForm({ onSuccess, onCancel }: GroupCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<GroupCreationFormData>({
    resolver: zodResolver(groupCreationSchema),
    mode: 'onChange',
  })

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupCreationFormData) => {
      const result = await createContactGroup(data.name, data.description)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data) => {
      toast.success('Group created successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      reset()
      onSuccess?.(data?.group_id, data?.share_token)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create group')
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const onSubmit = async (data: GroupCreationFormData) => {
    setIsSubmitting(true)
    createGroupMutation.mutate(data)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Contact Group</CardTitle>
        <CardDescription>
          Create a new group to collect and share contact information with participants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Group Name *
            </label>
            <Input
              id="name"
              placeholder="e.g., Sarah's Wedding, Book Club, Team Retreat"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              placeholder="Brief description of your group or event..."
              rows={3}
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}