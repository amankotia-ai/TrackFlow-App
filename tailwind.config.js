/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  	extend: {
		colors: {
			primary: {
				'50': '#f7f7f7',
				'100': '#e3e3e3',
				'200': '#c8c8c8',
				'300': '#a4a4a4',
				'400': '#818181',
				'500': '#666666',
				'600': '#515151',
				'700': '#434343',
				'800': '#383838',
				'900': '#000000',
				DEFAULT: '#000000',
				foreground: '#ffffff'
			},
			background: '#ffffff',
			foreground: '#000000',
			card: {
				DEFAULT: '#ffffff',
				foreground: '#000000'
			},
			popover: {
				DEFAULT: '#ffffff',
				foreground: '#000000'
			},
			muted: {
				DEFAULT: '#f7f7f7',
				foreground: '#666666'
			},
			accent: {
				DEFAULT: '#f7f7f7',
				foreground: '#000000'
			},
			destructive: {
				DEFAULT: '#ef4444',
				foreground: '#ffffff'
			},
			border: '#e3e3e3',
			input: '#e3e3e3',
			ring: '#000000',
  			secondary: {
  				'50': '#f8fafc',
  				'100': '#f1f5f9',
  				'200': '#e2e8f0',
  				'300': '#cbd5e1',
  				'400': '#94a3b8',
  				'500': '#64748b',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1e293b',
  				'900': '#0f172a'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			]
  		}
  	}
  },
  plugins: [],
};
