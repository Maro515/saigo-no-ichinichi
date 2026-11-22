'use strict';
/* 最期の一日 — 店の土台: 語りから店の種類を決める、看板や品物の模様、店で使う部品。
   店の場所そのものは 39_shop_kinds.js（S.shop）で組み立てる。
   種類は場面の v に「系統.種類」の形で入る（例 eat.soba）。自分がその店で働いている場面は末尾に ! がつく */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const PI = Math.PI;
  const H = SI.Shop = {};

  /* ================= 1. 語りから店の種類を決める ================= */
  const RULES = [
    [/カラオケ/, 'misc.karaoke'],
    [/理髪|床屋|散髪|いつもの長さ/, 'salon.barber'],
    [/美容院|髪を染/, 'salon.beauty'],
    [/眼科/, 'misc.clinic'],
    [/ホテル|フロント/, 'misc.hotel'],
    [/料理教室/, 'kitchen.class'],
    [/ダイビング/, 'misc.dive'],
    [/販売店|チラシを新聞/, 'misc.paper'],
    [/冷凍庫の中/, 'aisle.freezer'],
    [/パン屋の厨房|生地を|オーブン/, 'kitchen.bake'],
    [/厨房/, 'kitchen.cook'],
    [/すし|寿司|鮨/, 'eat.sushi'],
    [/焼き肉|焼肉/, 'eat.yakiniku'],
    [/学食/, 'eat.gakushoku'],
    [/ゲレンデ/, 'eat.ski'],
    [/クラブハウス/, 'eat.club'],
    [/サービスエリア|ドライブイン/, 'eat.road'],
    [/民宿/, 'eat.minshuku'],
    [/宿の食事/, 'eat.ryokan'],
    [/茶屋/, 'eat.chaya'],
    [/甘味/, 'eat.kanmi'],
    [/美術館の喫茶/, 'eat.museum'],
    [/地下の店|地下の喫茶/, 'eat.chika'],
    [/パン屋の二階/, 'eat.bakecafe'],
    [/喫茶|カフェ|ナポリタン|ホットケーキ|ピラフ|ドアベル|ケーキ/, 'eat.kissa'],
    [/焼き鳥/, 'eat.yakitori'],
    [/小上がり/, 'eat.izakaya'],
    [/居酒屋のホール/, 'eat.izakaya'],
    [/座敷|宴会|送別会|歓迎会|ビンゴ|くじの|乾杯/, 'eat.enkai'],
    [/居酒屋|熱燗|熱かん|三軒め|二軒目|赤ちょうちん|ハイボール/, 'eat.izakaya'],
    [/定食|食堂|日替わり|もつ煮|かつ丼/, 'eat.shokudo'],
    [/立ち食い/, 'eat.tachigui'],
    [/ラーメン|替え玉/, 'eat.ramen'],
    [/うどん/, 'eat.udon'],
    [/そば屋|そば湯|(?<!の|焼き|中華)そば/, 'eat.soba'],          // 「レジのそば」「焼きそば」はそば屋にしない
    [/カレー|ナン/, 'eat.curry'],
    [/ハンバーガー/, 'eat.burger'],
    [/(?<!冷やし)中華|ギョーザ|チャーハン|れんげ/, 'eat.chuka'],
    [/かき氷/, 'eat.kiosk'],
    [/コンビニ/, 'aisle.konbini'],
    [/ドラッグストア|薬局/, 'aisle.drug'],
    [/ホームセンター|電材売り場|苗売り場|コーキング|防水テープ/, 'aisle.home'],
    [/道の駅|農協の売店|直売/, 'aisle.michi'],
    [/スーパー|鮮魚売り場|買い物カート|特売|値引き|新米の袋|開店前の売り場|売り場の灯り/, 'aisle.super'],
    [/魚屋/, 'front.sakana'],
    [/八百屋/, 'front.yaoya'],
    [/豆腐屋/, 'front.tofu'],
    [/肉屋/, 'front.niku'],
    [/惣菜|総菜|弁当屋|からあげ/, 'front.sozai'],
    [/和菓子|どら焼き|菓子折り|桜餅/, 'front.wagashi'],
    [/パン屋|値札|トング|あんぱん/, 'front.pan'],
    [/酒屋/, 'front.saka'],
    [/花屋|ガーベラ|カーネーション|花束|水あげ/, 'front.hana'],
    [/茶葉|量り売り|番茶/, 'front.cha'],
    [/金物屋/, 'front.kanamono'],
    [/釣具屋/, 'front.tsurigu'],
    [/古い商店|菓子缶/, 'front.furui'],
    [/金券/, 'shelf.kinken'],
    [/古本屋|均一棚/, 'shelf.furuhon'],
    [/本屋|新刊/, 'shelf.hon'],
    [/手芸/, 'shelf.shugei'],
    [/時計屋/, 'shelf.tokei'],
    [/眼鏡屋|めがね屋/, 'shelf.megane'],
    [/レジの列|かごに入れる|レジで|米の五キロ/, 'aisle.super'],
    [/桃|枝豆|漬物|りんご/, 'aisle.michi'],
    [/鉢植え|伝票/, 'front.zakka']
  ];
  /* 自分がその店で働いている場面 */
  const STAFF = /仕込み|開店|閉店|のれんを(下ろ|しま|出)|のれんは|レジを締め|帳場|アルバイト|バイト|勤め先の(?!近)|店先に|シャッターを上げ|値札|店を開け|最後の客|注文の花束|水あげ|作業台|カウンターの中|カウンターをふく|昼の客が引け|ホールで|棚卸し|開店前の売り場|オーブン|生地|詰めていく|パックにつめ|箱に詰め|レジの裏|裏口|裏の冷凍庫|入口の黒板|小上がりを拭く|ちょうちんをともす|表の札|ドアベルが鳴るたびに|客の来ない|客が来て|奥の丸椅子|奥の椅子|奥でおにぎり|本屋の奥|店の奥|客足|店長|カップを洗う|湯のみを洗う|常連|だしをとる|アイスの箱|量り売り/;
  const CUST = /食べ|すす|頼|買|選|注文|受けと|待ち|並ぶ|おかわり|飲む|飲みほ|飲みこ|つつく|もらう|テーブル席|見くらべ/;
  H.kindOf = function (text) { for (const [re, k] of RULES) if (re.test(text)) return k; return null; };
  function sceneText(s, cause, isEnd) { return (isEnd ? (cause.place || '') + '。' : '') + (s.text || (s.lines || []).join('')); }
  /* 読みこみのときに一度だけ、店の場面に種類（v）をつける。同じ話の続く場面は、言葉がなければ近い場面の店を引きつぐ */
  SI.assignShops = function (causes) {
    for (const c of causes || []) {
      const list = (c.beats || []).map(b => ({ s: b, end: false })).concat(c.end ? [{ s: c.end, end: true }] : []).filter(x => x.s.stage === 'shop' && !x.s.v);
      if (!list.length) continue;
      for (const x of list) { x.text = sceneText(x.s, c, x.end); x.kind = H.kindOf(x.text); }
      for (let i = 0; i < list.length; i++) {
        if (list[i].kind) continue;
        for (let d = 1; d < list.length && !list[i].kind; d++) {
          const a = list[i - d], b = list[i + d];
          if (a && a.kind) list[i].kind = a.kind; else if (b && b.kind) list[i].kind = b.kind;
        }
        if (!list[i].kind) list[i].kind = H.kindOf((c.place || '') + '。' + (c.name || '')) || 'eat.shokudo';
      }
      for (const x of list) {
        const staff = STAFF.test(x.text) || (c.job === 'shop' && !CUST.test(x.text));
        x.s.v = x.kind + (staff ? '!' : '');
      }
    }
  };
  H.parseV = function (v) {
    const s = String(v || 'eat.shokudo'), staff = s.endsWith('!'), k = staff ? s.slice(0, -1) : s, d = k.indexOf('.');
    return d < 0 ? { fam: 'eat', sub: k || 'shokudo', staff } : { fam: k.slice(0, d), sub: k.slice(d + 1), staff };
  };
  /* その店が出てくる場面の言葉（同じ v の場面をまとめる）。話ごとの小物と献立に使う */
  H.textsFor = function (cause, v) {
    if (!cause) return '';
    const out = [];
    for (const b of (cause.beats || [])) if (b.stage === 'shop' && b.v === v) out.push(b.text || '');
    if (cause.end && cause.end.stage === 'shop' && cause.end.v === v) out.push((cause.place || '') + '。' + (cause.end.lines || []).join(''));
    return out.join('。');
  };

  /* ================= 2. 名前・品書き・献立 ================= */
  const NAMES = {
    shokudo: ['まるや食堂', 'みどり食堂', '大黒屋', 'ひさご食堂', '食堂 あさひ', 'さくら食堂', 'めし処 一松'],
    harbor: ['みなと食堂', '浜屋', '潮見食堂', 'いそや'], road: ['ドライブイン 峠', '国道食堂', 'ドライブイン ひまわり'],
    soba: ['そば処 松葉', '竹乃家', 'そば 梅月', '手打ち いなほ', 'そば処 ふじ'], udon: ['手打ちうどん 万作', 'うどん 七福', 'うどん処 よし乃'],
    ramen: ['らーめん 大吉', '中華そば まるいち', 'らーめん 龍王'], tachigui: ['立ちそば 駅前', 'そば 富士', '立喰そば こまち'],
    izakaya: ['居酒屋 たぬき', '酒処 ふく', '大衆酒場 まる', '炉端 はな'], enkai: ['酒処 ふく', '居酒屋 たぬき', '大衆酒場 まる'],
    yakitori: ['焼鳥 鳥よし', 'やきとり 一福', '焼とり 大将'], yakiniku: ['焼肉 牛勝', '炭火焼肉 ほむら', '焼肉 大門'],
    sushi: ['寿司 正', '鮨 たけ', 'すし 栄'],
    kissa: ['喫茶 ポプラ', '珈琲 白樺', '純喫茶 ローレル', '喫茶 らんぷ', '喫茶 ひなた'], chika: ['珈琲 灯', '喫茶 地下鉄'], bakecafe: ['パン工房 こむぎ'],
    kanmi: ['甘味処 あおい', '甘味 みやこ', '茶房 ゆう'], chaya: ['峠の茶屋', '茶屋 山びこ'], museum: ['喫茶室'],
    curry: ['カレー 千里', 'カリー 黒船', 'カレーの店 ばんび'], curryN: ['インド料理 ナマステ', 'インド料理 ガンジス'],
    burger: ['バーガー ベイ', 'ハンバーガー サニー'], chuka: ['中華 東陽軒', '中華料理 平和軒', '中華 万福'],
    gakushoku: ['学生食堂'], ski: ['レストハウス'], club: ['レストラン'], minshuku: ['民宿'], ryokan: ['お食事処'], kiosk: ['売店'],
    sakana: ['魚政', '鮮魚 魚辰', '魚喜', '丸八鮮魚'], yaoya: ['八百吉', '青果 やおはち', '八百屋 丸十'],
    niku: ['肉の大和', '精肉 まるよし', '肉のいしい'], sozai: ['おかず処 ふく', '惣菜 まんぷく', '弁当 ひまわり'],
    tofu: ['とうふ 豆福', '豆腐 さかい', 'とうふ 白川'], wagashi: ['和菓子 松月堂', '菓子処 梅香', '御菓子司 福寿堂'],
    pan: ['パン工房 こむぎ', 'ベーカリー ひだまり', 'パン屋 くるみ'], saka: ['酒 丸屋', '酒の大黒', '酒店 いせや'],
    hana: ['花長', 'フラワー こもれび', '生花 はなや'], cha: ['日本茶 みどり園', 'お茶の 香風園'],
    kanamono: ['金物 大工堂', '金物 丸金', '金物店 やまもと'], tsurigu: ['釣具 海幸', 'つり具 波止場', '釣具 えびす'],
    furui: ['よろず 丸屋', 'ふくや商店'], zakka: ['荒物 雑貨 まつや', '雑貨 ひのき屋'],
    hon: ['書店 文林堂', 'ブックス ひかり'], furuhon: ['古書 一草堂', '古本 さんぽ堂'], shugei: ['手芸 いと屋', '手芸の店 ぬのはな'],
    tokei: ['時計 正確堂', '時計店 タイム'], megane: ['メガネ 視光堂', 'めがねの店 ひとみ'], kinken: ['チケット 金券'],
    barber: ['理容 ヤマダ', 'バーバー 青空', '理容室 みつ'], beauty: ['美容室 アンジュ', 'ヘアサロン みどり'],
    konbini: ['マルカ ストア'], super: ['スーパー まるとみ', 'フレッシュ やまびこ', 'スーパー なかよし'],
    drug: ['くすり ひかり', 'ドラッグ さくら'], home: ['ホームセンター みどりや', 'ホームプラザ だいち'], michi: ['農産物直売所', '道の駅 ふるさと']
  };
  H.name = function (key, rng) { return U.pick(rng, NAMES[key] || NAMES.shokudo); };
  H.MENU = {
    shokudo: ['さば味噌', 'しょうが焼', '肉じゃが', '焼魚定食', 'かつ丼', '親子丼', 'カレー', '冷奴'],
    soba: ['もり', 'かけ', 'ざる', '天ざる', 'きつね', 'たぬき', '山かけ', '鴨南蛮'], udon: ['かけ', 'きつね', '肉うどん', 'ざる', '天ぷら', '月見'],
    ramen: ['醤油', '味噌', '塩', 'チャーシュー', '餃子', 'ライス'], tachigui: ['かけ', 'かき揚げ', '春菊天', 'コロッケ', 'きつね', 'たぬき'],
    izakaya: ['枝豆', '冷奴', '刺身', '焼鳥', '唐揚', 'だし巻', '熱燗', '焼酎'], yakitori: ['ねぎま', 'つくね', 'かわ', 'ハツ', '砂肝', '手羽先'],
    yakiniku: ['上カルビ', 'ロース', 'タン塩', 'ハラミ', '冷麺', 'ビビンバ'], sushi: ['まぐろ', 'いか', 'たこ', 'えび', 'あなご', '玉子', '中とろ', 'いくら'],
    kissa: ['ブレンド', 'ナポリタン', 'ピラフ', 'ホットケーキ', 'トースト', 'クリームソーダ'], kanmi: ['白玉ぜんざい', 'あんみつ', 'くずきり', '抹茶', 'わらび餅'],
    curry: ['ポーク', 'ビーフ', 'カツカレー', 'チキン', 'ナン', 'ラッシー'], chuka: ['ラーメン', 'チャーハン', 'ギョーザ', 'レバニラ', '麻婆豆腐', '中華丼'],
    big: ['A定食', 'B定食', 'カレー', 'うどん', 'そば', 'ラーメン'], burger: ['バーガー', 'チーズ', 'ポテト', 'シェイク']
  };
  /* 語りに出てくる料理（話ごとの品書きと、黒板の献立にする） */
  const DISHES = ['さばの塩焼き', 'さばの味噌煮', 'さばのみそ煮', 'しょうが焼き', 'かつ丼', 'もつ煮', 'あじフライ', '冷やし中華', 'きのこうどん', 'みそラーメン', 'ざるそば', 'かけそば',
    'きつねうどん', 'かき揚げそば', '春菊天そば', 'ナポリタン', 'ピラフ', 'ホットケーキ', '白玉ぜんざい', 'カツカレー', 'シチュー', 'ギョーザ', 'チャーハン', 'ぶり大根',
    'いかの一夜干し', 'もずく', '葛きり', 'かき氷', '新そば', 'きのこそば', '冷やしたぬき', '枝豆', '冷ややっこ', 'から揚げ', 'だし巻き', 'ちくわの天ぷら', 'あさりの味噌汁', 'きのこうどん'];
  H.dishes = function (text) { const out = []; for (const d of DISHES) if (text.indexOf(d) >= 0 && !out.includes(d)) out.push(d); return out; };
  H.special = function (text) { const m = /日替わり[はの、]*([^、。だ]{2,9})/.exec(text || ''); return m ? m[1] : null; };

  /* ================= 3. 文字の板と、品物の模様 ================= */
  const texCache = {};
  function canvasTex(key, w, h, draw) {
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); draw(g, w, h);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData.shared = true;
    texCache[key] = t; return t;
  }
  const FONT = { mincho: '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif', gothic: '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif' };
  /* 文字の板。lines は 1 行ずつの文字列。vertical なら縦書き（1 列ずつ） */
  H.textTex = function (lines, o) {
    o = o || {}; lines = [].concat(lines);
    const w = o.w || 256, h = o.h || 64, key = 'tx|' + lines.join('/') + JSON.stringify(o);
    return canvasTex(key, w, h, (g) => {
      g.fillStyle = o.bg || '#f4f0e6'; g.fillRect(0, 0, w, h);
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(2, w / 60); g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2); }
      g.fillStyle = o.fg || '#2a2622'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const fam = FONT[o.font || 'gothic'], wt = o.weight || 600, pad = o.pad != null ? o.pad : 0.12;
      if (o.vertical) {
        const cols = lines.length, cw = w / cols;
        lines.forEach((ln, ci) => {
          const n = Math.max(1, ln.length), fs = Math.min(cw * (1 - pad * 2), (h * (1 - pad * 2)) / n);
          g.font = `${wt} ${fs}px ${fam}`;
          const x = w - cw * (ci + 0.5), y0 = (h - fs * n) / 2 + fs / 2;
          for (let i = 0; i < n; i++) {
            const ch = ln[i], rot = /[ー〜]/.test(ch);
            if (rot) { g.save(); g.translate(x, y0 + i * fs); g.rotate(PI / 2); g.fillText(ch, 0, 0); g.restore(); }
            else g.fillText(ch, x, y0 + i * fs);
          }
        });
      } else {
        const n = lines.length, lh = h / n;
        lines.forEach((ln, i) => {
          let fs = lh * (1 - pad * 2); g.font = `${wt} ${fs}px ${fam}`;
          const mw = g.measureText(ln).width, lim = w * (1 - pad * 2 * (h / w));
          if (mw > lim) { fs *= lim / mw; g.font = `${wt} ${fs}px ${fam}`; }
          g.fillText(ln, w / 2, lh * (i + 0.5));
        });
      }
    });
  };
  /* 品物の模様。棚の前に貼って、たくさんの品が並んで見えるようにする */
  const GOODS = {
    packs: ['#d9483b', '#f0c33c', '#3b7dd8', '#e8e4da', '#5aa05a', '#e07a2e', '#8a5ad0', '#f2f0ea', '#c23a6a'],
    snack: ['#e8452f', '#f6d13c', '#2f6fd6', '#f08a1c', '#3aa86b', '#d93c7e', '#ffffff'],
    drinks: ['#e8e8e8', '#4fa3e0', '#e85a3a', '#f5c842', '#3ab070', '#b04ac8', '#2a2a2a'],
    boxes: ['#ffffff', '#e9eef5', '#2f6db5', '#e86f9a', '#5ab4c8', '#f0f0f0', '#c8d8ea'],
    hardware: ['#b98d5a', '#c49a66', '#a87c4a', '#d8b47e', '#e6e1d6'],
    souvenir: ['#c8483a', '#e8d9b0', '#4a7a5a', '#d9a23c', '#ffffff', '#7a4a3a'],
    icecream: ['#ffffff', '#f2c8d8', '#c8e0f2', '#f6e3a8', '#d8f0d0'],
    books: ['#a8453a', '#2f3b55', '#4f7d5a', '#d9cdb6', '#e4e2da', '#4c7f86', '#5c4531', '#8d9094', '#d9b445', '#ffffff'],
    oldbooks: ['#7a5a3a', '#5a4a3a', '#8a7a5a', '#a89070', '#4a3a2a', '#6a5a4a', '#9a8a6a', '#3a3a3a'],
    thread: ['#d9483b', '#f0c33c', '#3b7dd8', '#e8e4da', '#5aa05a', '#e07a2e', '#8a5ad0', '#f2a0b0', '#2a2a2a', '#7ac8c8'],
    gifts: ['#f4f0e6', '#c8483a', '#4a6a8a', '#e8d9b0', '#7a4a6a']
  };
  H.goodsTex = function (type, seed) {
    const key = 'gd|' + type + '|' + (seed || 1);
    return canvasTex(key, 512, 256, (g, w, h) => {
      const r = U.rng(U.hash(key));
      const row = (n, bg, draw) => { const rh = h / n; for (let i = 0; i < n; i++) { g.fillStyle = bg; g.fillRect(0, i * rh, w, rh); draw(i * rh, rh); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * rh + rh - 6, w, 6); g.fillStyle = '#e8e4d8'; g.fillRect(0, i * rh + rh - 10, w, 4); } };
      const cols = GOODS[type] || GOODS.packs;
      if (type === 'packs' || type === 'snack' || type === 'boxes' || type === 'hardware' || type === 'souvenir' || type === 'icecream' || type === 'gifts') {
        row(4, '#3a3530', (y, rh) => {
          let x = 0;
          const base = y + rh - 10;
          while (x < w) {
            const c = U.pick(r, cols), shape = type === 'hardware' || type === 'gifts' || type === 'icecream' ? 'box' : U.pick(r, ['box', 'box', 'bag', 'bottle', 'can', 'box']);
            const n = 2 + Math.floor(r() * 4);
            for (let k = 0; k < n && x < w; k++) {
              if (shape === 'bottle') { const bw = 13, bh = rh * 0.6; g.fillStyle = c; g.fillRect(x + 2, base - bh * 0.75, bw - 3, bh * 0.75); g.fillRect(x + 5, base - bh, bw * 0.35, bh * 0.28); g.fillStyle = '#f4f2ea'; g.fillRect(x + 2, base - bh * 0.5, bw - 3, bh * 0.18); x += bw; }
              else if (shape === 'can') { const bw = 17, bh = rh * 0.38; g.fillStyle = c; g.fillRect(x + 1, base - bh, bw - 2, bh); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 3, base - bh * 0.7, bw - 6, bh * 0.3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1, base - bh, bw - 2, 2); x += bw; }
              else if (shape === 'bag') { const bw = 30 + r() * 10, bh = rh * (0.38 + r() * 0.2); g.fillStyle = c; g.beginPath(); g.moveTo(x + 2, base); g.lineTo(x + 2, base - bh + 6); g.quadraticCurveTo(x + bw / 2, base - bh - 4, x + bw - 2, base - bh + 6); g.lineTo(x + bw - 2, base); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x + bw / 2, base - bh * 0.5, bw * 0.28, bh * 0.16, 0, 0, 6.3); g.fill(); x += bw; }
              else { const bw = (type === 'hardware' ? 44 : 22) + r() * (type === 'hardware' ? 40 : 16), bh = rh * (type === 'hardware' ? 0.5 + r() * 0.35 : 0.34 + r() * 0.26); g.fillStyle = c; g.fillRect(x + 1, base - bh, bw - 2, bh); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x + 4, base - bh * 0.72, bw - 8, bh * 0.2); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + bw - 4, base - bh, 3, bh); x += bw; }
            }
            g.fillStyle = '#fbf8ee'; g.fillRect(x - 18, base + 1, 16, 7); g.fillStyle = '#d93a2a'; g.fillRect(x - 16, base + 3, 10, 3);
            x += 4 + r() * 6;
          }
        });
      } else if (type === 'drinks' || type === 'bottles' || type === 'sake') {
        row(type === 'sake' ? 3 : 4, type === 'drinks' ? '#dfe8ee' : '#2e2a26', (y, rh) => {
          let x = 4;
          while (x < w) {
            const bw = type === 'sake' ? 38 : 18, bh = rh * (type === 'sake' ? 0.85 : 0.7);
            const c = type === 'sake' ? U.pick(r, ['#2f5a3a', '#5a3a1e', '#cfd8d2', '#3a4a2a']) : (type === 'bottles' ? U.pick(r, ['#3a6a3a', '#6a4a1e', '#c8d0c8', '#c8a03a']) : U.pick(r, cols));
            g.fillStyle = c; g.fillRect(x, y + rh - 10 - bh * 0.78, bw - 4, bh * 0.78); g.fillRect(x + bw * 0.3, y + rh - 10 - bh, bw * 0.3, bh * 0.25);
            if (type === 'sake') { g.fillStyle = U.pick(r, ['#f2efe6', '#e8d9a0', '#f4f0e6', '#c8392b']); g.fillRect(x + 6, y + rh - 10 - bh * 0.6, bw - 16, bh * 0.3); g.fillStyle = '#2a2622'; g.fillRect(x + bw / 2 - 4, y + rh - 10 - bh * 0.57, 3, bh * 0.22); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + rh - 10 - bh * 0.75, 3, bh * 0.6); }
            else { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(x + 1, y + rh - 10 - bh * 0.55, bw - 6, bh * 0.22); }
            x += bw + (type === 'sake' ? 6 + r() * 10 : (r() < 0.1 ? 8 : 1));
          }
        });
      } else if (type === 'books' || type === 'oldbooks') {
        row(4, type === 'books' ? '#4a3a2a' : '#2e2620', (y, rh) => {
          let x = 0;
          while (x < w) {
            const bw = 7 + r() * 13, bh = rh * (0.62 + r() * 0.3); g.fillStyle = U.pick(r, cols); g.fillRect(x, y + rh - 10 - bh, bw - 1, bh);
            g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x + 1, y + rh - 10 - bh + bh * 0.15, bw - 3, 2); g.fillRect(x + 1, y + rh - 10 - bh * 0.25, bw - 3, 2);
            x += bw + (r() < 0.05 ? 14 : 0);
          }
        });
      } else if (type === 'thread') {
        row(4, '#e8e2d4', (y, rh) => { for (let x = 4; x < w; x += 20) { g.fillStyle = U.pick(r, cols); g.fillRect(x, y + rh * 0.3, 15, rh * 0.5); g.fillStyle = '#c9b48f'; g.fillRect(x, y + rh * 0.28, 15, 4); g.fillRect(x, y + rh * 0.8, 15, 4); } });
      } else if (type === 'tools' || type === 'lure') {
        g.fillStyle = '#c9a77a'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(60,40,20,0.5)'; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 2, 0, 6.3); g.fill(); }
        for (let i = 0; i < 40; i++) {
          const x = r() * w, y = 20 + r() * (h - 50);
          if (type === 'lure') { g.fillStyle = U.pick(r, ['#e8452f', '#f6d13c', '#2f9ad6', '#f08a1c', '#c0c8d0', '#3aa86b']); g.beginPath(); g.ellipse(x, y, 10, 4, 0.3, 0, 6.3); g.fill(); g.fillStyle = '#e6e6e6'; g.fillRect(x - 1, y - 14, 2, 10); }
          else { g.fillStyle = U.pick(r, ['#7a7f86', '#9aa0a6', '#5a5f66']); g.fillRect(x, y, 6, 26 + r() * 16); g.fillStyle = U.pick(r, ['#c8483a', '#2f5a9a', '#e0b030', '#2a2a2a']); g.fillRect(x - 1, y + 20, 8, 14); }
        }
      } else if (type === 'veg') {
        g.fillStyle = '#6a5034'; g.fillRect(0, 0, w, h);
        const kinds = [['#c8352a', 9], ['#3e7a2e', 8], ['#5a2e5a', 10], ['#e07a2e', 7], ['#e8d27a', 9], ['#7aa83a', 11], ['#a8452e', 8]];
        const cellW = w / 6;
        for (let b = 0; b < 12; b++) {
          const bx = (b % 6) * cellW, by = Math.floor(b / 6) * (h / 2), kd = U.pick(r, kinds);
          g.fillStyle = '#b08a5a'; g.fillRect(bx + 4, by + 6, cellW - 8, h / 2 - 12);
          for (let i = 0; i < 26; i++) { g.fillStyle = K.shade(kd[0], 0.82 + r() * 0.3); g.beginPath(); g.ellipse(bx + 10 + r() * (cellW - 20), by + 14 + r() * (h / 2 - 28), kd[1], kd[1] * (kd[0] === '#5a2e5a' || kd[0] === '#e07a2e' ? 0.5 : 0.9), r() * 3, 0, 6.3); g.fill(); }
          g.fillStyle = '#f4f0e6'; g.fillRect(bx + cellW * 0.25, by + h / 2 - 26, cellW * 0.5, 16);
        }
      } else if (type === 'fish') {
        g.fillStyle = '#e8eef2'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? '#ffffff' : '#c8d6de'; g.fillRect(r() * w, r() * h, 3, 3); }
        for (let i = 0; i < 9; i++) { g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(30 + i * 56, 128, 10, 120, 0, 0, 6.3); g.fill(); }
        for (let i = 0; i < 22; i++) {
          const x = 30 + (i % 8) * 62 + r() * 10, y = 34 + Math.floor(i / 8) * 80 + r() * 10, kd = U.pick(r, [['#9aa8b4', '#3a4a5a'], ['#c8483a', '#e89a8a'], ['#b8c4cc', '#2f4a6a'], ['#8a9aa8', '#5a6a3a']]);
          g.fillStyle = kd[0]; g.beginPath(); g.ellipse(x, y, 26, 9, 0.1, 0, 6.3); g.fill();
          g.fillStyle = kd[1]; g.beginPath(); g.ellipse(x, y - 4, 22, 4, 0.1, 0, 6.3); g.fill();
          g.fillStyle = kd[0]; g.beginPath(); g.moveTo(x + 24, y); g.lineTo(x + 36, y - 8); g.lineTo(x + 36, y + 8); g.fill();
          g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(x - 18, y - 1, 2, 0, 6.3); g.fill();
        }
      } else if (type === 'meat' || type === 'fried' || type === 'neta' || type === 'sweets' || type === 'bread') {
        g.fillStyle = type === 'bread' ? '#8a6a46' : (type === 'neta' ? '#f2f2ec' : '#f4f2ea'); g.fillRect(0, 0, w, h);
        const nx = 8, ny = 3, cw = w / nx, ch = h / ny;
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const x = i * cw, y = j * ch;
          if (type === 'bread') {
            g.fillStyle = '#c9a56e'; g.fillRect(x + 4, y + 6, cw - 8, ch - 12);
            for (let k = 0; k < 3; k++) { g.fillStyle = K.shade(U.pick(r, ['#b8762e', '#c98a3e', '#a8622a', '#d9a35a']), 0.9 + r() * 0.2); g.beginPath(); g.ellipse(x + cw * (0.25 + k * 0.25), y + ch * 0.5, cw * 0.11, ch * 0.22, 0, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,240,200,0.35)'; g.beginPath(); g.ellipse(x + cw * (0.25 + k * 0.25) - 3, y + ch * 0.42, cw * 0.05, ch * 0.07, 0, 0, 6.3); g.fill(); }
            g.fillStyle = '#ffffff'; g.fillRect(x + cw * 0.3, y + ch - 20, cw * 0.4, 10);
          } else if (type === 'neta') {
            const c = U.pick(r, ['#c8282a', '#f4f2ea', '#f08a3a', '#e8c83a', '#e86a6a', '#d0d8d8']);
            g.fillStyle = c; g.fillRect(x + 6, y + ch * 0.3, cw - 12, ch * 0.4); g.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 4; k++) g.fillRect(x + 10 + k * 12, y + ch * 0.32, 3, ch * 0.36);
            g.fillStyle = '#4f8a3a'; g.fillRect(x + 2, y + ch * 0.28, 4, ch * 0.44);
          } else {
            g.fillStyle = '#ffffff'; g.fillRect(x + 4, y + 6, cw - 8, ch - 12); g.strokeStyle = '#c8c4b8'; g.strokeRect(x + 4, y + 6, cw - 8, ch - 12);
            const c = type === 'meat' ? U.pick(r, ['#b83a3a', '#c85a5a', '#d87a7a', '#a83030']) : (type === 'fried' ? U.pick(r, ['#b8762e', '#c98a3e', '#a8622a']) : U.pick(r, ['#f2c8d8', '#ffffff', '#b8d8a8', '#e8d0a0', '#a87a5a', '#e8a8b8']));
            for (let k = 0; k < (type === 'meat' ? 2 : 5); k++) {
              g.fillStyle = K.shade(c, 0.9 + r() * 0.2); g.beginPath();
              if (type === 'meat') { g.ellipse(x + cw * (0.35 + k * 0.3), y + ch * 0.5, cw * 0.18, ch * 0.28, r(), 0, 6.3); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(x + cw * (0.25 + k * 0.3), y + ch * (0.35 + q * 0.08)); g.lineTo(x + cw * (0.45 + k * 0.3), y + ch * (0.38 + q * 0.08)); g.stroke(); } }
              else { g.ellipse(x + cw * (0.2 + (k % 3) * 0.3), y + ch * (0.36 + Math.floor(k / 3) * 0.3), cw * 0.1, ch * 0.12, 0, 0, 6.3); g.fill(); }
            }
            g.fillStyle = '#d93a2a'; g.fillRect(x + cw * 0.55, y + ch - 22, cw * 0.38, 12);
          }
        }
      } else if (type === 'tickets') {
        g.fillStyle = '#20242a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 28; i++) { const x = 8 + (i % 7) * 72, y = 10 + Math.floor(i / 7) * 62; g.fillStyle = U.pick(r, ['#e8d9a0', '#c8e0c8', '#f0c8c8', '#c8d8f0', '#f4f0e6']); g.fillRect(x, y, 62, 48); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 6, y + 8, 40, 5); g.fillRect(x + 6, y + 30, 26, 8); }
      } else if (type === 'frames' || type === 'watches') {
        g.fillStyle = type === 'frames' ? '#f2f0ea' : '#2a2430'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 24; i++) {
          const x = 40 + (i % 6) * 82, y = 34 + Math.floor(i / 6) * 62;
          if (type === 'frames') { g.strokeStyle = U.pick(r, ['#2a2a2a', '#7a4a2a', '#9aa0a8', '#3a5a8a', '#8a2a3a']); g.lineWidth = 4; g.beginPath(); g.ellipse(x - 14, y, 13, 10, 0, 0, 6.3); g.ellipse(x + 14, y, 13, 10, 0, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y - 2); g.stroke(); }
          else { g.fillStyle = U.pick(r, ['#5a3a2a', '#2a2a2a', '#9aa0a8']); g.fillRect(x - 4, y - 24, 8, 48); g.fillStyle = U.pick(r, ['#c8c8c0', '#d8b860', '#e8e8e8']); g.beginPath(); g.arc(x, y, 12, 0, 6.3); g.fill(); g.fillStyle = '#f4f2ea'; g.beginPath(); g.arc(x, y, 9, 0, 6.3); g.fill(); }
        }
      } else if (type === 'tins') {
        row(3, '#5c4531', (y, rh) => { for (let x = 6; x < w; x += 42) { g.fillStyle = U.pick(r, ['#2f5a3a', '#1e2a22', '#6a2a2a', '#c8b060', '#3a3a5a']); g.fillRect(x, y + rh * 0.2, 34, rh * 0.65); g.fillStyle = '#e8d9a0'; g.fillRect(x + 5, y + rh * 0.38, 24, rh * 0.25); } });
      } else if (type === 'chart') {
        g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a';
        const rows = [26, 20, 15, 11, 8, 6, 4];
        rows.forEach((s, j) => { const n = Math.floor(w / (s * 4.2)); for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n, y = 18 + j * 34; g.lineWidth = s * 0.4; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.arc(x, y, s, (i * 1.7) % 6.3 + 0.35, (i * 1.7) % 6.3 + 6.0); g.stroke(); } });
      } else if (type === 'photos') {
        g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) { const x = 12 + (i % 4) * 126, y = 12 + Math.floor(i / 4) * 122; g.fillStyle = U.pick(r, ['#1e5a7a', '#2a6a8a', '#14465e']); g.fillRect(x, y, 112, 108); g.fillStyle = U.pick(r, ['#f0a03a', '#e85a8a', '#f4f0e6', '#8ad0e8', '#c83a3a']); g.beginPath(); g.ellipse(x + 56, y + 60, 30, 12, r(), 0, 6.3); g.fill(); }
      } else {
        g.fillStyle = '#888'; g.fillRect(0, 0, w, h);
      }
    });
  };
  /* 縞（日よけの布、回る看板） */
  H.stripeTex = function (a, b, n, diag) {
    return canvasTex('st|' + a + b + n + (diag ? 'd' : ''), 128, 128, (g, w, h) => {
      g.fillStyle = b; g.fillRect(0, 0, w, h); g.fillStyle = a;
      if (!diag) for (let i = 0; i < n; i += 2) g.fillRect(i * w / n, 0, w / n, h);
      else for (let i = -n; i < n * 2; i += 2) { g.beginPath(); g.moveTo(i * w / n, h); g.lineTo((i + 1) * w / n, h); g.lineTo((i + 1) * w / n + w, 0); g.lineTo(i * w / n + w, 0); g.fill(); }
    });
  };

  /* ================= 4. 部品 ================= */
  const mStd = (c, o) => K.m(c, o);
  H.mat = { steel: () => K.m(P.steel, { metal: 0.55, rough: 0.35 }), glass: () => K.m(P.glass, { transparent: true, opacity: 0.1, rough: 0.45 }) };
  /* 立てた板（中心が x, y, z。+Z を向く） */
  H.vplane = function (w, h, mat, x, y, z, ry) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry;
    m.receiveShadow = true; return m;
  };
  H.texMat = (tex, o) => K.m('#ffffff', Object.assign({ map: tex, rough: 0.7 }, o || {}));
  /* 文字の板を、厚みのある看板にする。y は下の高さ */
  H.sign = function (text, w, h, o) {
    o = o || {};
    const g = new T.Group(), lines = [].concat(text), vertical = !!o.vertical;
    const px = vertical ? [128, Math.round(128 * h / w)] : [Math.round(256 * Math.min(4, w / h)), 128];
    const tex = H.textTex(lines, { w: Math.min(1024, px[0] * 2), h: Math.min(1024, px[1] * 2), bg: o.bg || '#f4f0e6', fg: o.fg || '#2a2622', font: o.font || 'gothic', vertical, border: o.border, weight: o.weight });
    g.add(K.box(w + 0.04, h + 0.04, 0.04, K.m(o.frame || P.woodDark), 0, 0, -0.02));
    const face = H.vplane(w, h, H.texMat(tex, { emissive: o.lit ? '#ffffff' : null, ei: o.lit ? 0 : undefined, nocache: true }), 0, h / 2 + 0.02, 0.002);
    if (o.lit) { face.material.emissiveMap = tex; face.material.emissive = new T.Color('#ffffff'); face.material.emissiveIntensity = 0; g.userData.setLamp = (v) => { face.material.emissiveIntensity = 0.25 + v * 0.55; }; }
    g.add(face); g.userData.face = face; return g;
  };
  /* のれん。chars は 1 枚に 1 字 */
  H.noren = function (chars, color, w, h) {
    const g = new T.Group(), n = chars.length, sw = w / n;
    for (let i = 0; i < n; i++) {
      const tex = H.textTex([chars[i]], { w: 128, h: 160, bg: color, fg: (color === '#e6dfd0' || color === '#f4f0e6') ? '#2f3b55' : '#f4f0e6', font: 'mincho', weight: 700, vertical: true, pad: 0.22 });
      const seg = H.vplane(sw - 0.02, h, H.texMat(tex, { nocache: true }), -w / 2 + sw * (i + 0.5), -h / 2, 0); seg.material.side = T.FrontSide; g.add(seg);
      const back = H.vplane(sw - 0.02, h, K.m(color, { rough: 0.9, nocache: true }), -w / 2 + sw * (i + 0.5), -h / 2, -0.002); back.material.side = T.BackSide; g.add(back);   // 裏から見ると無地（字が裏返って崩れて見えないように）
    }
    g.add(K.rod([-w / 2 - 0.06, 0.02, 0], [w / 2 + 0.06, 0.02, 0], 0.012, K.m(P.woodDark)));
    g.userData.sway = (t) => { g.children.forEach((s, i) => { if (s.isMesh && s.geometry.type === 'PlaneGeometry') s.rotation.x = Math.sin(t * 1.3 + i) * 0.05; }); };
    return g;
  };
  /* 赤ちょうちん */
  H.lantern = function (text, color) {
    const g = new T.Group(), c = color || '#c8392b';
    const tex = H.textTex([text], { w: 128, h: 256, bg: c, fg: '#1a1210', font: 'mincho', weight: 800, vertical: true, pad: 0.2 });
    const m = K.m('#ffffff', { map: tex, emissive: '#ffffff', ei: 0, rough: 0.8, nocache: true }); m.emissiveMap = tex;
    const body = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.48, 18, 1, false), m); body.scale.set(1, 1, 1); body.position.y = -0.3; g.add(body);
    g.add(K.cyl(0.12, 0.04, K.m(P.black), 0, -0.07, 0)); g.add(K.cyl(0.12, 0.04, K.m(P.black), 0, -0.58, 0));
    const pl = new T.PointLight(0xff8a5a, 0, 3.5, 2); pl.position.y = -0.3; g.add(pl);
    g.userData.setLamp = (v) => { m.emissiveIntensity = 0.2 + v * 0.9; pl.intensity = v * 1.6; };
    g.userData.noLight = () => { g.remove(pl); };
    return g;
  };
  /* 日よけ。w は幅、d は張り出し */
  H.awning = function (w, d, a, b, text) {
    const g = new T.Group(), tex = H.stripeTex(a, b, 10), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, w / 1.2), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    const top = K.box(w, 0.02, d, H.texMat(t2, { nocache: true }), 0, 0, d / 2); top.rotation.x = 0.32; g.add(top);
    if (text) { const v = H.vplane(w, 0.26, H.texMat(H.textTex([text], { w: 1024, h: 96, bg: a, fg: b === '#ffffff' || b === '#f4f0e6' ? '#ffffff' : '#ffffff', font: 'gothic', weight: 800 }), { nocache: true }), 0, -0.36, d * 0.95); g.add(v); }
    else g.add(K.box(w, 0.24, 0.01, H.texMat(t2, { nocache: true }), 0, -0.5, d * 0.95));
    return g;
  };
  /* 縦の品書き（壁に並べる）。+Z を向く */
  H.menuTags = function (items, o) {
    o = o || {}; const g = new T.Group(), tw = o.w || 0.11, th = o.h || 0.42;
    items.forEach((it, i) => {
      const tex = H.textTex([it], { w: 96, h: 384, bg: o.bg || '#f4efe2', fg: o.fg || '#2a2622', font: 'mincho', weight: 700, vertical: true, pad: 0.1 });
      g.add(H.vplane(tw, th, H.texMat(tex, { nocache: true }), i * (tw + 0.03), 0, 0));
    });
    return g;
  };
  /* 横長の品書きの板 */
  H.menuBoard = function (title, items, w, h, o) {
    o = o || {};
    const lines = [title].concat(items.slice(0, o.rows || 6));
    const tex = H.textTex(lines, { w: 512, h: Math.round(512 * h / w), bg: o.bg || '#2a2a26', fg: o.fg || '#f4f0e6', font: o.font || 'gothic', weight: 600, pad: 0.12 });
    const g = new T.Group(); g.add(K.box(w + 0.05, h + 0.05, 0.03, K.m(o.frame || P.woodDark), 0, -0.025, -0.015));
    const face = H.vplane(w, h, H.texMat(tex, { nocache: true, emissive: o.lit ? '#ffffff' : null, ei: o.lit ? 0.35 : undefined }), 0, h / 2, 0.002); if (o.lit) face.material.emissiveMap = tex;
    g.add(face); return g;
  };
  /* 立て看板の黒板 */
  H.chalkboard = function (lines) {
    const g = new T.Group(), tex = H.textTex(lines, { w: 256, h: 340, bg: '#233228', fg: '#f2efe2', font: 'gothic', weight: 500, pad: 0.12, border: '#7a5a3a' });
    const face = H.vplane(0.5, 0.66, H.texMat(tex, { nocache: true }), 0, 0.62, 0.07); face.rotation.x = -0.18; g.add(face);
    for (const sx of [-1, 1]) { g.add(K.rod([sx * 0.25, 0, 0.16], [sx * 0.25, 0.98, 0.0], 0.016, K.m(P.woodDark))); g.add(K.rod([sx * 0.25, 0, -0.18], [sx * 0.25, 0.98, 0.0], 0.016, K.m(P.woodDark))); }
    return g;
  };
  H.ticketMachine = function () {
    const g = new T.Group(); g.add(K.box(0.56, 1.5, 0.42, K.m('#d9dadb', { rough: 0.5 }), 0, 0, 0));
    const tex = H.goodsTex('boxes', 7), face = H.vplane(0.46, 0.5, H.texMat(tex, { emissive: '#ffffff', ei: 0.4, nocache: true }), 0, 1.15, 0.212); face.material.emissiveMap = tex; g.add(face);
    g.add(K.box(0.4, 0.12, 0.02, K.m(P.dark), 0, 0.72, 0.212)); g.add(K.box(0.2, 0.06, 0.03, K.m(P.black), 0, 0.5, 0.212));
    return g;
  };
  H.register = function (c) {
    const g = new T.Group(); g.add(K.box(0.36, 0.1, 0.32, K.m(c || P.dark, { rough: 0.5 }), 0, 0, 0)); g.add(K.box(0.3, 0.12, 0.2, K.m(c || P.dark), 0, 0.1, -0.04));
    g.add(K.box(0.2, 0.12, 0.02, K.m('#1a2228', { emissive: '#8fe0a8', ei: 0.4 }), 0, 0.24, -0.03)); return g;
  };
  /* 石油ストーブとやかん */
  H.stove = function () {
    const g = new T.Group(); g.add(K.cyl(0.22, 0.46, K.m('#3a3b40', { metal: 0.3, rough: 0.5 }), 0, 0, 0, { seg: 20 }));
    const glow = K.cyl(0.18, 0.18, K.m('#ff8a3a', { emissive: '#ff6a2a', ei: 0.9 }), 0, 0.12, 0, { seg: 20, noShadow: true }); g.add(glow);
    g.add(K.cyl(0.235, 0.03, K.m(P.steel, { metal: 0.6, rough: 0.3 }), 0, 0.46, 0, { seg: 20 }));
    const kt = K.teapot(P.steel); kt.scale.setScalar(1.3); K.at(kt, 0, 0.49, 0); g.add(kt);
    const pl = new T.PointLight(0xff8a4a, 0.9, 3, 2); pl.position.y = 0.25; g.add(pl);
    return g;
  };
  H.umbrellaStand = function (n) {
    const g = new T.Group(); g.add(K.cyl(0.13, 0.42, K.m('#7f8a86', { metal: 0.3 }), 0, 0, 0, { seg: 14, open: true }));
    for (let i = 0; i < n; i++) { const a = i * 2.1, c = ['#2f3b55', '#a8453a', '#4f7d5a', '#3a3b40', '#d9b445'][i % 5]; g.add(K.rod([Math.cos(a) * 0.05, 0.05, Math.sin(a) * 0.05], [Math.cos(a) * 0.1, 0.86, Math.sin(a) * 0.1], 0.03, K.m(c))); g.add(K.rod([Math.cos(a) * 0.1, 0.86, Math.sin(a) * 0.1], [Math.cos(a) * 0.1, 0.98, Math.sin(a) * 0.1], 0.008, K.m(P.woodDark))); }
    return g;
  };
  H.plant = function (s, potC, leaf) {
    const g = new T.Group(); s = s || 1;
    g.add(K.cyl(0.13 * s, 0.26 * s, K.m(potC || '#8f6a4f'), 0, 0, 0, { rTop: 0.16 * s, seg: 14 }));
    const b = K.bush(leaf || P.leaf, 0.3 * s, 5); K.at(b, 0, 0.3 * s, 0); g.add(b); return g;
  };
  H.maneki = function () {
    const g = new T.Group(), w = K.m('#f4f2ea', { rough: 0.5 });
    g.add(K.sph(0.07, w, 0, 0.07, 0, { s: [1, 1.1, 0.9] })); g.add(K.sph(0.055, w, 0, 0.17, 0)); g.add(K.box(0.07, 0.02, 0.07, K.m('#c8392b'), 0, 0.12, 0.01));
    g.add(K.cap(0.017, 0.05, w, 0.05, 0.2, 0.02)); for (const sx of [-1, 1]) g.add(K.sph(0.017, w, sx * 0.03, 0.22, 0)); return g;
  };
  H.radio = function () { const g = new T.Group(); g.add(K.box(0.26, 0.15, 0.09, K.m('#7a5a3a', { rough: 0.6 }), 0, 0, 0)); g.add(K.box(0.12, 0.1, 0.01, K.m('#c9b48f'), -0.05, 0.025, 0.046)); g.add(K.cyl(0.015, 0.02, K.m(P.dark), 0.08, 0.06, 0.05)); g.add(K.rod([0.1, 0.15, 0], [0.16, 0.42, 0], 0.003, K.m(P.steel))); return g; };
  H.donationBox = function () { const g = new T.Group(); g.add(K.box(0.14, 0.12, 0.1, K.m('#e8e4da'), 0, 0, 0)); g.add(K.box(0.07, 0.006, 0.012, K.m(P.black), 0, 0.12, 0)); g.add(H.vplane(0.12, 0.05, H.texMat(H.textTex(['募金'], { w: 128, h: 64, bg: '#e8e4da', fg: '#c8392b' })), 0, 0.06, 0.051)); return g; };
  H.nobori = function (text, color) {
    const g = new T.Group(); g.add(K.cyl(0.015, 2.4, K.m(P.steel), 0, 0, 0)); g.add(K.cyl(0.11, 0.08, K.m('#3a3b40'), 0, 0, 0));
    const tex = H.textTex([text], { w: 128, h: 512, bg: color || '#c8392b', fg: '#ffffff', font: 'gothic', weight: 800, vertical: true, pad: 0.12 });
    const f = H.vplane(0.42, 1.7, H.texMat(tex, { double: true, nocache: true }), 0.22, 1.4, 0); f.material.side = T.DoubleSide; g.add(f); g.userData.flag = f; return g;
  };
  /* 吊り下げの明かり（光を出すのは power をつけたものだけ。数をしぼって重くしない） */
  H.pendant = function (o) {
    o = o || {}; const g = new T.Group(), col = o.cool ? P.lampCool : P.lampWarm, len = o.len || 0.6;
    g.add(K.rod([0, 0, 0], [0, -len, 0], 0.004, K.m(P.dark), { noCast: true }));
    const m = K.m(o.shadeColor || col, { emissive: col, ei: 0, nocache: true, rough: 0.6 });
    let shade;
    if (o.kind === 'bulb') shade = K.sph(0.05, m, 0, -len - 0.05, 0, { noShadow: true });
    else if (o.kind === 'washi') shade = K.cyl(0.14, 0.26, m, 0, -len - 0.26, 0, { rTop: 0.12, seg: 16, noShadow: true });
    else if (o.kind === 'glass') shade = K.sph(0.1, m, 0, -len - 0.1, 0, { s: [1, 0.8, 1], noShadow: true });
    else shade = K.cyl(0.2, 0.14, m, 0, -len - 0.14, 0, { rTop: 0.05, seg: 18, noShadow: true });
    g.add(shade);
    let pl = null;
    if (o.power) { pl = new T.PointLight(o.cool ? 0xe8f0ff : 0xffcf98, 0, o.dist || 5, 1.7); pl.position.y = -len - 0.25; g.add(pl); }
    g.userData.power = o.power || 0;
    g.userData.setLamp = (v, power) => { m.emissiveIntensity = 0.15 + v * 1.4; if (pl) pl.intensity = v * (power || o.power); };
    return g;
  };
  /* 天井の蛍光灯の板（光は出さず、明るく見えるだけ） */
  H.panel = function (w, d, cool) {
    const m = K.m(cool === false ? P.lampWarm : P.lampCool, { emissive: cool === false ? P.lampWarm : P.lampCool, ei: 0, nocache: true });
    const b = K.box(w, 0.03, d, m, 0, -0.03, 0, { noShadow: true }); b.userData.setLamp = (v) => { m.emissiveIntensity = 0.25 + v * 1.25; }; return b;
  };
  /* ガラス戸の冷蔵ケース（壁ぎわ）。front は +Z */
  H.cooler = function (len, h, type, seed) {
    const g = new T.Group(); h = h || 1.9;
    g.add(K.box(len, h, 0.7, K.m('#d9dadb', { rough: 0.5 }), 0, 0, 0));
    const tex = H.goodsTex(type || 'drinks', seed || 3), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, len / 1.1), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    const face = H.vplane(len - 0.08, h - 0.3, H.texMat(t2, { emissive: '#ffffff', ei: 0.45, nocache: true }), 0, (h - 0.3) / 2 + 0.12, 0.33); face.material.emissiveMap = t2; g.add(face);
    g.add(K.box(len - 0.06, h - 0.26, 0.02, H.mat.glass(), 0, 0.1, 0.355, { noShadow: true }));
    const n = Math.max(1, Math.round(len / 0.7)); for (let i = 0; i <= n; i++) g.add(K.box(0.04, h - 0.2, 0.04, K.m('#c6c8c9'), -len / 2 + i * len / n, 0.08, 0.36));
    return g;
  };
  /* 両面の陳列棚（通路の棚）。長さは x 方向 */
  H.gondola = function (len, h, depth, type, seed, o) {
    o = o || {}; const g = new T.Group(); depth = depth || 0.9;
    g.add(K.box(len, 0.1, depth, K.m(o.base || '#cfd0cc'), 0, 0, 0)); g.add(K.box(len, h, 0.04, K.m(o.back || '#e6e6e2'), 0, 0.1, 0));
    const rows = o.rows || 4;
    for (let i = 1; i <= rows; i++) for (const sz of [-1, 1]) g.add(K.box(len, 0.02, depth / 2 - 0.04, K.m(o.board || '#d9dad6'), 0, 0.1 + i * (h - 0.1) / (rows + 0.2), sz * depth / 4));
    const tex = H.goodsTex(type || 'packs', seed || 1), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, Math.round(len / 1.1)), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    const mat = H.texMat(t2, { nocache: true });
    for (const sz of [-1, 1]) { const p = H.vplane(len - 0.02, h - 0.12, mat, 0, 0.1 + (h - 0.12) / 2, sz * (depth / 2 - 0.12), sz < 0 ? PI : 0); g.add(p); }
    for (const sx of [-1, 1]) g.add(K.box(0.05, h + 0.06, depth, K.m(o.end || '#bfc0bc'), sx * (len / 2 + 0.02), 0, 0));
    if (o.header) { const s = H.sign(o.header, Math.min(1.4, len * 0.5), 0.28, { bg: o.headerBg || '#2f6db5', fg: '#ffffff', frame: '#e6e6e2' }); K.at(s, 0, h + 0.15, 0); g.add(s); const s2 = s.clone(); s2.rotation.y = PI; g.add(s2); }
    return g;
  };
  /* 片面の壁の棚 */
  H.wallShelf = function (len, h, type, seed, o) {
    o = o || {}; const g = new T.Group(), depth = o.depth || 0.38, rows = o.rows || 4;
    g.add(K.box(len, h, 0.03, K.m(o.back || '#d9d4c6'), 0, 0, -depth / 2));
    for (let i = 0; i <= rows; i++) g.add(K.box(len, 0.025, depth, K.m(o.board || P.wood), 0, i * (h - 0.03) / rows, 0));
    for (const sx of [-1, 1]) g.add(K.box(0.03, h, depth, K.m(o.board || P.wood), sx * len / 2, 0, 0));
    if (o.goods === false) return g;
    const tex = H.goodsTex(type || 'packs', seed || 2), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, Math.round(len / 1.1)), rows / 4); t2.wrapS = t2.wrapT = T.RepeatWrapping; t2.needsUpdate = true;
    g.add(H.vplane(len - 0.04, h - 0.05, H.texMat(t2, { nocache: true }), 0, (h - 0.05) / 2 + 0.02, depth / 2 - 0.1));
    return g;
  };
  /* ガラスの陳列ケース（台）。上から品が見える */
  H.showcase = function (len, h, type, seed, o) {
    o = o || {}; const g = new T.Group(), d = o.depth || 0.6;
    g.add(K.box(len, Math.max(0.02, h - 0.32), d, K.m(o.base || '#d9d6cc', { rough: 0.5 }), 0, 0, 0));   // h は 0.34 以上で使う（低いと中の品が土台に埋まる）
    const tex = H.goodsTex(type, seed || 4), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, len / 1.2), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    const inside = K.plane(len - 0.06, d - 0.08, H.texMat(t2, { emissive: '#ffffff', ei: o.cold ? 0.2 : 0.3, nocache: true }), 0, h - 0.3, 0); inside.material.emissiveMap = t2; inside.rotation.x = (o.tilt != null ? o.tilt : 0.18); g.add(inside);
    const gl = K.box(len, 0.3, d, H.mat.glass(), 0, h - 0.3, 0, { noShadow: true }); K.noAO(gl); g.add(gl);
    const th = o.topH || 0.025; g.add(K.box(len + 0.02, th, d + 0.02, o.topM || K.m(P.steel, { metal: 0.5, rough: 0.3 }), 0, h + 0.025 - th, 0));
    if (o.posts) for (const sx of [-1, 1]) g.add(K.box(0.025, 0.3, d, o.topM || K.m(P.steel), sx * (len / 2 - 0.0125), h - 0.3, 0));   // 両端の枠（ガラスの箱だと分かるように）
    return g;
  };
  /* 冷やして見せる平台（スーパーの魚・肉）。品は斜めの面に */
  H.coldCase = function (len, type, seed) {
    const g = new T.Group(); g.add(K.box(len, 0.8, 0.95, K.m('#e6e8ea', { rough: 0.5 }), 0, 0, 0)); g.add(K.box(len, 0.5, 0.12, K.m('#e6e8ea'), 0, 0.8, -0.42));
    const tex = H.goodsTex(type, seed || 5), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, len / 1.1), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    const top = K.plane(len - 0.08, 0.82, H.texMat(t2, { nocache: true }), 0, 0.82, 0.02); top.rotation.x = 0.22; g.add(top);
    g.add(K.box(len - 0.06, 0.04, 0.04, K.m(P.lampCool, { emissive: P.lampCool, ei: 0.8 }), 0, 1.25, -0.38, { noShadow: true }));
    return g;
  };
  /* ひな壇の台（八百屋・道の駅） */
  H.stepDisplay = function (len, type, seed, tiers) {
    const g = new T.Group(); tiers = tiers || 3;
    const tex = H.goodsTex(type || 'veg', seed || 6), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, len / 1.3), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    for (let i = 0; i < tiers; i++) {
      const y = 0.45 + i * 0.26, z = -i * 0.36;
      g.add(K.box(len, y, 0.4, K.m(P.woodLight, { rough: 0.8 }), 0, 0, z));
      const top = K.plane(len - 0.04, 0.38, H.texMat(t2, { nocache: true }), 0, y + 0.004, z); top.rotation.x = 0.25; g.add(top);
    }
    return g;
  };
  /* 斜めの台と魚 */
  H.fishDisplay = function (len, seed) {
    const g = new T.Group(); g.add(K.box(len, 0.62, 0.9, K.m('#e2e4e2', { rough: 0.4 }), 0, 0, 0));
    const tex = H.goodsTex('fish', seed || 8), t2 = tex.clone(); t2.userData.shared = false; t2.repeat.set(Math.max(1, len / 1.4), 1); t2.wrapS = T.RepeatWrapping; t2.needsUpdate = true;
    const top = K.plane(len - 0.04, 0.95, H.texMat(t2, { rough: 0.25, nocache: true }), 0, 0.82, 0); top.rotation.x = 0.42; g.add(top);
    const r = U.rng(seed || 8);
    for (let i = 0; i < 7; i++) { const f = H.fish3d(U.pick(r, ['#a8b4c0', '#c8483a', '#8a9aa8'])); K.at(f, -len / 2 + 0.3 + r() * (len - 0.6), 0.8 + r() * 0.06, -0.15 + r() * 0.35, r() * 0.6 - 0.3); f.rotation.x = -0.42; g.add(f); }
    for (let i = 0; i < 4; i++) g.add(K.box(0.5, 0.22, 0.32, K.m('#f4f6f6'), -len / 2 + 0.4 + i * 0.6, 0, 0.6));
    return g;
  };
  H.fish3d = function (c) {
    /* 氷の上に横たえた魚: 長さは x、背と腹は z、厚みは y */
    const g = new T.Group(), m = K.m(c, { rough: 0.3, metal: 0.25 }), back = K.m(K.shade(c, 0.55), { rough: 0.4, metal: 0.2 });
    g.add(K.sph(0.07, m, 0, 0.02, 0, { s: [2.3, 0.32, 0.75] })); g.add(K.sph(0.066, back, 0, 0.026, -0.018, { s: [2.1, 0.3, 0.42] }));
    const tail = new T.Mesh(new T.ConeGeometry(0.05, 0.08, 3), m); tail.rotation.z = PI / 2; tail.scale.set(1, 1, 0.25); tail.position.set(0.19, 0.02, 0); g.add(tail);
    g.add(K.sph(0.008, K.m('#111111'), -0.13, 0.034, 0.01, { ws: 6, hs: 5 }));
    return g;
  };
  /* 花をさしたバケツの段 */
  H.flowerStand = function (n, seed, white) {
    const g = new T.Group(), r = U.rng(seed || 9), bucket = K.m('#9aa2a6', { metal: 0.4, rough: 0.4 });
    for (let i = 0; i < n; i++) {
      const tier = i % 2, x = (Math.floor(i / 2) - (n / 2 - 1) / 2) * 0.42, y = tier * 0.32, z = -tier * 0.34;
      if (tier) g.add(K.box(0.44, y, 0.36, K.m(P.woodLight), x, 0, z));
      g.add(K.cyl(0.14, 0.32, bucket, x, y, z, { rTop: 0.16, seg: 14 }));
      const col = (white && i === 1) ? '#f6f6f2' : U.pick(r, ['#e85a7a', '#f6d13c', '#f08a3a', '#c83a4a', '#f6f6f2', '#b46ad0', '#f2a0b8']);
      const fm = K.m(col, { rough: 0.7 });
      for (let k = 0; k < 7; k++) { const a = r() * 6.28, rr = r() * 0.1, top = [x + Math.cos(a) * rr, y + 0.62 + r() * 0.16, z + Math.sin(a) * rr]; g.add(K.rod([x, y + 0.3, z], top, 0.005, K.m(P.leafDark), { noCast: true })); g.add(K.sph(0.035 + r() * 0.015, fm, top[0], top[1], top[2], { ws: 8, hs: 6 })); }
    }
    return g;
  };
  /* 焼き肉の卓（ロースターと排気の筒） */
  H.grillTable = function (H0) {
    const g = new T.Group(); g.add(K.table(0.9, 0.75, 0.7, K.m('#3a2a22', { rough: 0.6 })));
    g.add(K.cyl(0.2, 0.03, K.m('#1a1a1a', { metal: 0.4 }), 0, 0.7, 0, { seg: 20 }));
    g.add(K.cyl(0.17, 0.012, K.m('#3a1408', { emissive: '#c8401a', ei: 0.45 }), 0, 0.715, 0, { seg: 20, noShadow: true }));
    for (let i = -6; i <= 6; i++) g.add(K.box(0.34 - Math.abs(i) * 0.012, 0.005, 0.006, K.m('#2a2a2a', { metal: 0.7, rough: 0.4 }), 0, 0.735, i * 0.026));
    for (let i = 0; i < 4; i++) { const m = K.box(0.08, 0.008, 0.05, K.m(U.pick(U.rng(i + 3), ['#a84a3a', '#8a3a2e', '#b8624a']), { rough: 0.6 }), -0.08 + (i % 2) * 0.13, 0.742, -0.05 + Math.floor(i / 2) * 0.1); m.rotation.y = i * 0.7; g.add(m); }
    for (const sx of [-1, 1]) { g.add(K.plate('#f2f0ea', 0.07).translateX(sx * 0.32).translateY(0.705).translateZ(0.22)); g.add(K.cyl(0.04, 0.12, K.m('#e8b830', { rough: 0.2, transparent: true, opacity: 0.85 }), sx * 0.34, 0.7, -0.24, { seg: 12 })); }
    g.add(K.plane(0.26, 0.16, H.texMat(H.goodsTex('meat', 9)), 0.0, 0.705, 0.28));
    const hood = K.cyl(0.24, 0.16, K.m(P.steel, { metal: 0.6, rough: 0.3 }), 0, 1.25, 0, { rTop: 0.08, seg: 18 }); g.add(hood);
    g.add(K.cyl(0.07, (H0 || 2.5) - 1.41, K.m(P.steel, { metal: 0.6, rough: 0.3 }), 0, 1.41, 0, { seg: 12 }));
    return g;
  };
  /* 小上がり・座敷の台（畳） */
  H.platform = function (w, d, h) {
    const g = new T.Group(), tex = K.tex.rep(K.tex.tatami(), Math.max(1, Math.round(w / 0.9)), Math.max(1, Math.round(d / 1.8)));
    g.add(K.box(w, h, d, K.m(P.woodDark), 0, 0, 0)); g.add(K.plane(w - 0.04, d - 0.04, K.mTex(tex), 0, h + 0.002, 0));
    g.add(K.box(w, 0.06, 0.08, K.m(P.woodDark, { rough: 0.5 }), 0, h - 0.06, d / 2 - 0.04)); return g;
  };
  H.lowTable = function (w, d, c) { return K.table(w, d, 0.34, K.m(c || '#5c3a26', { rough: 0.45 })); };
  /* 背の高い長いす（喫茶店のボックス席）。座面は +Z 向き */
  H.booth = function (len, c) {
    const g = new T.Group(), m = K.m(c, { rough: 0.85 }), wood = K.m(P.woodDark);
    g.add(K.box(len, 0.42, 0.5, wood, 0, 0, 0)); g.add(K.box(len, 0.12, 0.48, m, 0, 0.36, 0.01)); g.add(K.box(len, 0.56, 0.12, m, 0, 0.46, -0.2)); g.add(K.box(len, 0.05, 0.16, wood, 0, 1.02, -0.2)); return g;   // 背もたれは座った目の高さより下に
  };
  H.barberChair = function (c) {
    const g = new T.Group(), m = K.m(c || '#7a2a2a', { rough: 0.5 }), st = K.m(P.steel, { metal: 0.7, rough: 0.3 });
    g.add(K.cyl(0.26, 0.04, st, 0, 0, 0, { seg: 20 })); g.add(K.cyl(0.07, 0.36, st, 0, 0.04, 0));
    g.add(K.box(0.54, 0.12, 0.52, m, 0, 0.4, 0)); g.add(K.box(0.54, 0.62, 0.12, m, 0, 0.52, -0.25)); g.add(K.box(0.24, 0.16, 0.1, m, 0, 1.16, -0.27));
    for (const sx of [-1, 1]) g.add(K.box(0.07, 0.06, 0.48, m, sx * 0.3, 0.64, 0)); g.add(K.box(0.4, 0.04, 0.24, st, 0, 0.16, 0.42)); return g;
  };
  /* 鏡: 部屋を映しているように見せる、上が明るく下が沈むぼかしと、斜めの映りこみの筋 */
  const mirrorTex = () => canvasTex('mirror', 128, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d6e0e2'); gr.addColorStop(0.45, '#a9b8bc'); gr.addColorStop(0.75, '#7d8b90'); gr.addColorStop(1, '#5f6b70');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,64,58,0.35)'; c.fillRect(0, h * 0.62, w, h * 0.38);                        // 映りこんだ奥の壁ぎわと床
    c.save(); c.translate(w * 0.5, h * 0.5); c.rotate(-0.5);
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(-w * 0.9, -h * 0.18, w * 1.8, h * 0.07);
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(-w * 0.9, -h * 0.05, w * 1.8, h * 0.03);
    c.restore();
  });
  H.mirror = function (w, h) { const g = new T.Group(); g.add(K.box(w + 0.06, h + 0.06, 0.03, K.m(P.woodDark), 0, -0.03, -0.015)); const t = mirrorTex(); g.add(K.box(w, h, 0.01, K.m('#ffffff', { map: t, metal: 0.1, rough: 0.08, emissive: '#ffffff', ei: 0.18, nocache: true }), 0, 0, 0.005, { noShadow: true })); g.children[1].material.emissiveMap = t; return g; };
  H.barberPole = function () {
    const g = new T.Group(), tex = H.stripeTex('#c8392b', '#f4f2ee', 6, true), t2 = tex.clone(); t2.userData.shared = false; t2.wrapS = t2.wrapT = T.RepeatWrapping; t2.repeat.set(1, 2); t2.needsUpdate = true;
    const m = K.m('#ffffff', { map: t2, emissive: '#ffffff', ei: 0.35, nocache: true }); m.emissiveMap = t2;
    g.add(K.cyl(0.1, 0.7, m, 0, 0, 0, { seg: 20 })); g.add(K.cyl(0.12, 0.06, K.m(P.steel, { metal: 0.6 }), 0, -0.06, 0)); g.add(K.sph(0.11, K.m(P.steel, { metal: 0.6 }), 0, 0.72, 0, { s: [1, 0.5, 1] }));
    g.userData.spin = (t) => { t2.offset.y = -(t * 0.3) % 1; }; return g;
  };
  H.oven = function (w) {
    const g = new T.Group(), st = K.m(P.steel, { metal: 0.55, rough: 0.35 }); w = w || 1.4;
    g.add(K.box(w, 1.9, 0.9, st, 0, 0, 0));
    for (let i = 0; i < 3; i++) { g.add(K.box(w - 0.2, 0.36, 0.02, K.m('#1a1210', { emissive: '#c8641e', ei: 0.28 }), 0, 0.25 + i * 0.52, 0.451, { noShadow: true })); g.add(K.box(w - 0.3, 0.26, 0.01, K.m('#2a1e18', { rough: 0.3 }), 0, 0.3 + i * 0.52, 0.462, { noShadow: true })); g.add(K.box(w - 0.1, 0.03, 0.04, K.m(P.steelDark), 0, 0.66 + i * 0.52, 0.47)); }
    return g;
  };
  H.range = function (w) {
    const g = new T.Group(), st = K.m(P.steel, { metal: 0.55, rough: 0.35 }); w = w || 1.2;
    g.add(K.box(w, 0.82, 0.7, st, 0, 0, 0)); g.add(K.box(w, 0.03, 0.7, K.m('#1e1e20', { rough: 0.5 }), 0, 0.82, 0));
    for (let i = 0; i < Math.round(w / 0.4); i++) g.add(K.cyl(0.1, 0.02, K.m('#3a3a3a'), -w / 2 + 0.2 + i * 0.4, 0.85, 0.05, { seg: 14 }));
    return g;
  };
  H.pot = function (r, h) { return K.cyl(r || 0.18, h || 0.32, K.m(P.steel, { metal: 0.6, rough: 0.3 }), 0, 0, 0, { seg: 20 }); };
  /* 湯気（鍋・蒸し器・煙） */
  H.steam = function (o) {
    /* ふちのぼけた板（スプライト）を、ゆらぎながら上らせて消す */
    o = o || {}; const g = new T.Group(), mats = [], N = o.n || 12, sp = o.spread || 0.05, hgt = o.h || 0.5, col = o.color || 0xffffff, size = o.size || 0.16;
    g.userData.noAO = true;                                   // 影を足す処理から外す（外さないと黒い四角になる）
    for (let k = 0; k < N; k++) { const mt = new T.SpriteMaterial({ map: K.tex.glow(), color: col, transparent: true, opacity: 0, depthWrite: false }); mats.push(mt); const s = new T.Sprite(mt); s.scale.setScalar(size); s.raycast = () => { }; g.add(s); }      // 当たり判定から外す（置き場所さがしの光線が止まらないように）
    const ph = Math.random() * 6;
    g.userData.tick = (t) => {
      g.children.forEach((s, k) => {
        const u = ((t * (o.speed || 0.22) + k / N + ph) % 1);
        s.position.set(Math.sin(t * 1.1 + k * 2.3) * sp * (1 + u * 2), u * hgt, Math.cos(t * 0.9 + k) * sp * (1 + u * 1.5));
        s.scale.setScalar(size * (0.5 + u * (o.grow || 1.6))); mats[k].opacity = (o.alpha || 0.22) * Math.sin(PI * u);
      });
    };
    return g;
  };
  H.crate = function (c) {
    const g = new T.Group(); g.add(K.box(0.46, 0.3, 0.34, K.m(c || '#d9b445', { rough: 0.6 }), 0, 0, 0));
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) g.add(K.cyl(0.025, 0.06, K.m('#5a3a1e', { rough: 0.3 }), -0.16 + i * 0.105, 0.3, -0.11 + k * 0.11, { seg: 8 }));
    return g;
  };
  H.rodsRack = function (n, seed) {
    const g = new T.Group(), r = U.rng(seed || 3); g.add(K.box(1.2, 0.12, 0.3, K.m(P.woodDark), 0, 0, 0)); g.add(K.box(1.2, 0.05, 0.08, K.m(P.woodDark), 0, 1.6, -0.12));
    for (let i = 0; i < n; i++) { const x = -0.55 + i * 1.1 / (n - 1), c = U.pick(r, ['#2a2a2a', '#3a5a8a', '#8a2a2a', '#c8b060']); g.add(K.rod([x, 0.12, 0], [x + (r() - 0.5) * 0.06, 2.1 + r() * 0.3, -0.13], 0.008, K.m(c, { rough: 0.3 }))); }
    return g;
  };
  /* 振り子の柱時計 */
  H.pendulumClock = function (hour) {
    const g = new T.Group(); g.add(K.box(0.32, 0.8, 0.14, K.m('#5c3a26', { rough: 0.45 }), 0, 0, 0));
    const face = K.wallClock(hour); face.scale.setScalar(0.85); K.at(face, 0, 0.6, 0.075); g.add(face);
    const pend = new T.Group(); pend.position.set(0, 0.42, 0.075); pend.add(K.rod([0, 0, 0], [0, -0.3, 0], 0.004, K.m('#b99a52', { metal: 0.6 }))); pend.add(K.cyl(0.04, 0.01, K.m('#b99a52', { metal: 0.7, rough: 0.3 }), 0, -0.32, 0)); pend.children[1].rotation.x = PI / 2; g.add(pend);
    g.userData.swing = (t) => { pend.rotation.z = Math.sin(t * PI) * 0.18; }; g.userData.face = face; return g;
  };
  H.cardboard = function (w, h, d) { return K.box(w || 0.5, h || 0.35, d || 0.4, K.m('#b98d5a', { rough: 0.9 }), 0, 0, 0); };
  H.priceCard = function (text) {
    const g = new T.Group(); g.add(K.rod([0, 0, 0], [0, 0.18, 0], 0.003, K.m(P.dark)));
    g.add(H.vplane(0.12, 0.08, H.texMat(H.textTex([text], { w: 192, h: 128, bg: '#fbf8ee', fg: '#c8291c', font: 'gothic', weight: 800, pad: 0.1 }), { double: true }), 0, 0.22, 0)); return g;
  };
  /* 下ろせるシャッター。setDown(0〜1) */
  H.shutter = function (w, h) {
    const g = new T.Group(); g.add(K.box(w + 0.1, 0.32, 0.3, K.m('#a9adb0', { metal: 0.3, rough: 0.5 }), 0, h, 0));
    const tex = H.stripeTex('#9aa0a4', '#b9bec2', 24), t2 = tex.clone(); t2.userData.shared = false; t2.rotation = PI / 2; t2.center.set(0.5, 0.5); t2.needsUpdate = true;
    const sl = new T.Mesh(new T.PlaneGeometry(w, 1), K.m('#b9bec2', { metal: 0.3, rough: 0.5, map: t2, nocache: true, double: true })); sl.material.side = T.DoubleSide; g.add(sl);
    g.userData.setDown = (f) => { const hh = Math.max(0.001, f * h); sl.scale.y = hh; sl.position.set(0, h - hh / 2, 0.1); sl.visible = f > 0.01; };
    g.userData.setDown(0); return g;
  };
  H.slippers = function (n, c) {
    const g = new T.Group();
    g.userData.setCount = (k) => { while (g.children.length) { const o = g.children.pop(); K.dispose(o); } for (let i = 0; i < k; i++) { const s = K.slippers(c || '#7a8a9a'); K.at(s, i * 0.26, 0, 0); g.add(s); } };
    g.userData.setCount(n); return g;
  };
  H.apronHook = function (c) { const g = new T.Group(); g.add(K.box(0.06, 0.03, 0.06, K.m(P.steel, { metal: 0.6 }), 0, 0, 0.02)); g.add(K.box(0.34, 0.62, 0.02, K.m(c || '#1e1e22', { rough: 0.9 }), 0, -0.64, 0.04)); g.add(K.rod([-0.12, 0, 0.04], [0.12, 0, 0.04], 0.004, K.m(c || '#1e1e22'))); return g; };
  H.keyTag = function () { const g = new T.Group(); g.add(K.box(0.05, 0.012, 0.12, K.m(P.woodLight), 0, 0, 0)); g.add(new T.Mesh(new T.TorusGeometry(0.02, 0.003, 6, 14), K.m(P.steel, { metal: 0.7 }))); g.children[1].position.set(0, 0.01, -0.07); g.children[1].rotation.x = PI / 2; return g; };
  H.coinTray = function () { return K.cyl(0.09, 0.012, K.m('#2a5a8a', { rough: 0.4 }), 0, 0, 0, { seg: 20 }); };
  H.eyeChart = function () { const g = new T.Group(); g.add(K.box(0.5, 1.0, 0.04, K.m('#e6e8ea'), 0, 0, 0)); const f = H.vplane(0.44, 0.92, H.texMat(H.goodsTex('chart', 1), { emissive: '#ffffff', ei: 0.5, nocache: true }), 0, 0.5, 0.021); f.material.emissiveMap = f.material.map; g.add(f); return g; };
  /* 外への階段（地下の店）。+Z へ上がる */
  H.stairsUp = function (w, steps, rise, run) {
    const g = new T.Group(), m = K.m('#8d8a82', { rough: 0.8 });
    for (let i = 0; i < steps; i++) g.add(K.box(w, rise * (i + 1), run, m, 0, 0, i * run + run / 2));
    return g;
  };

  /* ================= 5. 表の通り ================= */
  /* kind: town（ふつうの商店街）, harbor（港）, road（国道ぞい・峠）, rural（田畑と山）, snow（雪国の通り） */
  H.outside = function (g, c, zS, rng, lamps, kind) {
    const sp = K.seasonal(c), wet = c.weather === 'rain' || c.weather === 'storm';
    g.add(K.box(80, 0.12, 2.2, K.m(sp.snowy || kind === 'snow' ? P.snow : P.concrete), 0, -0.14, zS + 1.3));
    if (kind === 'harbor') {
      g.add(K.box(80, 0.1, 6, K.m(P.concreteDark), 0, -0.15, zS + 5.4));
      const sea = K.water ? K.water(90, 40, P.sea) : K.plane(90, 40, K.m(P.sea, { rough: 0.2 }), 0, -0.9, 0); K.at(sea, 0, -0.9, zS + 28.4); g.add(sea);
      for (let i = 0; i < 4; i++) { const b = K.group(-8 + i * 5.5, -0.6, zS + 9.5 + (i % 2), 0.2 * i); b.add(K.box(3.2, 0.5, 1.2, K.m(i % 2 ? P.white : '#d9dde0'), 0, 0, 0)); b.add(K.box(1.0, 0.7, 0.9, K.m('#c6c8c9'), 0.6, 0.5, 0)); g.add(b); }
      g.add(K.ridge({ r: 200, hMin: 8, hMax: 22, color: sp.hillFar, seed: c.seed + 3, n: 30 }));
      return;
    }
    const rd = K.road(kind === 'road' ? 9 : 7, 80, { wet }); rd.rotation.y = PI / 2; K.at(rd, 0, -0.05, zS + 6); g.add(rd);
    if (kind === 'road' || kind === 'rural') {
      const gr = K.ground(160, sp.snowy ? P.snow : sp.grass, -0.12, 30); K.at(gr, 0, -0.12, zS + 90); g.add(gr);
      g.add(K.ridge({ r: 160, hMin: 18, hMax: 46, color: sp.hillFar, seed: c.seed + 5, n: 34 }));
      const pole = K.pole(8); K.at(pole, 3.4, -0.05, zS + 2.2); g.add(pole);
      if (kind === 'road') { for (let i = 0; i < 2; i++) { const car = K.car(U.pick(rng, ['#e2e4e6', '#3a4a5a', '#a8453a']), i ? 'truck' : null); K.at(car, -6 + i * 9, 0, zS + 4.5, PI / 2); g.add(car); } }
      return;
    }
    const cols = ['#b9b6ad', '#a9adb2', '#c4bcae', '#bdb3a6'];
    for (let i = 0; i < 6; i++) { const b = K.building(7 + rng() * 4, 7 + rng() * 9, 8, U.pick(rng, cols), c.seed + i); K.at(b, -26 + i * 10.5, -0.05, zS + 14.5); g.add(b); lamps.push(b); }
    const pole = K.pole(8); K.at(pole, 3.4, -0.05, zS + 2.2); g.add(pole);
    if (rng() < 0.6) { const vm = K.vending(); K.at(vm, -3.3, -0.05, zS + 10.2, PI); g.add(vm); lamps.push(vm); }
    if (rng() < 0.5) { const bc = K.bicycle(); K.at(bc, 2.2, -0.08, zS + 1.0, 0.3); g.add(bc); }
  };
})(window.SI);
