import type { Metadata } from 'next';
import { Moderar } from '@/components/microsoft/Moderar';

export const metadata: Metadata = { title: 'Moderar', robots: { index: false, follow: false } };

export default function Pagina() {
  return (
    <main className="min-h-svh bg-noite text-nevoa">
      <Moderar />
    </main>
  );
}
