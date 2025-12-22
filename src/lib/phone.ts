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

export { E164_PHONE_REGEX };
