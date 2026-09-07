import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Digital Hub — твой профиль в команде', description: 'Опросник для первых студентов-резидентов Digital Hub: мотивация, команда, рабочий ритм и персональные рекомендации.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
