import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        sans:  ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-space-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink:    '#100E1C',
        'ink-2':'#15122A',
        deep:   '#1B1638',
        panel:  '#211B45',
        mira:   '#6354F0',
        lilac:  '#C8BCFF',
        spark:  '#DBD2FF',
        paper:  '#F6F5FB',
        grey:   '#8E88AD',
        'grey-2':'#B6B1CC',
      },
    },
  },
  plugins: [],
}
export default config
