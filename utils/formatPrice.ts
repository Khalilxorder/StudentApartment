/**
 * Price formatting utility for consistent currency display across the app.
 * Always uses HUF (Hungarian Forint) as the currency.
 */

export interface PriceFormatOptions {
  showCurrency?: boolean;
  compact?: boolean;
  locale?: string;
}

const DEFAULT_OPTIONS: PriceFormatOptions = {
  showCurrency: true,
  compact: false,
  locale: 'hu-HU',
};

/**
 * Format a price value to a localized string with HUF currency.
 * @param price - The price value to format (can be number, string, null, or undefined)
 * @param options - Formatting options
 * @returns Formatted price string or fallback text
 */
export function formatPrice(
  price: number | string | null | undefined,
  options: PriceFormatOptions = {}
): string {
  const { showCurrency, compact, locale } = { ...DEFAULT_OPTIONS, ...options };
  
  // Handle null/undefined/empty values
  if (price === null || price === undefined || price === '') {
    return 'Price on request';
  }
  
  // Convert string to number
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Handle invalid numbers
  if (isNaN(numericPrice) || !isFinite(numericPrice)) {
    return 'Price on request';
  }
  
  // Handle negative prices (shouldn't happen, but be safe)
  if (numericPrice < 0) {
    return 'Price on request';
  }
  
  // Format the number
  try {
    if (compact && numericPrice >= 1000) {
      // Compact format: 150k, 1.2M, etc.
      const formatter = new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      });
      const formatted = formatter.format(numericPrice);
      return showCurrency ? `${formatted} HUF` : formatted;
    }
    
    // Standard format with thousand separators
    const formatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    });
    const formatted = formatter.format(numericPrice);
    return showCurrency ? `${formatted} HUF` : formatted;
  } catch (error) {
    // Fallback for unsupported locales
    const formatted = numericPrice.toLocaleString();
    return showCurrency ? `${formatted} HUF` : formatted;
  }
}

/**
 * Format a price range (e.g., "100,000 - 150,000 HUF")
 */
export function formatPriceRange(
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
  options: PriceFormatOptions = {}
): string {
  const min = formatPrice(minPrice, { ...options, showCurrency: false });
  const max = formatPrice(maxPrice, { ...options, showCurrency: false });
  
  if (min === 'Price on request' && max === 'Price on request') {
    return 'Price on request';
  }
  
  if (min === 'Price on request') {
    return `Up to ${max} HUF`;
  }
  
  if (max === 'Price on request') {
    return `From ${min} HUF`;
  }
  
  if (min === max) {
    return `${min} HUF`;
  }
  
  return `${min} - ${max} HUF`;
}

/**
 * Format monthly rent with "/month" suffix
 */
export function formatMonthlyRent(
  price: number | string | null | undefined,
  options: PriceFormatOptions = {}
): string {
  const formatted = formatPrice(price, options);
  
  if (formatted === 'Price on request') {
    return formatted;
  }
  
  return `${formatted}/month`;
}

/**
 * Calculate and format price per square meter
 */
export function formatPricePerSqm(
  price: number | null | undefined,
  sizeSqm: number | null | undefined,
  options: PriceFormatOptions = {}
): string {
  if (!price || !sizeSqm || sizeSqm <= 0) {
    return 'N/A';
  }
  
  const pricePerSqm = Math.round(price / sizeSqm);
  const formatted = formatPrice(pricePerSqm, { ...options, showCurrency: false });
  
  return `${formatted} HUF/m²`;
}

