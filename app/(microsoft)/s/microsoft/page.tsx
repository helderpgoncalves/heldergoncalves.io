import { Painel } from '@/components/microsoft/Painel';
import { hub } from '@/lib/microsoft/tempo-real';

// Sempre fresco: o primeiro ecrã já traz o preço do momento, e o tempo real toma conta a seguir.
export const dynamic = 'force-dynamic';

export default async function Pagina() {
  return <Painel inicial={await hub.estado()} />;
}
