/**
 * Format number in Indian currency format (lakhs and crores)
 * Example: 1234567 -> ₹12,34,567
 */
export function formatIndianCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return formatter.format(amount);
}

/**
 * Format number in Indian numbering system without currency symbol
 * Example: 1234567 -> 12,34,567
 */
export function formatIndianNumber(num: number): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  });

  return formatter.format(num);
}

/**
 * Convert number to words in Indian numbering system
 * Example: 1234567 -> "12.35 Lakh"
 */
export function formatIndianWords(amount: number): string {
  if (amount >= 10000000) {
    // Crores
    return `${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    // Lakhs
    return `${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    // Thousands
    return `${(amount / 1000).toFixed(2)} K`;
  }
  return amount.toString();
}

/**
 * Parse Indian currency string to number
 * Example: "₹12,34,567" -> 1234567
 */
export function parseIndianCurrency(value: string): number {
  // Remove currency symbol and commas
  const cleaned = value.replace(/[₹,]/g, '').trim();
  return parseFloat(cleaned) || 0;
}
