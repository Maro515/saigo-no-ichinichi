#!/usr/bin/env python3
"""最期のパターン（data/causes/*.json）の書式を点検する。

  python3 data/validate.py data/causes/hrt.json --prefix hrt --count 54
  python3 data/validate.py --all            # 全ファイルと、ファイルをまたいだ重複
"""
import argparse, glob, json, os, re, sys

CATS = {'ill', 'acc', 'dis', 'old', 'crm'}
STAGES = {'living', 'washitsu', 'bedroom', 'bath', 'hospital', 'icu', 'hospice', 'facility', 'office', 'shop',
          'worksite', 'street', 'train', 'car', 'park', 'field', 'mountain', 'river', 'sea'}
POS = {'lie', 'sit', 'stand', 'walk'}
VARIANTS = {'worksite': {'construction', 'factory'}, 'car': {'city', 'highway', 'mountain'}, 'sea': {'shore', 'boat'}}
FX = {'chest', 'breath', 'head', 'fall', 'impact', 'water', 'smoke', 'cold', 'heat', 'shake', 'sleep', 'fade'}
SEASONS = {'any', 'spring', 'summer', 'autumn', 'winter'}
WEATHERS = {'any', 'clear', 'cloudy', 'rain', 'snow', 'fog', 'storm'}
JOBS = {'office', 'construction', 'factory', 'farm', 'fishery', 'forestry', 'driver', 'medical', 'teacher', 'craft',
        'shop', 'public', 'art', 'home', 'student'}
TOP_KEYS = {'id', 'cat', 'group', 'name', 'place', 'age', 'sex', 'season', 'weather', 'aware', 'job', 'beats', 'end', 'note', 'mute', 'bound', 'twist'}
BEAT_KEYS = {'t', 'stage', 'pos', 'v', 'with', 'text', 'bound'}
END_KEYS = {'t', 'stage', 'pos', 'v', 'with', 'fx', 'lines', 'hit', 'state', 'see'}
SEES = {'car', 'car-R', 'car-L', 'car-F', 'man'}
STATES = {'vent', 'still', 'choke', 'quiet', 'arrest', 'weak', 'brady'}
PH = re.compile(r'\{([^}]*)\}')
TIME = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')
NG = ['を行う', 'を行い', 'において', 'することができ', 'させていただ', 'を実施']
BANNED = ['自殺', '自死', '首を吊', '飛び降り', '殺され', '殺害']


def mins(t):
    return int(t[:2]) * 60 + int(t[3:])


def check_scene(e, sc, where, is_end, err):
    keys = END_KEYS if is_end else BEAT_KEYS
    for k in sc:
        if k not in keys:
            err(f'{where}: 知らない項目 {k}')
    if not isinstance(sc.get('t'), str) or not TIME.match(sc.get('t', '')):
        err(f'{where}: t は "HH:MM"')
    st = sc.get('stage')
    if st not in STAGES:
        err(f'{where}: stage が表にない: {st}')
    if sc.get('pos') not in POS:
        err(f'{where}: pos が不正: {sc.get("pos")}')
    if st == 'car' and sc.get('pos') != 'sit':
        err(f'{where}: car は sit だけ')
    if st in ('icu',) and sc.get('pos') != 'lie':
        err(f'{where}: icu は lie だけ')
    if 'v' in sc:
        if st not in VARIANTS or sc['v'] not in VARIANTS[st]:
            err(f'{where}: v が不正: {st}/{sc["v"]}')
    if 'with' in sc and sc['with'] is not True:
        err(f'{where}: with は true のときだけ書く')
    if 'see' in sc and sc['see'] not in SEES:
        err(f'{where}: see は ' + ' / '.join(sorted(SEES)))
    if 'state' in sc and (not isinstance(sc['state'], list) or not sc['state'] or any(x not in STATES for x in sc['state'])):
        err(f'{where}: state が不正: {sc["state"]}')
    texts = sc.get('lines', []) if is_end else [sc.get('text', '')]
    for tx in texts:
        if not isinstance(tx, str):
            err(f'{where}: 文字列でない')
            continue
        for ph in PH.findall(tx):
            if ph not in ('大切な人', '呼び名'):
                err(f'{where}: 使えない置き換え {{{ph}}}')
        if '{呼び名}' in tx and not sc.get('with'):
            err(f'{where}: {{呼び名}} は with:true の場面だけ')
        if '{呼び名}' in tx and '「' not in tx:
            err(f'{where}: {{呼び名}} はかぎかっこの中で')
        for b in BANNED:
            if b in tx:
                err(f'{where}: 書かない内容 「{b}」')
    if is_end:
        ls = sc.get('lines')
        if not isinstance(ls, list) or not (3 <= len(ls) <= 5):
            err(f'{where}: lines は 3〜5 行')
        else:
            for i, l in enumerate(ls):
                if isinstance(l, str) and not (10 <= len(l) <= 70):
                    err(f'{where}: lines[{i}] は 10〜70 字（いま {len(l)} 字）')
            h = sc.get('hit')
            if not isinstance(h, int) or isinstance(h, bool) or not (0 <= h < len(ls)):
                err(f'{where}: hit は 0〜{len(ls) - 1}')
        fx = sc.get('fx')
        if not isinstance(fx, list) or not (1 <= len(fx) <= 3) or any(f not in FX for f in fx) or len(set(fx)) != len(fx):
            err(f'{where}: fx は表から 1〜3 個: {fx}')
    else:
        tx = sc.get('text', '')
        if isinstance(tx, str) and not (40 <= len(tx) <= 130):
            err(f'{where}: text は 40〜130 字（いま {len(tx)} 字）')


def check_entry(e, prefix, err_all):
    eid = e.get('id', '?')

    def err(m):
        err_all.append(f'[{eid}] {m}')

    for k in e:
        if k not in TOP_KEYS:
            err(f'知らない項目 {k}')
    for k in TOP_KEYS - {'job', 'mute', 'bound', 'twist'}:
        if k not in e:
            err(f'項目がない: {k}')
    if prefix and not re.match(rf'^{re.escape(prefix)}-\d{{3}}$', str(eid)):
        err(f'id は {prefix}-000 の形')
    if e.get('cat') not in CATS:
        err(f'cat が不正: {e.get("cat")}')
    for k, mx in (('group', 12), ('name', 28), ('place', 14)):
        v = e.get(k)
        if not isinstance(v, str) or not v or len(v) > mx:
            err(f'{k} は 1〜{mx} 字（いま {len(v) if isinstance(v, str) else "?"} 字）')
    a = e.get('age')
    if not (isinstance(a, list) and len(a) == 2 and all(isinstance(x, int) for x in a) and 10 <= a[0] <= a[1] <= 106):
        err(f'age は [下限, 上限]、10〜106: {a}')
    if e.get('sex') not in ('any', 'f', 'm'):
        err('sex が不正')
    if e.get('season') not in SEASONS:
        err('season が不正')
    if e.get('weather') not in WEATHERS:
        err('weather が不正')
    if e.get('season') == 'summer' and e.get('weather') == 'snow':
        err('夏に雪')
    if not isinstance(e.get('aware'), bool):
        err('aware は true / false')
    if 'job' in e and e['job'] not in JOBS:
        err(f'job が不正: {e["job"]}')
    bs = e.get('beats')
    if not (isinstance(bs, list) and len(bs) == 3):
        err('beats はちょうど 3 つ')
        bs = bs if isinstance(bs, list) else []
    for i, b in enumerate(bs):
        if isinstance(b, dict):
            check_scene(e, b, f'beats[{i}]', False, err)
    en = e.get('end')
    if isinstance(en, dict):
        check_scene(e, en, 'end', True, err)
    else:
        err('end がない')
        en = {}
    # 時刻の順（日付をまたぐのは 1 回まで）
    ts = [b.get('t') for b in bs if isinstance(b, dict)] + [en.get('t')]
    if all(isinstance(t, str) and TIME.match(t) for t in ts):
        wraps = sum(1 for x, y in zip(ts, ts[1:]) if mins(y) < mins(x))
        if wraps > 1:
            err(f'時刻の順がおかしい: {ts}')
        if wraps == 1 and mins(ts[-1]) >= mins(ts[0]):
            err(f'24 時間を超えている: {ts}')
    # 置き換えの数
    alltx = ' '.join([b.get('text', '') for b in bs if isinstance(b, dict)] + [l for l in en.get('lines', []) if isinstance(l, str)])
    if alltx.count('{大切な人}') > 2:
        err('{大切な人} は 2 か所まで')
    if '{大切な人}' in e.get('note', '') or '{呼び名}' in e.get('note', ''):
        err('note に置き換えは使えない')
    n = e.get('note')
    if not isinstance(n, str) or not (30 <= len(n) <= 130):
        err(f'note は 30〜130 字（いま {len(n) if isinstance(n, str) else "?"} 字）')
    else:
        for g in NG:
            if g in n:
                err(f'note の言い回し 「{g}」 は使わない')
        if re.search(r'(です|ます)。', n):
            err('note は「だ・である」で書く')
    # 意味がわかると怖い話（twist）: q 気づき 15〜60 字、a 種明かし 50〜220 字。思いがけない最期だけ
    if 'twist' in e:
        tw = e['twist']
        if not isinstance(tw, dict) or set(tw) - {'q', 'a'}:
            err('twist は {"q": 気づき, "a": 種明かし}')
        else:
            q, aa = tw.get('q'), tw.get('a')
            if not isinstance(q, str) or not (15 <= len(q) <= 60):
                err(f'twist.q は 15〜60 字（いま {len(q) if isinstance(q, str) else "?"} 字）')
            if not isinstance(aa, str) or not (50 <= len(aa) <= 220):
                err(f'twist.a は 50〜220 字（いま {len(aa) if isinstance(aa, str) else "?"} 字）')
            if isinstance(q, str) and isinstance(aa, str) and ('{大切な人}' in q + aa or '{呼び名}' in q + aa):
                err('twist に置き換えは使えない')
            if isinstance(aa, str):
                for g in NG:
                    if g in aa:
                        err(f'twist.a の言い回し 「{g}」 は使わない')
        if e.get('aware'):
            err('twist は思いがけない最期だけ（aware は false）')
    lo = a[0] if isinstance(a, list) and a and isinstance(a[0], int) else 0
    stages = [b.get('stage') for b in bs if isinstance(b, dict)] + [en.get('stage')]
    if 'car' in stages and lo < 18:
        err('car の場面があるのに age の下限が 18 未満')
    if 'office' in stages and lo < 18:
        err('office の場面があるのに age の下限が 18 未満')


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file', nargs='?')
    ap.add_argument('--prefix')
    ap.add_argument('--count', type=int)
    ap.add_argument('--all', action='store_true')
    a = ap.parse_args()
    errs = []
    if a.all:
        here = os.path.dirname(os.path.abspath(__file__))
        files = sorted(glob.glob(os.path.join(here, 'causes', '*.json')))
        ids, names, total = {}, {}, 0
        for p in files:
            try:
                data = load(p)
            except Exception as ex:
                errs.append(f'{os.path.basename(p)}: JSON が読めない: {ex}')
                continue
            pre = os.path.splitext(os.path.basename(p))[0]
            m = re.match(r'^imi_([a-z])$', pre)
            if m: pre = 'im' + m.group(1)              # 意味がわかると怖い話のファイル（imi_b.json → imb）
            for e in data:
                check_entry(e, pre, errs)
                if e.get('id') in ids:
                    errs.append(f'id の重複: {e.get("id")}')
                ids[e.get('id')] = 1
                names.setdefault(e.get('name'), []).append(e.get('id'))
            total += len(data)
            print(f'{os.path.basename(p)}: {len(data)} 件')
        for n, v in names.items():
            if len(v) > 1:
                errs.append(f'name の重複 「{n}」: {v}')
        print(f'合計 {total} 件')
    else:
        try:
            data = load(a.file)
        except Exception as ex:
            print(f'JSON が読めない: {ex}')
            sys.exit(1)
        if not isinstance(data, list):
            print('配列ではない')
            sys.exit(1)
        ids, names = set(), {}
        for e in data:
            check_entry(e, a.prefix, errs)
            if e.get('id') in ids:
                errs.append(f'id の重複: {e.get("id")}')
            ids.add(e.get('id'))
            names.setdefault(e.get('name'), []).append(e.get('id'))
        for n, v in names.items():
            if len(v) > 1:
                errs.append(f'name の重複 「{n}」: {v}')
        if a.count and len(data) != a.count:
            errs.append(f'件数が {len(data)} 件（{a.count} 件にする）')
        print(f'{len(data)} 件')
    for m in errs:
        print('NG', m)
    print(f'エラー {len(errs)} 件')
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
