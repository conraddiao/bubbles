import { z } from 'zod'
import { isOptionalE164Phone, isRequiredE164Phone } from './phone'

// Contact form validation schema
export const contactFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .optional()
    .refine(isOptionalE164Phone, 'Invalid phone number format. Use +1234567890'),
  notifications_enabled: z.boolean(),
  group_password: z.string().max(100, 'Password is too long').optional(),
})

// Group creation validation schema
export const groupCreationSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
})

// Authentication validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z
    .string()
    .optional()
    .refine(isOptionalE164Phone, 'Invalid phone number format. Use +1234567890'),
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Profile update validation schema
export const profileUpdateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z
    .string()
    .optional()
    .refine(isOptionalE164Phone, 'Invalid phone number format. Use +1234567890'),
  sms_notifications_enabled: z.boolean(),
})

export const contactCardSchema = profileUpdateSchema.extend({
  avatar_url: z
    .union([z.string().url('Enter a valid image URL'), z.literal('')])
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
})

// Phone verification schema
export const phoneVerificationSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isRequiredE164Phone, 'Invalid phone number format. Use +1234567890'),
  verification_code: z.string().length(6, 'Verification code must be 6 digits').optional(),
})

// Two-factor authentication schema
export const twoFactorSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
})

// Export form data types
export type ContactFormData = z.infer<typeof contactFormSchema>
export type GroupCreationFormData = z.infer<typeof groupCreationSchema>
export type SignUpFormData = z.infer<typeof signUpSchema>
export type SignInFormData = z.infer<typeof signInSchema>
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>
export type ContactCardFormData = z.infer<typeof contactCardSchema>
export type PhoneVerificationFormData = z.infer<typeof phoneVerificationSchema>
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>
