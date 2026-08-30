import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cash Save — Productivité & Finances',
    short_name: 'CashSave',
    description: 'Transformez un tableur de suivi de productivité et de finances en une application web automatisée et gamifiée.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#6366F1',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
