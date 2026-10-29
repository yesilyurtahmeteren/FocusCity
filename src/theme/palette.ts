export const Colors = {
  light: {
    text: '#182D29',
    textSecondary: '#50645E',
    background: '#F5F8F4',
    backgroundElement: '#E7EEE7',
    backgroundSelected: '#D1E5D9',
    primary: '#216348',
    onPrimary: '#FFFFFF',
    danger: '#A32932',
    warning: '#855700',
    previewInvalid: '#FBE4E5',
    previewWarning: '#FFF1CE',
  },
  dark: {
    text: '#EDF5EF',
    textSecondary: '#B2C5BA',
    background: '#101C18',
    backgroundElement: '#1C2D25',
    backgroundSelected: '#2B4537',
    primary: '#9ADBB4',
    onPrimary: '#10271A',
    danger: '#FFB3B8',
    warning: '#F2CA75',
    previewInvalid: '#51242A',
    previewWarning: '#473A1E',
  },
} as const;

export type ThemeMode = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light;
