/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './design-system/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
            },
            colors: {
                primary: {
                    50: '#E8EEF4',
                    100: '#C5D5E4',
                    200: '#9EB9D3',
                    300: '#779DC1',
                    400: '#5988B4',
                    500: '#3B73A7',
                    600: '#2F5C86',
                    700: '#1E3A5F',
                    800: '#152A45',
                    900: '#0D1A2B',
                },
            },
        },
    },
    plugins: [],
};
