#!/usr/bin/env python3
"""単一の HTML（オフラインで動く）を組み立てる。

  python3 build/assemble.py

src/index.template.html に、次を埋め込んで index.html を書き出す。
  - src/tokens.css と src/style.css
  - vendor/three.bundle.min.js
  - src/js/*.js（名前の順につなぐ）
  - data/causes/*.json（最期のパターン）と data/life/*.json（人生の記憶、会話、一日の出来事）
  - assets/kit.glb（Blender で作った人物と木。blender/build_assets.py が書き出す）
"""
import base64, glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return f.read()


def main():
    css = read('src', 'tokens.css') + '\n' + read('src', 'style.css')
    three = '/*! three.js r185 | MIT License | Copyright (c) 2010-2026 three.js authors | https://github.com/mrdoob/three.js */\n' + read('vendor', 'three.bundle.min.js')
    app = '\n'.join(read('src', 'js', os.path.basename(p)) for p in sorted(glob.glob(os.path.join(ROOT, 'src', 'js', '*.js'))))

    causes = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'data', 'causes', '*.json'))):
        causes += json.load(open(p, encoding='utf-8'))
    total = len(causes)
    # 体験に出すのは、data/focus.json で選んだもの（事故・災害・事件と、病気の突然死）だけ
    focus_path = os.path.join(ROOT, 'data', 'focus.json')
    if os.path.exists(focus_path):
        focus = json.load(open(focus_path, encoding='utf-8'))
        cats, ill = set(focus.get('cats', [])), set(focus.get('ill', []))
        causes = [c for c in causes if (c['cat'] in cats and not c.get('aware')) or c['id'] in ill]
    memories = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'data', 'life', 'mem_*.json'))):
        memories += json.load(open(p, encoding='utf-8'))
    last_path = os.path.join(ROOT, 'data', 'life', 'last.json')
    last = json.load(open(last_path, encoding='utf-8')) if os.path.exists(last_path) else []
    end_path = os.path.join(ROOT, 'data', 'life', 'ending.json')
    ending = json.load(open(end_path, encoding='utf-8')) if os.path.exists(end_path) else {'sense': {}, 'voice': {}, 'after': {}}
    extra = {}
    for name in ('talk', 'day'):
        q = os.path.join(ROOT, 'data', 'life', name + '.json')
        extra[name] = json.load(open(q, encoding='utf-8')) if os.path.exists(q) else {}
    data = json.dumps({'causes': causes, 'memories': memories, 'last': last, 'ending': ending, 'talk': extra['talk'], 'day': extra['day']}, ensure_ascii=False, separators=(',', ':'))
    data = data.replace('</', '<\\/')

    glb = os.path.join(ROOT, 'assets', 'kit.glb')
    assets = base64.b64encode(open(glb, 'rb').read()).decode('ascii') if os.path.exists(glb) else ''

    html = read('src', 'index.template.html')
    for key, val in (('/*__CSS__*/', css), ('/*__THREE__*/', three.replace('</script', '<\\/script')), ('/*__APP__*/', app), ('__DATA__', data), ('__ASSETS__', assets)):
        if key not in html:
            sys.exit(f'テンプレートに {key} がない')
        html = html.replace(key, val)
    out = os.path.join(ROOT, 'index.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'index.html {os.path.getsize(out) / 1e6:.2f} MB / 最期 {len(causes)} 件（全 {total} 件から選んだもの） / 記憶 {len(memories)} 件 / 一言 {len(last)} 件 / モデル {len(assets) * 3 // 4 / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
