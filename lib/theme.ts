// Color Theme Configuration
// 80% White, 20% Yellow/Gold, Grey Secondary

export const colors = {
  // Primary: Yellow/Gold (20% usage)
  primary: {
    50: '#FFFBEB',   // lightest yellow
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',  // main yellow
    500: '#F59E0B',  // gold
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  
  // Secondary: Grey
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Accent colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// Tailwind class helpers
export const theme = {
  // Backgrounds (80% white)
  bgPrimary: 'bg-white',
  bgSecondary: 'bg-gray-50',
  bgYellow: 'bg-yellow-400',
  bgYellowLight: 'bg-yellow-50',
  bgGrey: 'bg-gray-100',
  
  // Text
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textYellow: 'text-yellow-600',
  textLight: 'text-gray-400',
  
  // Borders
  border: 'border-gray-200',
  borderYellow: 'border-yellow-400',
  
  // Buttons
  btnPrimary: 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold',
  btnSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium',
  btnOutline: 'border-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50 font-medium',
  
  // Cards
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm',
  cardYellow: 'bg-yellow-50 border border-yellow-200 rounded-lg',
  
  // Badges
  badgeYellow: 'bg-yellow-100 text-yellow-800',
  badgeGrey: 'bg-gray-100 text-gray-700',
  badgeSuccess: 'bg-green-100 text-green-800',
  badgeError: 'bg-red-100 text-red-800',
};
