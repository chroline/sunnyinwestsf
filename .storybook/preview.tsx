import React from 'react'
import type { Preview } from '@storybook/nextjs-vite'
import localFont from 'next/font/local'
import '../app/globals.css'

// Same fonts app/layout.tsx mounts; stories render outside the Next.js root
// layout, so without this the HUD falls back to system sans/serif.
const sfPro = localFont({
  variable: '--font-sf-pro',
  src: [
    { path: '../app/fonts/SF-Pro-Text-Light.woff2', weight: '300', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Text-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Text-RegularItalic.woff2', weight: '400', style: 'italic' },
    { path: '../app/fonts/SF-Pro-Text-Bold.woff2', weight: '700', style: 'normal' },
  ],
})

const newYork = localFont({
  variable: '--font-new-york',
  src: [
    { path: '../app/fonts/NewYorkExtraLarge-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/NewYorkExtraLarge-RegularItalic.woff2', weight: '400', style: 'italic' },
  ],
})

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className={`${sfPro.variable} ${newYork.variable} font-sans antialiased`}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
