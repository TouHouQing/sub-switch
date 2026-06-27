const ZERO_WIDTH_EMAIL_CHARS = /[\u200B-\u200D\uFEFF]/g;

export const normalizeGatewayEmail = (value: string): string =>
  value.trim().replace(ZERO_WIDTH_EMAIL_CHARS, "").normalize("NFKC");
