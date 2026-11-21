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


def main():
    fixes = json.load(open(sys.argv[1], encoding='utf-8'))
    files = sorted(glob.glob(os.path.join(ROOT, 'data', 'causes', '*.json')) + glob.glob(os.path.join(ROOT, 'data', 'life', '*.json')))
    data = {p: json.load(open(p, encoding='utf-8')) for p in files}
    index = {}
    for p, arr in data.items():
        for i, e in enumerate(arr):
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
            json.dump(data[p], fp, ensure_ascii=False, indent=1)
            fp.write('\n')
    print(f'当てた直し {done} 件 / ファイル {len(touched)} 個')
    for b in bad:
        print('NG', b)


if __name__ == '__main__':
    main()
