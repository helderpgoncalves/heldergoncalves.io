# ─────────────────────────────────────────────────────────────────────
# Tudo o que se mede: tamanhos de corpo, janelas em segundos, quantos
# pedidos por visitante, quantos no total.
#
# Saiu de `config.py` quando esse passou do tecto das 400 linhas, e é a
# divisão certa: nada disto lê o ambiente. `config.py` continua a ser o
# único ficheiro que toca em `os.environ` — isto são constantes do
# programa, não decisões de quem o instala, e continuam a importar-se de
# lá (`from app.config import LIMITS`), que é onde toda a gente as
# procura.
#
# Nenhum número mágico espalhado pelo código: quem quiser apertar ou
# alargar mexe num sítio.
#
# Não é `frozen`, ao contrário dos blocos de `config.py` — de propósito:
# os testes afinam um limite ou outro (p.ex. `token_min_age`) sem
# esperar pelo relógio a sério. Em produção, ninguém lhe mexe depois do
# arranque.
# ─────────────────────────────────────────────────────────────────────
from dataclasses import dataclass


@dataclass
class Limits:
    body: int = 8 * 1024
    message: int = 4000
    subject: int = 160
    email: int = 160

    per_ip: int = 3
    per_ip_window: int = 15 * 60
    global_: int = 40
    global_window: int = 60 * 60

    token_per_ip: int = 40
    token_window: int = 10 * 60
    token_min_age: float = 3.5
    token_max_age: int = 45 * 60

    # Subscrever é barato mas não é de graça: cada pedido manda um email.
    sub_per_ip: int = 3
    sub_per_ip_window: int = 60 * 60
    sub_global: int = 120
    sub_global_window: int = 60 * 60
    sub_token_min_age: float = 1.2

    # Conversa: o custo é real, por isso os limites são a sério.
    chat_body: int = 16 * 1024
    chat_turn: int = 600
    chat_total: int = 4000
    chat_history: int = 8
    chat_out_tokens: int = 400
    chat_per_ip: int = 15
    chat_per_ip_window: int = 60 * 60
    chat_per_ip_day: int = 50
    chat_day_window: int = 24 * 60 * 60
    chat_global_day: int = 600

    mcp_per_ip: int = 60

    # Sessões: cada pedido de magic link é um email — poucos por IP, um
    # tecto global. Não há tentativas a limitar: a ligação em si é a
    # prova, não um código a adivinhar.
    auth_per_ip: int = 5
    auth_per_ip_window: int = 60 * 60
    auth_global: int = 200
    auth_global_window: int = 60 * 60
    # Abrir a ligação: raro por IP, mas alguém pode abri-la duas vezes
    # sem querer (o próprio Mail a pré-carregar, por exemplo).
    magic_verify_per_ip: int = 15
    magic_verify_window: int = 15 * 60

    # Entrar com a Google: só o pedido do `state` e a troca do código —
    # não há tentativas para limitar, é a Google que faz essa parte.
    google_start_per_ip: int = 20
    google_start_window: int = 15 * 60

    # Comentários: mais raros do que mensagens de contacto, mas com o
    # mesmo espírito — poucos por IP, um teto global.
    comment_per_ip: int = 5
    comment_per_ip_window: int = 60 * 60
    comment_global: int = 80
    comment_global_window: int = 60 * 60
    comments_per_post: int = 200  # o que se devolve de uma vez, no máximo

    # Reações: um toque, não um formulário — o limite é generoso.
    reaction_per_ip: int = 60
    reaction_per_ip_window: int = 10 * 60

    # Escritos: só o dono, mas o editor guarda sozinho enquanto se
    # escreve — o limite tem de deixar passar um rascunho a cada poucos
    # segundos. O corpo é um texto inteiro, muito acima de `body`.
    escritos_per_ip: int = 300
    escritos_window: int = 10 * 60
    escrito_body: int = 256 * 1024
    escrito_tags: int = 10
    # Uma imagem de escrito vai para o repositório num commit, em
    # base64 — o que a torna um terço maior a caminho do GitHub. 4 MB
    # de original é muito para uma imagem de blog e pouco para o que a
    # API de conteúdos aguenta.
    escrito_image: int = 4 * 1024 * 1024
    # Avisar a lista é uma volta ao fornecedor de email por pessoa. Sai
    # em segundo plano, mas com tecto: uma lista que cresça sem conta
    # não pode transformar um clique em «Publicar» numa tarde inteira.
    announce_batch: int = 4
    announce_max: int = 5000

    # Reuniões: a agenda é leve de ler, e marcar é raro.
    agenda_per_ip: int = 120
    agenda_window: int = 10 * 60
    book_per_ip: int = 10
    book_window: int = 60 * 60
    book_per_user_day: int = 3
    meeting_note: int = 1000

    # Bolsa: cada pedido pode trazer vários títulos, e a cache faz o resto.
    stocks_per_request: int = 12
    stocks_per_ip: int = 120
    stocks_per_ip_window: int = 10 * 60
    stocks_global: int = 3000
    stocks_global_window: int = 10 * 60
    # A procura dispara a cada letra; a ficha é uma por título aberto.
    stocks_search_per_ip: int = 240
    stocks_search_window: int = 10 * 60
    stocks_query: int = 40

    # Ficheiros: ver e listar é barato; largar um ficheiro é escrever no
    # disco e mandar um email, por isso tem janela própria e mais
    # apertada. O corpo do pedido é o ficheiro em base64 — um terço
    # maior do que os bytes — e o tecto de `read_json` conta-se sobre
    # ele, não sobre o original.
    ficheiros_per_ip: int = 240
    ficheiros_window: int = 10 * 60
    ficheiro_upload_per_ip: int = 40
    ficheiro_upload_window: int = 60 * 60
    ficheiro_upload_global: int = 400
    ficheiro_upload_global_window: int = 60 * 60
    # 25 MB por ficheiro chega para um PDF com imagens ou um zip de
    # entregáveis, e 250 MB por pasta impede que uma partilha esquecida
    # encha o volume sozinha.
    ficheiro_max: int = 25 * 1024 * 1024
    pasta_max: int = 250 * 1024 * 1024
    pasta_ficheiros: int = 200
    pastas_max: int = 300
    ficheiro_nome: int = 160
    pasta_nome: int = 120

    # Mail: a caixa de entrada do dono. Ler é barato e o dono abre-a
    # muitas vezes; redigir um rascunho é uma ida ao modelo, e responder
    # é um email a sair — por isso cada um tem a sua janela, e a mais
    # apertada é a que gasta dinheiro.
    mail_per_ip: int = 240
    mail_window: int = 10 * 60
    mail_draft_per_ip: int = 30
    mail_draft_window: int = 60 * 60
    mail_reply_per_ip: int = 40
    mail_reply_window: int = 60 * 60
    # O excerto que a lista mostra por baixo do assunto: cortado no
    # servidor, como nas conversas — mandar a mensagem inteira de cada
    # pessoa só para mostrar duas linhas era pagar tudo para deitar fora
    # quase tudo.
    mail_preview: int = 200
    mail_conversations: int = 200
    mail_messages: int = 200
    # O rascunho é um email curto, não um texto: o tecto do modelo é
    # baixo de propósito, e o contexto que lhe vai é só o que cabe.
    mail_draft_tokens: int = 700
    mail_context: int = 6000
    # A consulta com que se procura na documentação: o assunto mais o
    # corpo da mensagem, cortados — procurar com uma palavra só devolve
    # a secção errada, e procurar com um email inteiro não devolve nada.
    mail_query: int = 400


    # Finanças: é tudo do dono, é uma pessoa só, e ler é barato — a
    # app pede o ano inteiro de uma vez. Escrever é raro (lançar uma
    # fatura, fechar uma fase), mas partilhar um PDF é escrever no
    # disco, e por isso tem a janela apertada das Ficheiros.
    financas_per_ip: int = 240
    financas_window: int = 10 * 60
    financas_escrita_per_ip: int = 120
    financas_escrita_window: int = 60 * 60
    financas_nome: int = 120
    financas_numero: int = 60
    financas_notas: int = 400
    # Um milhão de euros, em cêntimos. Não é um limite de negócio — é o
    # que impede um zero a mais de virar um gráfico ilegível.
    financas_valor: int = 100_000_000
    financas_linhas: int = 5000


LIMITS = Limits()
