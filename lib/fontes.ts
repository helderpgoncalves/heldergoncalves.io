import { Geist, Geist_Mono, Instrument_Serif, Newsreader } from 'next/font/google';

// Quatro vozes, cada uma com um trabalho:
//  Geist — interface; Geist Mono — etiquetas e dados;
//  Instrument Serif — títulos grandes; Newsreader — leitura longa (eixo óptico; sem preload, para a landing não a puxar).
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const leitura = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['opsz'], variable: '--font-leitura', display: 'swap', preload: false });

export const fontes = `${sans.variable} ${mono.variable} ${serif.variable} ${leitura.variable}`;
