import { PaginaConfirmar, metaConfirmar } from '@/components/PaginaConfirmar';

export const metadata = metaConfirmar('pt');

export default async function Pagina({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return <PaginaConfirmar lang="pt" token={(await searchParams).t} />;
}
