#!/usr/bin/env python3
"""Build the teacher index from published homework pages (no answer data)."""
from __future__ import annotations
import argparse
import json
import re
import shutil
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]


class PageInfo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ''
        self.in_title = False
        self.body = {}

    def handle_starttag(self, tag, attrs):
        if tag == 'title':
            self.in_title = True
        if tag == 'body':
            self.body = dict(attrs)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def read_page(path):
    info = PageInfo()
    source = path.read_text(encoding='utf-8')
    info.feed(source)
    # Existing pages identify their pupil in the title; new publisher pages
    # supply explicit metadata. Never infer names from exercises or scripts.
    name = info.body.get('data-student') or re.split(r'\s*[·|]\s*', info.title)[0]
    if not name or name == info.title and not info.body.get('data-student'):
        raise ValueError(f'Missing student metadata: {path}')
    title = info.body.get('data-sheet') or info.title[len(name):].strip(' ·|')
    date = ''
    for pattern, fmt in [(r'\d{4}-\d{2}-\d{2}', '%Y-%m-%d'),
                         (r'\d{1,2} [A-Za-z]+ \d{4}', '%d %B %Y')]:
        match = re.search(pattern, title)
        if match:
            date = datetime.strptime(match[0], fmt).date().isoformat()
            break
    sheet_id = info.body.get('data-sheet-id')
    if not sheet_id:
        legacy = re.search(r'''\bsheetId:\s*['"]([a-z0-9-]+)['"]''', source)
        sheet_id = legacy[1] if legacy else None
    return {'name': name.strip(), 'title': title, 'date': date, 'sheetId': sheet_id,
            'test': bool(re.search(r'\btest\b|тест', title, re.I)),
            'url': f'https://arsdashok.github.io/homework/{path.parent.name}/'}


def build(root=ROOT, site=None):
    config = json.loads((root / 'hub-config.json').read_text())
    if not re.fullmatch(r'[a-f0-9]{16}', config['hub']):
        raise ValueError('Invalid hub path')
    pages = []
    sources = []
    for path in sorted(root.glob('*/index.html')):
        if path.parent.name == config['hub'] or path.parent.name.startswith(('.', '_')):
            continue
        if path.parent.name in ('scripts', 'assets'):
            continue
        page = read_page(path)
        if page['sheetId']:
            page['submissionsUrl'] = config.get('submissionFolders', {}).get(page['sheetId']) or (
                'https://drive.google.com/drive/u/0/search?q=' + quote('hw-submissions-' + page['sheetId']))
        pages.append(page)
        sources.append(path.parent)
    groups = {}
    for page in pages:
        groups.setdefault(page['name'].casefold(), {'name': page['name'], 'pages': []})['pages'].append(page)
    students = sorted(groups.values(), key=lambda s: s['name'].casefold())
    for student in students:
        student['pages'].sort(key=lambda p: p['date'], reverse=True)
        student['pages'].sort(key=lambda p: p['test'])
    payload = json.dumps({'students': students, 'vocabHub': config['vocabHub']}, ensure_ascii=False).replace('<', '\\u003c')
    html = (root / 'scripts/hub-template.html').read_text().replace('__HUB_DATA__', payload)
    hub = root / config['hub']
    hub.mkdir(exist_ok=True)
    (hub / 'index.html').write_text(html, encoding='utf-8')
    if site:
        site = Path(site)
        site.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / 'index.html', site / 'index.html')
        for directory in [*sources, hub, root / 'assets']:
            if directory.is_dir():
                shutil.copytree(directory, site / directory.name, dirs_exist_ok=True,
                                ignore=shutil.ignore_patterns('*.key.json', '.DS_Store'))
        (site / '.nojekyll').touch()
    print(f'Built {len(students)} students / {len(pages)} pages')
    print(f"https://arsdashok.github.io/homework/{config['hub']}/")
    return students


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', type=Path)
    args = parser.parse_args()
    build(site=args.site)
