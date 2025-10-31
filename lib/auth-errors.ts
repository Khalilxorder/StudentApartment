const NETWORK_ERROR_PATTERNS = [
  /httpsconnectionpool/i,
  /name\s*resolution/i,
  /getaddrinfo/i,
  /eai[_-]?again/i,
  /enotfound/i,
  /econnrefused/i,
  /timed?\s*out/i,
  /fetch failed/i,
  /network request failed/i,
  /oauth2\.googleapis\.com/i,
];

type ErrorLike = {
  message?: string;
  error?: string;
  error_description?: string;
};

function extractMessage(error: unknown): string {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    const candidate = (error as ErrorLike).message
      ?? (error as ErrorLike).error_description
      ?? (error as ErrorLike).error;

    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return '';
}

function isLikelyNetworkError(message: string): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Convert low-level OAuth errors into user-friendly guidance.
 */
export function getFriendlyOAuthError(error: unknown, provider = 'Google'): string {
  const rawMessage = extractMessage(error).trim();
  const fallback = `${provider} sign-in is currently unavailable. Please try again later or use email and password instead.`;

  if (!rawMessage) {
    return fallback;
  }

  const normalized = rawMessage.toLowerCase();

  if (isLikelyNetworkError(normalized)) {
    return fallback;
  }

  if (normalized.includes('invalid_grant') || normalized.includes('authorization code has expired')) {
    return `Your ${provider} sign-in link has expired. Please restart the sign-in process.`;
  }

  if (normalized.includes('access_denied')) {
    return `You cancelled ${provider} sign-in. Please try again if this was unintentional.`;
  }

  return rawMessage;
}
