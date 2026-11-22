#!/usr/bin/env python3
"""点検で出た直しを、id を指定してまとめて当てる。

  python3 build/fix.py 直しの一覧.json

一覧は配列。1 件は次のどちらか。
  {"id": "can-029", "set": "beats.1.text", "value": "…"}      項目を丸ごと差し替える
  {"id": "hrt-006", "sub": ["枕元", "枕もと"]}                 その件の文字列の中を置き換える
set の場所は note / name / place / age / group / end.t / beats.0.text / end.lines.2 / text / need / born / min / max など。
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sub_all(o, a, b, hit):
    if isinstance(o, str):
        if a in o:
            hit[0] += o.count(a)
        return o.replace(a, b)
    if isinstance(o, list):
        return [sub_all(x, a, b, hit) for x in o]
    if isinstance(o, dict):
        return {k: (v if k == 'id' else sub_all(v, a, b, hit)) for k, v in o.items()}
    return o


def dump_imi(data):
    """imi_*.json を、書き手の体裁（1 件の頭を 2 行、場面を 2 行ずつ）のまま書き出す。"""
    j = lambda v: json.dumps(v, ensure_ascii=False)
    kv = lambda d, keys: ', '.join(f'{j(k)}: {j(d[k])}' for k in keys)
    top1 = ['id', 'cat', 'group', 'name', 'place']
    out = ['[']
    for i, e in enumerate(data):
        L = ['  {', '    ' + kv(e, [k for k in top1 if k in e]) + ',',
             '    ' + kv(e, [k for k in e if k not in top1 and k not in ('beats', 'end', 'note', 'twist')]) + ',',
             '    "beats": [']
        for bi, b in enumerate(e['beats']):
            L.append('      {' + kv(b, [k for k in b if k != 'text']) + ',')
            L.append('       "text": ' + j(b['text']) + '}' + (',' if bi < len(e['beats']) - 1 else ''))
        L.append('    ],')
        en = e['end']
        L.append('    "end": {' + kv(en, [k for k in en if k != 'lines']) + ',')
        L.append('      "lines": [')
        for li, ln in enumerate(en['lines']):
            L.append('        ' + j(ln) + (',' if li < len(en['lines']) - 1 else ''))
        L.append('      ]},')
        tail = [k for k in ('note', 'twist') if k in e]
        for ti, k in enumerate(tail):
            comma = ',' if ti < len(tail) - 1 else ''
            if k == 'twist':
                L += ['    "twist": {', '      "q": ' + j(e['twist']['q']) + ',', '      "a": ' + j(e['twist']['a']), '    }' + comma]
            else:
                L.append('    ' + j(k) + ': ' + j(e[k]) + comma)
        L.append('  }' + (',' if i < len(data) - 1 else ''))
        out += L
    out.append(']')
    return '\n'.join(out) + '\n'


def main():
    fixes = json.load(open(sys.argv[1], encoding='utf-8'))
    files = sorted(glob.glob(os.path.join(ROOT, 'data', 'causes', '*.json')) + glob.glob(os.path.join(ROOT, 'data', 'life', '*.json')))
    data = {p: json.load(open(p, encoding='utf-8')) for p in files}
    index = {}
    for p, arr in data.items():
        if not isinstance(arr, list):  # day.json などの辞書の形のファイルは対象外
            continue
        for i, e in enumerate(arr):
            if isinstance(e, dict) and 'id' in e:
                index[e['id']] = (p, i)
    done, bad, touched = 0, [], set()
    for f in fixes:
        if f['id'] not in index:
            bad.append(f"{f['id']}: 見つからない")
            continue
        p, i = index[f['id']]
        e = data[p][i]
        if 'set' in f:
            keys = f['set'].split('.')
            o = e
            try:
                for k in keys[:-1]:
                    o = o[int(k)] if isinstance(o, list) else o[k]
                last = keys[-1]
                if isinstance(o, list):
                    o[int(last)] = f['value']
                else:
                    if f['value'] is None:
                        o.pop(last, None)
                    else:
                        o[last] = f['value']
            except (KeyError, IndexError, ValueError) as ex:
                bad.append(f"{f['id']}: {f['set']} に当てられない（{ex}）")
                continue
        elif 'sub' in f:
            hit = [0]
            data[p][i] = sub_all(e, f['sub'][0], f['sub'][1], hit)
            if not hit[0]:
                bad.append(f"{f['id']}: 「{f['sub'][0]}」が見つからない")
                continue
        done += 1
        touched.add(p)
    for p in touched:
        with open(p, 'w', encoding='utf-8') as fp:
            if os.path.basename(p).startswith('imi_'):
                fp.write(dump_imi(data[p]))  # 手書きと同じ体裁を保つ
            else:
                json.dump(data[p], fp, ensure_ascii=False, indent=1)
                fp.write('\n')
    print(f'当てた直し {done} 件 / ファイル {len(touched)} 個')
    for b in bad:
        print('NG', b)


if __name__ == '__main__':
    main()
