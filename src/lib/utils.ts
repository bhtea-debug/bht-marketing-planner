// Merge class names together
export function cn(...args: (string | undefined | null | false)[]): string {
  return args.filter((item) => typeof item === 'string').join(' ');
}

// Format number as PLN currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format ISO date string to readable format
export function formatDate(date: string): string {
  if (!date) return '';
  try {
    const dateObj = new Date(date);
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    return date;
  }
}

// Get Polish month name from YYYY-MM format
export function getMonthName(monthStr: string): string {
  const monthNames = [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
  ];

  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return monthStr;
  }

  try {
    const [year, monthPart] = monthStr.split('-');
    const monthIndex = parseInt(monthPart, 10) - 1;

    if (monthIndex < 0 || monthIndex >= monthNames.length) {
      return monthStr;
    }

    return `${monthNames[monthIndex]} ${year}`;
  } catch {
    return monthStr;
  }
}

// Default channel colors
export const channelColors: Record<string, string> = {
  Instagram: '#E4405F',
  Facebook: '#1877F2',
  SEO: '#4285F4',
  Email: '#34A853',
  'Google Ads': '#EA4335',
  TikTok: '#000000',
  Pinterest: '#E60023',
};
