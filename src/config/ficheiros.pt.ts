// ─────────────────────────────────────────────────────────────────────
// Os Ficheiros — as pastas que o Hélder partilha com cada cliente.
// Em português. As duas línguas têm exactamente as mesmas chaves; ver
// copy.ts, que as junta e faz o TypeScript garanti-lo.
//
// Ficheiro próprio, como o do editor: `apps.pt.ts` já vai perto do
// tecto das 400 linhas, e o texto de uma app cabe bem sozinho.
// ─────────────────────────────────────────────────────────────────────

export const FICHEIROS_PT = {
  lead: 'As pastas que partilho contigo. Larga aqui o que precisares de me mandar.',
  needsSession: 'Entra para ver as pastas que partilho contigo.',
  signIn: 'Entrar',
  folders: 'Pastas',
  newFolder: 'Pasta nova',
  folderName: 'Nome da pasta',
  folderClient: 'Email do cliente',
  create: 'Criar',
  cancel: 'Cancelar',
  noFolders: 'Ainda não há nenhuma pasta partilhada contigo.',
  noFoldersOwner: 'Ainda não há pastas. Cria uma e atribui-a ao email de um cliente.',
  pick: 'Escolhe uma pasta à esquerda.',
  empty: 'A pasta está vazia. Larga aqui um ficheiro.',
  add: 'Adicionar ficheiro',
  drop: 'Larga para acrescentar à pasta',
  back: 'Pastas',
  close: 'Fechar',
  download: 'Descarregar',
  remove: 'Remover',
  removeFolder: 'Remover pasta',
  confirmFolder: 'Remover esta pasta e tudo o que está lá dentro?',
  confirmFile: 'Remover este ficheiro?',
  sending: 'A enviar…',
  by: 'Por',
  noPreview: 'Este tipo de ficheiro não se mostra aqui. Descarrega-o para o abrires.',
  used: 'ocupado',
  files: 'ficheiros',
  accepted: 'Imagens, PDF, texto, CSV, zip e documentos do Office. Até 25 MB cada.',
  errors: {
    generic: 'Não deu. Tenta outra vez.',
    formato: 'Esse tipo de ficheiro não entra aqui.',
    tamanho: 'Esse ficheiro é grande demais.',
    cheio: 'A pasta está cheia.',
    dados: 'Falta o nome da pasta ou o email do cliente.',
    limite: 'Devagar. Tenta daqui a pouco.',
    dono: 'Esse ficheiro não é teu.',
    inexistente: 'Isso já não existe.',
    sessao: 'A sessão acabou. Entra outra vez.',
  },
};
