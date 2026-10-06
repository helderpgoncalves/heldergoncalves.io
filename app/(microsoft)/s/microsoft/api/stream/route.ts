import type { NextRequest } from 'next/server';
import { ipDe, json } from '@/lib/api';
import { hub } from '@/lib/microsoft/tempo-real';
import type { Evento } from '@/lib/microsoft/tipos';

export const dynamic = 'force-dynamic';

const POR_IP = 5;
const ligacoesPorIp = new Map<string, number>();

// Server-Sent Events: o browser abre esta ligação e o servidor empurra cada mudança.
export function GET(req: NextRequest) {
  const ip = ipDe(req);
  if (hub.cheio || (ligacoesPorIp.get(ip) ?? 0) >= POR_IP) return json({ erro: 'limite' }, 429);
  ligacoesPorIp.set(ip, (ligacoesPorIp.get(ip) ?? 0) + 1);

  const texto = new TextEncoder();
  let terminar = () => {};

  const stream = new ReadableStream({
    start(ctrl) {
      const enviar = (e: Evento) => ctrl.enqueue(texto.encode(`event: ${e.tipo}\ndata: ${JSON.stringify(e.dados)}\n\n`));
      ctrl.enqueue(texto.encode('retry: 3000\n\n'));

      // Um sinal de vida de vez em quando, para nenhum intermediário fechar a ligação por parada.
      const batimento = setInterval(() => ctrl.enqueue(texto.encode(': ♥\n\n')), 20_000);
      const desligar = hub.subscrever(enviar);
      let fechado = false;
      terminar = () => {
        if (fechado) return;
        fechado = true;
        clearInterval(batimento);
        desligar();
        const n = (ligacoesPorIp.get(ip) ?? 1) - 1;
        if (n <= 0) ligacoesPorIp.delete(ip); else ligacoesPorIp.set(ip, n);
        try { ctrl.close(); } catch { /* já estava fechada */ }
      };
      req.signal.addEventListener('abort', terminar);

      void hub.estado().then((estado) => { if (!fechado) enviar({ tipo: 'estado', dados: estado }); });
    },
    cancel() { terminar(); },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
