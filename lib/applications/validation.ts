export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidMobileNumber(value: string): boolean {
  const normalized = value.replace(/[\s()-]/g, "");
  return /^\+?[0-9]{8,15}$/.test(normalized);
}
