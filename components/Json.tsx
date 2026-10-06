// Dados estruturados para o Google. O "<" é escapado para o JSON não conseguir fechar a etiqueta.
export function Json({ dados }: { dados: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, '\\u003c') }} />;
}
