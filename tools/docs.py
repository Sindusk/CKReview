"""Prints one block of CKReview's code and docs, so an agent reads what its task needs and no more.

Standard library only, read-only. Run from the repository root (any cwd works):

    python tools/docs.py help [command]               this text, or one command's lines
    python tools/docs.py outline <module|file>        a file's headings with line ranges and ~tokens; for a
                                                      .ts file also its top-level functions and constants
    python tools/docs.py digest <module> [...]        a module's DIGEST block (several modules at once)
    python tools/docs.py <module> "<heading>" [...]   one header section by its heading (a prefix, any case);
                                                      several headings print each
    python tools/docs.py <module|file> --grep <re>    only the lines matching a pattern (any case), with line
                                                      numbers; after a heading, only that section's lines
    python tools/docs.py fn <module|file> <name>...   a function / const / class whole with line numbers
    python tools/docs.py rule <ruleId|prefix>         where a rule id is emitted (file:line), and the header
                                                      lines that describe it
    python tools/docs.py rulings [--report X] [--boss "Y"] [--mechanic Z] [--pull N] [--rule R] [--full]
                                                      expectations/rulings.json filtered, one line per ruling
                                                      (never Read that 250 KB file whole)
    python tools/docs.py pitfalls [heading|--grep re] PITFALLS.md: its Index, one section, or matching bullets
    python tools/docs.py tools [area]                 the analysis tools under tools/ (and the skills' tools),
                                                      each with its usage lines; area filters, e.g. ffxiv/top
    python tools/docs.py check                        every detection module has a DIGEST under its budget and
                                                      every heading a DIGEST quotes exists in its file

<module> is a path under lib/mechanics without .ts ("ffxiv/top/omega-mf"), its tail ("top/omega-mf") or
its bare name ("omega-mf") when unique. Any other path is read as a file (README.md, PITFALLS.md, ...).
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MECH = os.path.join(ROOT, 'lib', 'mechanics')
DIGEST_BUDGET_CHARS = 9000  # README: "at most ~2k tokens"; ~4.5 chars a token for these comments

# A header heading: "// ── NAME ──", "// -- NAME --", "// ─── NAME ───"; Markdown "#" headings.
# "--" headings need their closing dashes: a comment line can start with a CLI flag ("--from-minutes").
TS_HEADING = re.compile(r'^\s*//\s*(?:──+\s*(.+?)\s*(?:──+)?|--+\s+(.+?)\s+--+)\s*$')
MD_HEADING = re.compile(r'^(#{1,6})\s+(.*\S)\s*$')
TS_DEF = re.compile(r'^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)')


def out(s=''):
    sys.stdout.write(s + '\n')


def die(msg):
    sys.stderr.write(msg + '\n')
    sys.exit(1)


def rel(p):
    return os.path.relpath(p, ROOT).replace('\\', '/')


def tokens(chars):
    return max(1, round(chars / 4))


def all_modules():
    found = []
    for d, _, files in os.walk(MECH):
        for f in files:
            if f.endswith('.ts'):
                found.append(os.path.join(d, f))
    return sorted(found)


def resolve(name):
    """A module name or a file path -> absolute path."""
    cand = os.path.join(ROOT, name)
    if os.path.isfile(cand):
        return cand
    key = name.replace('\\', '/').removesuffix('.ts')
    hits = [p for p in all_modules() if rel(p).removesuffix('.ts').endswith('/' + key) or
            rel(p).removesuffix('.ts') == key]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        die('ambiguous module "%s": %s' % (name, ', '.join(rel(h) for h in hits)))
    for base in ('', 'docs', 'lib/mechanics'):
        cand = os.path.join(ROOT, base, name)
        if os.path.isfile(cand):
            return cand
    die('no module or file "%s"' % name)


def read_lines(path):
    with open(path, encoding='utf-8') as f:
        return f.read().split('\n')


def headings(path, lines):
    """[(line index, level, title)]."""
    res = []
    md = path.endswith('.md')
    in_code = False
    for i, l in enumerate(lines):
        if md:
            if l.startswith('```'):
                in_code = not in_code
            m = None if in_code else MD_HEADING.match(l)
            if m:
                res.append((i, len(m.group(1)), m.group(2)))
        else:
            m = TS_HEADING.match(l)
            t = m and (m.group(1) or m.group(2) or '').strip('─- ')
            if t:
                res.append((i, 1, t))
    return res


def section_range(path, lines, title):
    hs = headings(path, lines)
    want = title.lower()
    matches = [h for h in hs if h[2].lower().startswith(want)] or [h for h in hs if want in h[2].lower()]
    if not matches:
        return None
    i, level, t = matches[0]
    end = len(lines)
    for j, lv, _ in hs:
        if j > i and lv <= level:
            end = j
            break
    if not path.endswith('.md'):
        # A header section ends where the comment block does, if sooner.
        for k in range(i + 1, end):
            if not lines[k].lstrip().startswith('//'):
                end = k
                break
    return i, end, t


def print_lines(lines, start, end, grep=None):
    rx = re.compile(grep, re.I) if grep else None
    for k in range(start, end):
        if rx is None or rx.search(lines[k]):
            out('%5d  %s' % (k + 1, lines[k]))


def cmd_outline(args):
    if not args:
        die('outline <module|file>')
    path = resolve(args[0])
    lines = read_lines(path)
    hs = headings(path, lines)
    out('%s  (%d lines, ~%d tokens)' % (rel(path), len(lines), tokens(sum(len(l) + 1 for l in lines))))
    bounds = [h[0] for h in hs] + [len(lines)]
    for n, (i, level, t) in enumerate(hs):
        size = sum(len(l) + 1 for l in lines[i:bounds[n + 1]])
        out('%s%5d-%-5d ~%5d  %s' % ('  ' * (level - 1), i + 1, bounds[n + 1], tokens(size), t))
    if path.endswith('.ts'):
        defs = [(i, m.group(1)) for i, l in enumerate(lines) for m in [TS_DEF.match(l)] if m]
        if defs:
            out('top-level definitions:')
            out('  ' + ', '.join('%s:%d' % (name, i + 1) for i, name in defs))


def digest_range(lines):
    s = next((i for i, l in enumerate(lines) if '── DIGEST' in l or '-- DIGEST' in l), None)
    if s is None:
        return None
    e = next((i for i in range(s + 1, len(lines)) if 'END DIGEST' in lines[i]), None)
    return s, (e + 1 if e is not None else s + 1)


def cmd_digest(args):
    if not args:
        die('digest <module> [...]')
    for name in args:
        path = resolve(name)
        lines = read_lines(path)
        r = digest_range(lines)
        out('== %s' % rel(path))
        if r is None:
            out('   (no DIGEST block; "outline %s" lists its sections)' % name)
            continue
        print_lines(lines, r[0], r[1])


def cmd_sections(name, rest):
    path = resolve(name)
    lines = read_lines(path)
    grep = None
    titles = []
    it = iter(rest)
    for a in it:
        if a == '--grep':
            grep = next(it, None)
        else:
            titles.append(a)
    if not titles:
        if grep is None:
            return cmd_outline([name])
        out('== %s --grep %s' % (rel(path), grep))
        print_lines(lines, 0, len(lines), grep)
        return
    for t in titles:
        r = section_range(path, lines, t)
        if r is None:
            out('== %s: no heading "%s" (outline lists them)' % (rel(path), t))
            continue
        out('== %s :: %s' % (rel(path), r[2]))
        print_lines(lines, r[0], r[1], grep)


def block_end(lines, i):
    """End (exclusive) of the brace block starting on line i, or the statement for a one-liner."""
    depth = 0
    seen = False
    for k in range(i, len(lines)):
        code = re.sub(r'//.*$', '', lines[k])
        code = re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`", '""', code)
        for ch in code:
            if ch in '{[(':
                depth += 1
                seen = True
            elif ch in '}])':
                depth -= 1
        if seen and depth <= 0:
            return k + 1
        if not seen and code.rstrip().endswith(';'):
            return k + 1
    return len(lines)


def cmd_fn(args):
    if len(args) < 2:
        die('fn <module|file> <name> [...]')
    path = resolve(args[0])
    lines = read_lines(path)
    for name in args[1:]:
        rx = re.compile(r'^\s*(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+'
                        + re.escape(name) + r'\b')
        hits = [i for i, l in enumerate(lines) if rx.match(l)]
        if not hits:
            out('== %s: no definition "%s"' % (rel(path), name))
            continue
        i = hits[0]
        # Include the doc comment right above it.
        s = i
        while s > 0 and lines[s - 1].lstrip().startswith(('//', '*', '/*')):
            s -= 1
        out('== %s :: %s' % (rel(path), name))
        print_lines(lines, s, block_end(lines, i))


def cmd_rule(args):
    if not args:
        die('rule <ruleId|prefix>')
    rid = args[0]
    rx = re.compile(re.escape(rid))
    for path in all_modules():
        lines = read_lines(path)
        hits = [i for i, l in enumerate(lines) if rx.search(l)]
        if not hits:
            continue
        r = digest_range(lines)
        head_end = next((i for i, l in enumerate(lines) if l.strip() and not l.lstrip().startswith('//')),
                        len(lines))
        code = [i for i in hits if i >= head_end]
        head = [i for i in hits if i < head_end]
        out('== %s  (code: %s)' % (rel(path), ', '.join(str(i + 1) for i in code) or 'none'))
        for i in head:
            tag = 'DIGEST' if r and r[0] <= i < r[1] else 'header'
            out('%5d  [%s] %s' % (i + 1, tag, lines[i].strip()[:160]))


def cmd_rulings(args):
    flt = {}
    full = False
    it = iter(args)
    for a in it:
        if a == '--full':
            full = True
        elif a.startswith('--'):
            flt[a[2:]] = next(it, '')
    with open(os.path.join(ROOT, 'expectations', 'rulings.json'), encoding='utf-8') as f:
        rulings = json.load(f)['rulings']

    def keep(r):
        for k, v in flt.items():
            if k == 'rule':
                specs = (r.get('mustFlag') or []) + (r.get('mustNotFlag') or [])
                if not any(str(s.get('ruleId', '')).startswith(v) for s in specs):
                    return False
            elif k == 'pull':
                if str(r.get('pull')) != v:
                    return False
            elif str(r.get(k, '')).lower() != v.lower():
                return False
        return True

    sel = [r for r in rulings if keep(r)]
    out('%d ruling(s)' % len(sel))
    for r in sel:
        def spec(s):
            return ' '.join('%s=%s' % (k, v) for k, v in s.items())
        must = '; '.join(spec(s) for s in r.get('mustFlag') or [])
        mustnot = '; '.join(spec(s) for s in r.get('mustNotFlag') or [])
        note = r.get('note', '')
        if not full and len(note) > 140:
            note = note[:137] + '...'
        out('%s %s P%s [%s] +{%s} -{%s} :: %s' % (r.get('date', ''), r.get('report', ''), r.get('pull', '*'),
                                                 r.get('mechanic', ''), must, mustnot, note))


def cmd_pitfalls(args):
    path = os.path.join(MECH, 'PITFALLS.md')
    lines = read_lines(path)
    if not args:
        r = section_range(path, lines, 'Index')
        if r is None:
            return cmd_outline([rel(path)])
        out('== PITFALLS.md :: %s' % r[2])
        print_lines(lines, r[0], r[1])
        return
    if args[0] == '--grep' and len(args) > 1:
        # Whole bullets whose text matches.
        rx = re.compile(args[1], re.I)
        i = 0
        while i < len(lines):
            if lines[i].startswith('- '):
                j = i + 1
                while j < len(lines) and lines[j].startswith('  '):
                    j += 1
                if any(rx.search(l) for l in lines[i:j]):
                    print_lines(lines, i, j)
                i = j
            else:
                i += 1
        return
    cmd_sections(rel(path), args)


def usage_lines(path):
    """A script's leading comment / docstring, at most 12 lines."""
    lines = read_lines(path)
    res = []
    for l in lines[:60]:
        s = l.strip()
        if s.startswith('#!'):
            continue
        if s.startswith(('//', '#', '*', '/*', '"""')) or (res and s and not s.startswith(('import', 'const', 'require', 'use '))):
            text = re.sub(r'^(//+|#+|/?\*+/?|""")\s?', '', s)
            if text or res:
                res.append(text)
            if len(res) >= 12:
                break
        elif res:
            break
    return [r for r in res if r is not None]


def cmd_tools(args):
    area = args[0].strip('/') if args else ''
    roots = [os.path.join(ROOT, 'tools'), os.path.join(ROOT, '.claude', 'skills')]
    for base in roots:
        for d, _, files in sorted(os.walk(base)):
            if os.path.basename(base) == 'skills' and os.sep + 'tools' not in d + os.sep:
                continue
            for f in sorted(files):
                if not f.endswith(('.js', '.py', '.mjs', '.ts')):
                    continue
                p = os.path.join(d, f)
                if area and area not in rel(p):
                    continue
                out('== %s' % rel(p))
                for u in usage_lines(p)[:8]:
                    out('   ' + u)


def cmd_check(_args):
    bad = 0
    for path in all_modules():
        lines = read_lines(path)
        if not lines or not lines[0].startswith('//'):
            continue  # no header: helpers, registries
        head_len = next((i for i, l in enumerate(lines) if l.strip() and not l.lstrip().startswith('//')), 0)
        if head_len < 40 or 'RULES' not in '\n'.join(lines[:head_len]):
            continue  # no rules in the header: helpers, contexts, registries
        r = digest_range(lines)
        if r is None:
            out('NO DIGEST  %s (header %d lines)' % (rel(path), head_len))
            bad += 1
            continue
        size = sum(len(l) + 1 for l in lines[r[0]:r[1]])
        if size > DIGEST_BUDGET_CHARS:
            out('DIGEST %d chars > %d  %s' % (size, DIGEST_BUDGET_CHARS, rel(path)))
            bad += 1
        names = {h[2].lower() for h in headings(path, lines)}
        body = re.sub(r'\n\s*//\s*', ' ', '\n'.join(lines[r[0]:r[1]]))  # quotes wrap across comment lines
        rest = re.sub(r'\n\s*//\s*', ' ', '\n'.join(lines[r[1]:])).lower()
        for q in re.findall(r'"([^"]{4,100})"', body):
            ql = re.sub(r'\s+', ' ', q.strip('─- ')).lower()
            if any(n.startswith(ql) or ql in n for n in names):
                continue
            if ql in rest:  # an error name or a phrase the file spells out
                continue
            out('UNRESOLVED "%s"  %s' % (q, rel(path)))
            bad += 1
    out('check: %s' % ('OK' if bad == 0 else '%d problem(s)' % bad))
    sys.exit(1 if bad else 0)


def cmd_help(args):
    text = __doc__.strip('\n').split('\n')
    if not args:
        out('\n'.join(text))
        return
    for a in args:
        for l in text:
            if re.match(r'\s*python tools/docs\.py ' + re.escape(a) + r'\b', l):
                out(l)


COMMANDS = {
    'help': cmd_help, 'outline': cmd_outline, 'digest': cmd_digest, 'fn': cmd_fn, 'rule': cmd_rule,
    'rulings': cmd_rulings, 'pitfalls': cmd_pitfalls, 'tools': cmd_tools, 'check': cmd_check,
}


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if not argv:
        return cmd_help([])
    cmd = argv[0]
    if cmd in COMMANDS:
        return COMMANDS[cmd](argv[1:])
    return cmd_sections(cmd, argv[1:])


if __name__ == '__main__':
    main(sys.argv[1:])
