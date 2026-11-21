#!/usr/bin/env python3
"""人生の記憶（data/life/*.json）の書式を点検する。

  python3 data/validate_life.py data/life/mem_a.json --prefix ma --count 120
  python3 data/validate_life.py data/life/last.json --prefix lt --count 60
"""
import argparse, json, re, sys

STAGES = {'child', 'teen', 'young', 'love', 'work', 'kids', 'mid', 'loss', 'late', 'joy'}
NEEDS = {'partner', 'widowed', 'kids', 'grandkids'}
JOBS = {'office', 'construction', 'factory', 'farm', 'fishery', 'forestry', 'driver', 'medical', 'teacher', 'craft',
        'shop', 'public', 'art', 'home'}
KEYS = {'id', 'stage', 'text', 'min', 'max', 'need', 'born', 'job', 'sex'}
NG = ['を行う', 'を行い', 'において', 'することができ', 'させていただ']
GENDERED = ['妻', '夫が', '夫は', '夫の', '夫と', '夫に', '彼女', '彼は', '彼が', '彼の', '息子', '娘', '旦那', '女房', '家内', '主人']
BANNED = ['自殺', '自死']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--prefix')
    ap.add_argument('--count', type=int)
    a = ap.parse_args()
    try:
        data = json.load(open(a.file, encoding='utf-8'))
    except Exception as ex:
        print(f'JSON が読めない: {ex}')
        sys.exit(1)
    errs, ids, texts = [], set(), set()
    is_last = a.prefix == 'lt'
    for e in data:
        eid = e.get('id', '?')

        def err(m):
            errs.append(f'[{eid}] {m}')

        for k in e:
            if k not in KEYS:
                err(f'知らない項目 {k}')
        if a.prefix and not re.match(rf'^{re.escape(a.prefix)}-\d{{3}}$', str(eid)):
            err(f'id は {a.prefix}-000 の形')
        if eid in ids:
            err('id の重複')
        ids.add(eid)
        tx = e.get('text')
        if not isinstance(tx, str):
            err('text がない')
            continue
        if tx in texts:
            err('同じ本文がある')
        texts.add(tx)
        if is_last:
            if not (8 <= len(tx) <= 40):
                err(f'text は 8〜40 字（いま {len(tx)} 字）')
            if 'stage' in e or 'job' in e or 'born' in e:
                err('last には stage / job / born を書かない')
        else:
            if e.get('stage') not in STAGES:
                err(f'stage が不正: {e.get("stage")}')
            if not (50 <= len(tx) <= 130):
                err(f'text は 50〜130 字（いま {len(tx)} 字）')
            need = e.get('need', [])
            if e.get('stage') == 'love' and 'partner' not in need and 'widowed' not in need:
                err('love は need に partner')
            if e.get('stage') == 'kids' and 'kids' not in need and 'grandkids' not in need:
                err('kids は need に kids')
            if 'job' in e and (e.get('stage') != 'work' or e['job'] not in JOBS):
                err(f'job が不正: {e.get("job")}')
        for g in NG + BANNED:
            if g in tx:
                err(f'使わない言い回し 「{g}」')
        for g in GENDERED:
            if g in tx:
                err(f'性別や続柄が決まる語 「{g}」（あの人・子ども・あの子に）')
        for k in ('min', 'max'):
            if k in e and not (isinstance(e[k], int) and 10 <= e[k] <= 106):
                err(f'{k} は 10〜106 の整数')
        if 'need' in e and not (isinstance(e['need'], list) and e['need'] and all(n in NEEDS for n in e['need'])):
            err(f'need が不正: {e.get("need")}')
        if 'born' in e:
            b = e['born']
            if not (isinstance(b, list) and len(b) == 2 and all(isinstance(x, int) for x in b) and 1915 <= b[0] <= b[1] <= 2016):
                err(f'born は [から, まで]、1915〜2016: {b}')
        if 'sex' in e and e['sex'] not in ('f', 'm'):
            err('sex が不正')
    if a.count and len(data) != a.count:
        errs.append(f'件数が {len(data)} 件（{a.count} 件にする）')
    print(f'{len(data)} 件')
    for m in errs:
        print('NG', m)
    print(f'エラー {len(errs)} 件')
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
