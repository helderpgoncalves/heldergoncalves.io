import { json } from '@/lib/api';
import { hub } from '@/lib/microsoft/tempo-real';

export const dynamic = 'force-dynamic';

// O estado todo de uma vez: serve de recurso quando o tempo real não consegue ligar.
export async function GET() {
  return json(await hub.estado());
}
