#!/usr/bin/env python3
"""
As verificações estáticas de heldergoncalves.io.

Este repositório não tem suite de testes — tem isto. Corre em menos de
um segundo, não constrói nada, não instala nada e não abre browser
nenhum, o que é a razão de existir: a máquina onde isto costuma correr
está a servir produção.

Oito verificações:
  1. tamanho de ficheiro           nenhum passa das 400 linhas
  2. imports do cliente            batem certo com os exports
  3. imports do servidor           idem
  4. imports dos scripts de build  idem
  5. chavetas do CSS               nenhuma regra ficou partida
  6. paridade das línguas          pt e en têm as mesmas chaves
  7. segredos                      nada que pareça uma chave
  8. ficheiros órfãos              nada importa o que já não existe

Saída 0 se está tudo bem, 1 se não.
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MAX_LINES = 400

problems = []
notes = []


def fail(check, message):
    problems.append((check, message))


def rel(path):
    return os.path.relpath(path, ROOT)


def walk(subdir, *exts):
    base = os.path.join(ROOT, subdir)
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in ('node_modules', 'dist', '.astro', '.git')]
        for name in filenames:
            if name.endswith(exts):
                yield os.path.join(dirpath, name)


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


# ── 1. Tamanho de ficheiro ───────────────────────────────────────────
def check_sizes():
    watched = ('.ts', '.js', '.mjs', '.astro', '.css')
    biggest = []
    for sub in ('src', 'server', 'scripts'):
        for path in walk(sub, *watched):
            n = len(read(path).split('\n'))
            biggest.append((n, rel(path)))
            if n > MAX_LINES:
                fail('tamanho', '%s tem %d linhas (tecto: %d)' % (rel(path), n, MAX_LINES))
    biggest.sort(reverse=True)
    if biggest:
        notes.append('maior ficheiro: %s, %d linhas' % (biggest[0][1], biggest[0][0]))


# ── 2 e 3. Imports batem certo com os exports ────────────────────────
EXPORT_DECL = re.compile(r'^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)', re.M)
EXPORT_LIST = re.compile(r'^export\s*(?:type\s*)?\{([^}]*)\}', re.M)
IMPORT_LIST = re.compile(r"import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'(\.[^']+)'")


def exports_of(source):
    names = set(EXPORT_DECL.findall(source))
    for block in EXPORT_LIST.findall(source):
        for part in block.split(','):
            part = part.strip().replace('type ', '')
            if part:
                names.add(part.split(' as ')[-1].strip())
    return names


def check_imports(label, files):
    table = {os.path.normpath(f): exports_of(read(f)) for f in files}
    for path in files:
        source = read(path)
        for block, target in IMPORT_LIST.findall(source):
            resolved = os.path.normpath(os.path.join(os.path.dirname(path), target))
            for part in block.split(','):
                name = part.strip().replace('type ', '').split(' as ')[0].strip()
                if not name:
                    continue
                if resolved not in table:
                    fail(label, '%s importa de %s, que não existe' % (rel(path), target))
                elif name not in table[resolved]:
                    fail(label, '%s importa `%s` de %s, que não o exporta' % (rel(path), name, target))


# ── 4. Chavetas do CSS ───────────────────────────────────────────────
def check_css():
    for path in walk('src/styles', '.css'):
        source = read(path)
        opened, closed = source.count('{'), source.count('}')
        if opened != closed:
            fail('css', '%s tem %d `{` e %d `}`' % (rel(path), opened, closed))
        body = source.split('*/', 1)[-1].lstrip()
        if body.startswith(('}', ';')):
            fail('css', '%s começa a meio de uma regra' % rel(path))


# ── 5. As duas línguas ───────────────────────────────────────────────
def keys_of(source):
    """As chaves do objecto, com o caminho até elas. Aproximado de
    propósito: conta a indentação, que neste ficheiro é regular."""
    found = set()
    stack = []
    for line in source.split('\n'):
        m = re.match(r'^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', line)
        if not m:
            continue
        depth = len(m.group(1)) // 2
        stack = stack[:depth]
        stack.append(m.group(2))
        found.add('.'.join(stack))
    return found


def check_copy():
    """Cada `x.pt.ts` em src/config tem um `x.en.ts` com as mesmas chaves."""
    folder = os.path.join(ROOT, 'src/config')
    pairs = sorted(f for f in os.listdir(folder) if f.endswith('.pt.ts'))
    if not pairs:
        fail('línguas', 'falta um dos ficheiros de texto')
        return
    total = 0
    for name in pairs:
        pt_path = os.path.join(folder, name)
        en_path = os.path.join(folder, name[:-6] + '.en.ts')
        if not os.path.exists(en_path):
            fail('línguas', 'falta o par inglês de `%s`' % name)
            continue
        pt, en = keys_of(read(pt_path)), keys_of(read(en_path))
        for key in sorted(pt - en):
            fail('línguas', '`%s` existe em pt e falta em en (%s)' % (key, name))
        for key in sorted(en - pt):
            fail('línguas', '`%s` existe em en e falta em pt (%s)' % (key, name))
        total += len(pt)
    notes.append('%d chaves de texto em cada língua' % total)


# ── 6. Segredos ──────────────────────────────────────────────────────
SECRET = re.compile(
    r'(sk-[A-Za-z0-9]{16,}|re_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|'
    r'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
)


def check_secrets():
    try:
        tracked = subprocess.run(
            ['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, timeout=20
        ).stdout.split('\n')
    except Exception:
        notes.append('sem git: verificação de segredos saltada')
        return
    for name in tracked:
        if not name.strip():
            continue
        path = os.path.join(ROOT, name)
        if not os.path.isfile(path) or os.path.getsize(path) > 2_000_000:
            continue
        try:
            source = read(path)
        except (UnicodeDecodeError, OSError):
            continue
        if SECRET.search(source):
            fail('segredos', 'algo com forma de chave em %s' % name)
        if name.startswith('data/'):
            fail('segredos', '%s está no repositório — data/ nunca entra' % name)


# ── 7. Ficheiros órfãos ──────────────────────────────────────────────
def check_orphans():
    for path in list(walk('src', '.astro', '.ts')) + list(walk('src/scripts', '.js')):
        source = read(path)
        for target in re.findall(r"from\s*'(\.[^']+)'", source):
            base = os.path.normpath(os.path.join(os.path.dirname(path), target))
            if any(os.path.exists(base + ext) for ext in ('', '.js', '.ts', '.mjs', '.astro', '/index.js')):
                continue
            fail('órfãos', '%s aponta para %s, que não existe' % (rel(path), target))


def main():
    check_sizes()
    check_imports('imports do cliente', list(walk('src/scripts', '.js')))
    check_imports('imports do servidor', list(walk('server', '.mjs')))
    check_imports('imports dos scripts', list(walk('scripts', '.mjs')))
    check_css()
    check_copy()
    check_secrets()
    check_orphans()

    for note in notes:
        print('  ' + note)
    if not problems:
        print('\nTudo certo.')
        return 0
    print('')
    for check, message in problems:
        print('  [%s] %s' % (check, message))
    print('\n%d problema(s).' % len(problems))
    return 1


if __name__ == '__main__':
    sys.exit(main())
