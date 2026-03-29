const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

export function normalizePhoneInput(phone?: string | null): string | undefined {
  if (phone == null) return undefined;

  const trimmed = phone.trim();
  return trimmed.length ? trimmed : undefined;
}

export function isOptionalE164Phone(phone?: string | null): boolean {
  const normalized = normalizePhoneInput(phone);
  if (!normalized) return true;

  return E164_PHONE_REGEX.test(normalized);
}

export function isRequiredE164Phone(phone?: string | null): boolean {
  const normalized = normalizePhoneInput(phone);
  if (!normalized) return false;

  return E164_PHONE_REGEX.test(normalized);
}

// Normalize a US phone number to E.164 format.
// Accepts formats like "5551234567", "(555) 123-4567", "1-555-123-4567", "+15551234567".
// Returns undefined for empty input, or the input unchanged if it can't be normalized.
export function toE164US(phone?: string | null): string | undefined {
  const normalized = normalizePhoneInput(phone)
  if (!normalized) return undefined

  // Already valid E.164
  if (E164_PHONE_REGEX.test(normalized)) return normalized

  // Strip all non-digit characters
  const digits = normalized.replace(/\D/g, '')

  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  // Can't normalize — return as-is so validation will catch it
  return normalized
}

export { E164_PHONE_REGEX };
