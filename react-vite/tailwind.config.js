/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: '#004ac6',
        'on-primary': '#ffffff',
        'primary-container': '#2563eb',
        'on-primary-container': '#eeefff',
        secondary: '#505f76',
        'on-secondary': '#ffffff',
        'secondary-container': '#e2e8f0',
        'on-secondary-container': '#1e293b',
        surface: '#ffffff',
        'on-surface': '#0f172a',
        'surface-variant': '#f1f5f9',
        'on-surface-variant': '#64748b',
        outline: '#cbd5e1',
        'outline-variant': '#e2e8f0',
        error: '#dc2626',
        'error-container': '#fee2e2',
        background: '#f8fafc',
        'on-background': '#131b2e',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        full: '9999px',
      },
      spacing: {
        'sidebar-width': '300px',
        'sidebar-collapsed': '72px',
        'margin-page': '40px',
      },
      maxWidth: {
        container: '1440px',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
}
