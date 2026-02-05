/**
 * Design System - Colors
 * Palette sobre, technique, industrielle, premium
 */

export const colors = {
    // Primary - Bleu foncé industriel
    primary: {
        50: '#E8EEF4',
        100: '#C5D5E4',
        200: '#9EB9D3',
        300: '#779DC1',
        400: '#5988B4',
        500: '#3B73A7',
        600: '#2F5C86',
        700: '#1E3A5F', // Main
        800: '#152A45',
        900: '#0D1A2B',
    },

    // Neutral - Gris anthracite
    neutral: {
        50: '#F8F9FA',
        100: '#F1F3F5',
        200: '#E9ECEF',
        300: '#DEE2E6',
        400: '#CED4DA',
        500: '#ADB5BD',
        600: '#6C757D',
        700: '#495057',
        800: '#343A40',
        900: '#212529',
    },

    // Success - Vert sobre
    success: {
        50: '#E8F5E9',
        100: '#C8E6C9',
        200: '#A5D6A7',
        300: '#81C784',
        400: '#66BB6A',
        500: '#4CAF50',
        600: '#43A047',
        700: '#388E3C', // Main
        800: '#2E7D32',
        900: '#1B5E20',
    },

    // Warning - Orange discret
    warning: {
        50: '#FFF8E1',
        100: '#FFECB3',
        200: '#FFE082',
        300: '#FFD54F',
        400: '#FFCA28',
        500: '#FFC107',
        600: '#FFB300',
        700: '#FFA000', // Main
        800: '#FF8F00',
        900: '#FF6F00',
    },

    // Error - Rouge non agressif
    error: {
        50: '#FFEBEE',
        100: '#FFCDD2',
        200: '#EF9A9A',
        300: '#E57373',
        400: '#EF5350',
        500: '#F44336',
        600: '#E53935',
        700: '#C62828', // Main
        800: '#B71C1C',
        900: '#7F0000',
    },

    // Background
    background: {
        primary: '#FFFFFF',
        secondary: '#F8F9FA',
        tertiary: '#E9ECEF',
    },

    // Text
    text: {
        primary: '#212529',
        secondary: '#6C757D',
        muted: '#ADB5BD',
        inverse: '#FFFFFF',
    },
} as const;

// CSS Variables export
export const cssVariables = `
  :root {
    --color-primary: ${colors.primary[700]};
    --color-primary-light: ${colors.primary[500]};
    --color-primary-dark: ${colors.primary[900]};
    
    --color-neutral: ${colors.neutral[600]};
    --color-neutral-light: ${colors.neutral[300]};
    --color-neutral-dark: ${colors.neutral[900]};
    
    --color-success: ${colors.success[700]};
    --color-warning: ${colors.warning[700]};
    --color-error: ${colors.error[700]};
    
    --color-background: ${colors.background.primary};
    --color-background-alt: ${colors.background.secondary};
    
    --color-text: ${colors.text.primary};
    --color-text-secondary: ${colors.text.secondary};
    --color-text-muted: ${colors.text.muted};
  }
`;
