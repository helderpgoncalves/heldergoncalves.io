import { PaginaConfirmar, metaConfirmar } from '@/components/PaginaConfirmar';

export const metadata = metaConfirmar('en');

export default async function Pagina({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return <PaginaConfirmar lang="en" token={(await searchParams).t} />;
}
