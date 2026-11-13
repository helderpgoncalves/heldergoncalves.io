import { SITE } from './site';

// A página de bio (bio.heldergoncalves.io). Os contactos são os ícones do topo; os destaques, os cartões.
// Para acrescentar um contacto ou um cartão: uma linha aqui. `destaque` pinta o cartão com a cor do pôr do sol.
export type Contacto = { id: 'linkedin' | 'whatsapp' | 'email' | 'github' | 'instagram'; rotulo: string; url?: string }; // sem `url`: abre o painel do WhatsApp
type Cartao = { rotulo: string; nota: string; url: string; destaque?: boolean };

export const CONTACTOS: readonly Contacto[] = [
  { id: 'linkedin', rotulo: 'LinkedIn', url: SITE.linkedin },
  { id: 'whatsapp', rotulo: 'WhatsApp' },
  { id: 'email', rotulo: 'E-mail', url: `mailto:${SITE.email}` },
  { id: 'github', rotulo: 'GitHub', url: SITE.github },
  { id: 'instagram', rotulo: 'Instagram', url: SITE.instagram },
];

export const CARTOES_BIO: readonly Cartao[] = [
  { rotulo: 'Novelo, vencedor do Hack4Guimarães', nota: 'Como ganhámos, em cinco dias, com agentes de IA', url: `${SITE.canonico}/blog/como-ganhamos-o-hack4guimaraes-com-o-novelo`, destaque: true },
  { rotulo: 'O blog', nota: 'Ideias, dinheiro, vida e software', url: `${SITE.canonico}/blog` },
  { rotulo: 'Experimentar o Novelo', nota: 'novelo.helder.si', url: 'https://novelo.helder.si' },
  { rotulo: 'O site', nota: 'heldergoncalves.io', url: SITE.canonico },
  { rotulo: 'Falar comigo', nota: SITE.email, url: `mailto:${SITE.email}` },
];
