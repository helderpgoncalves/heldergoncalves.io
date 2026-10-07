// Revê um ou mais textos do blog contra as regras da casa: português de Portugal, sem travessões nem
// tiques de texto de máquina, voz pessoal e cabeçalho completo.
//
//   npm run texto -- <slug> [<slug> ...] [--lang pt|en]     (sem slugs: todos os textos dessa língua)
//
// Sai com código 1 se houver erros. Os avisos pedem uma segunda leitura, não bloqueiam.
import { artigos } from '../lib/md.mjs';

const args = process.argv.slice(2);
const lang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'pt';
const slugs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--lang');
const lista = artigos(lang).filter((a) => !slugs.length || slugs.includes(a.slug));
if (!lista.length) { console.error(`Nenhum texto encontrado em content/${lang}/${slugs.length ? ' para ' + slugs.join(', ') : ''}.`); process.exit(1); }

// [expressão, mensagem, só português?]
const ERROS = [
  [/\[(PREENCHER|TODO|XXX)[^\]]*\]/gi, 'marcador por preencher: falta um dado real do Hélder antes de publicar'],
  [/[—–]/g, 'travessão (— ou –): reescreve com vírgula, dois pontos, ponto final ou parênteses'],
  [/ - | -- |--/g, 'hífen usado como travessão: reescreve a frase'],
  [/\p{Extended_Pictographic}/gu, 'emoji: não leva emojis'],
  [/\bvocês?\b/gi, 'brasileirismo "você": usa tu (ou a forma impessoal)', true],
  [/\b(tela|arquivos?|celular(es)?|usuários?|cadastr\w+|deletar|baixar|mouse|ônibus|bacana|pra|né)\b/gi, 'brasileirismo: usa ecrã, ficheiro, telemóvel, utilizador, registo, apagar, descarregar, rato, autocarro, para', true],
  [/\best(ou|ás|á|amos|ão|ava|avam|iv\w+)\s+\w+(ando|endo|indo)\b/gi, 'gerúndio brasileiro: em Portugal diz-se "estar a" + infinitivo', true],
  [/\b(acção|acções|direcção|projecto|projectos|actual|actuais|actualiz\w+|exacto|exactamente|óptimo|optimiz\w+|activ[oa]s?|objecto|electr\w+)\b/gi, 'grafia antiga: o site usa o Acordo Ortográfico (ação, direção, projeto, atual, exato, ótimo, ativo, objeto, eletr…)', true],
];
const AVISOS = [
  [/\.\.\./g, 'reticências com três pontos: usa "…"'],
  [/"[^"\n]{1,200}"/g, 'aspas retas: usa «aspas portuguesas»'],
  [/!/g, 'ponto de exclamação: usa muito pouco', 'contar'],
  [/\b(mergulh\w+|no mundo de hoje|no panorama atual|em suma|em conclusão|vale a pena (notar|destacar|ressaltar|salientar)|é importante (notar|salientar|destacar)|desbloque\w+|jornada|revolucion\w+|game.?changer|holístic\w+|sinergia\w*|alavanc\w+|ecossistema|poderos[oa] ferramenta|sem dúvida|navegar (por|pelo|pela)|neste artigo|neste texto|nos dias de hoje|cada vez mais|numa era)\b/gi, 'tique de texto de máquina ou de folheto: diz de outra maneira, mais direta e mais tua'],
  [/\bnão é (apenas|só|simplesmente|meramente) [^.!?]{0,80}[,;] ?(é|mas|e sim)\b/gi, 'a fórmula "não é só X, é Y": quase sempre dispensável'],
  [/\b(clica aqui|clique aqui|carrega aqui|ver mais|saiba mais)\b/gi, 'texto de ligação vazio: a ligação deve dizer para onde leva'],
  [/\b(legal|ótimo|incrível|fantástic[oa]|extraordinári[oa]|espetacular|perfeit[oa])\b/gi, 'adjetivo de vitrine: mostra em vez de elogiar', true],
];

const tirarCodigo = (md) => md.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)]*\)/g, '] ');
const linhaDe = (texto, i) => texto.slice(0, i).split('\n').length;
let erros = 0, avisos = 0;

for (const a of lista) {
  const corpo = tirarCodigo(a.md);
  const tudo = `${a.titulo}\n${a.resumo}\n${corpo}`;
  const achados = [];
  const procura = (regras, nivel) => {
    for (const [re, msg, soPt] of regras) {
      if (soPt === true && a.lang !== 'pt') continue;
      const ocorrencias = [...tudo.matchAll(re)];
      if (!ocorrencias.length) continue;
      if (soPt === 'contar') { if (ocorrencias.length > 1) achados.push([nivel, `${ocorrencias.length}× ${msg}`]); continue; }
      for (const m of ocorrencias.slice(0, 4)) achados.push([nivel, `${msg}  «${tudo.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25).replace(/\n/g, ' ')}»`]);
    }
  };
  procura(ERROS, 'erro');
  procura(AVISOS, 'aviso');

  // Cabeçalho
  if (a.resumo.length < 70 || a.resumo.length > 165) achados.push(['aviso', `resumo com ${a.resumo.length} caracteres (ideal 70 a 160)`]);
  if (a.titulo.length > 70) achados.push(['aviso', `título com ${a.titulo.length} caracteres (o Google corta aos 60 a 70)`]);
  const maiusc = a.titulo.split(/\s+/).slice(1).filter((p) => /^\p{Lu}/u.test(p) && p.length > 3).length;
  if (maiusc >= 3) achados.push(['aviso', 'título com maiúsculas a mais: em português só a primeira palavra e os nomes próprios']);
  if (a.etiquetas.length < 1 || a.etiquetas.length > 4) achados.push(['aviso', `${a.etiquetas.length} etiquetas (usa 1 a 4, reaproveitando as que já existem)`]);
  if (a.data > new Date().toISOString().slice(0, 10)) achados.push(['aviso', 'data no futuro: o texto aparece logo no site, mesmo com data futura. Confirma a data']);
  if (a.fonte && !/^https?:\/\//.test(a.fonte.url)) achados.push(['erro', 'fonte.url tem de começar por http(s)://']);

  // Corpo
  const palavras = a.palavras;
  if (palavras < 250) achados.push(['aviso', `só ${palavras} palavras: um texto pessoal curto tem pelo menos 250`]);
  if (palavras > 1800) achados.push(['aviso', `${palavras} palavras: considera dividir em dois textos`]);
  const pessoais = (corpo.match(/\b(eu|me|meu|minha|meus|minhas|comigo|mim|fiz|achei|pensei|descobri|encontrei|percebi|aprendi|gosto|dei|vi|li|usei|escrevi|tentei|errei)\b/gi) ?? []).length;
  if (a.lang === 'pt' && pessoais < 4) achados.push(['aviso', `pouca voz pessoal (${pessoais} marcas de primeira pessoa): conta o que viveste, não só o que pensas`]);
  const frases = corpo.replace(/^#.*$/gm, '').split(/(?<=[.!?…:])\s+/).filter((f) => f.split(/\s+/).length > 2);
  const media = frases.reduce((n, f) => n + f.split(/\s+/).length, 0) / Math.max(1, frases.length);
  if (media > 24) achados.push(['aviso', `frases com ${media.toFixed(0)} palavras em média: corta, fala como falas`]);
  for (const p of corpo.split(/\n{2,}/)) if (p.split(/\s+/).length > 130) achados.push(['aviso', `parágrafo com mais de 130 palavras: «${p.trim().slice(0, 50)}…»`]);
  if (/^#{2,3}\s*(conclusão|conclusion|em resumo|considerações finais|summary)\s*$/im.test(a.md)) achados.push(['aviso', 'secção "Conclusão": termina quando já disseste o que tinhas a dizer']);
  for (const m of a.md.matchAll(/!\[([^\]]*)\]\(/g)) if (!m[1].replace(/\|\s*larga\s*$/i, '').trim()) achados.push(['erro', `imagem sem descrição (alt) na linha ${linhaDe(a.md, m.index)}`]);
  if (/(^|\s)https?:\/\/\S+/.test(a.md.replace(/\]\([^)]*\)/g, '').replace(/^\s*url:.*$/gm, ''))) achados.push(['aviso', 'endereço solto no texto: mete-o numa ligação com texto que diga para onde vai']);

  const e = achados.filter(([n]) => n === 'erro').length;
  erros += e; avisos += achados.length - e;
  console.log(`\n${e ? '✗' : achados.length ? '!' : '✓'} ${a.lang}/${a.slug}  (${palavras} palavras, ${a.minutos} min)`);
  for (const [n, msg] of achados) console.log(`   ${n === 'erro' ? '✗' : '!'} ${msg}`);
}
console.log(`\n${erros ? '✗' : '✓'} ${lista.length} texto(s): ${erros} erro(s), ${avisos} aviso(s)`);
process.exit(erros ? 1 : 0);
