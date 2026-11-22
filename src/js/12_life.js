'use strict';
/* 最期の一日 — その人をつくる（名前、年齢、仕事、家族、記憶） */
(function (SI) {
  const U = SI.U;
  const NOW = 2026;

  const NAMES = {
    f: [[1935, ['キヨ', 'ハル', 'ミツ', 'フミ', 'トミ', '静江', '千代', '文子', 'ヨシ', '春江']],
        [1950, ['和子', '幸子', '節子', '洋子', '恵子', '京子', '悦子', '弘子', '美代子', '久子']],
        [1965, ['由美子', '明美', '久美子', '真由美', '直美', '智子', '裕子', '順子', '典子', '恵美']],
        [1980, ['陽子', '美穂', '智美', '恵', '香織', '美香', '理恵', '純子', '亜紀', 'めぐみ']],
        [1995, ['愛', '彩', '美咲', '麻衣', '沙織', '絵美', '舞', '千尋', '友美', '遥']],
        [2100, ['陽菜', '葵', '結衣', '美羽', 'さくら', '凛', '楓', '七海', '未来', '心春']]],
    m: [[1935, ['正', '清', '茂', '三郎', '勇', '実', '弘', '義雄', '武', '昭']],
        [1950, ['勝', '進', '博', '稔', '勲', '隆', '修', '豊', '和夫', '洋一']],
        [1965, ['誠', '浩', '健一', '和彦', '浩二', '秀樹', '哲也', '学', '正人', '康弘']],
        [1980, ['大輔', '直樹', '剛', '智也', '亮', '浩之', '英樹', '徹', '健太郎', '洋平']],
        [1995, ['翔太', '拓也', '健太', '大樹', '翼', '亮太', '雄太', '達也', '和也', '直人']],
        [2100, ['蓮', '大翔', '颯太', '悠真', '陽向', '湊', '樹', '陸', '翔', '悠斗']]]
  };
  const JOBS = {
    office: ['会社員', '事務員', '営業の仕事', '技術者', '銀行員'],
    construction: ['大工', 'とび職', '左官', '土木の仕事', '電気工事士'],
    factory: ['工場の工員', '旋盤工', '食品工場の従業員', '検査の仕事'],
    farm: ['米農家', '野菜農家', '果樹農家', '酪農家'],
    fishery: ['漁師', '養殖の仕事', '魚市場の仲買人'],
    forestry: ['林業の仕事'],
    driver: ['トラックの運転手', 'バスの運転手', 'タクシーの運転手'],
    medical: ['看護師', '介護職員', '薬剤師', '医師', '検査技師'],
    teacher: ['小学校の教員', '中学校の教員', '高校の教員', '保育士'],
    craft: ['料理人', '理容師', '美容師', '仕立て職人', '木工職人', '陶芸家'],
    shop: ['八百屋', '食堂の主人', '喫茶店の店主', '書店の店主', '商店主'],
    public: ['市役所の職員', '消防士', '警察官', '郵便局員', '鉄道員'],
    art: ['ピアノ教師', '画家', '文筆家', '写真家'],
    home: ['主婦']
  };
  const RETIRE = { office: 65, public: 62, factory: 65, teacher: 62, medical: 68, driver: 68, construction: 70, forestry: 72, farm: 82, fishery: 78, craft: 78, shop: 78, art: 90, home: 200 };
  const STAGE_MIN = { child: 10, teen: 16, young: 24, love: 24, work: 22, kids: 28, mid: 52, loss: 10, late: 72, joy: 10 };
  const STAGE_LABEL = { child: '幼いころ', teen: '十代のころ', young: '若いころ', love: 'あの人のこと', work: '仕事のこと', kids: '子どものこと', mid: '人生のなかば', loss: '別れ', late: '老いてから', joy: 'このごろ' };
  const SEASON_JA = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
  const WEATHER_JA = { clear: '晴れ', cloudy: 'くもり', rain: '雨', snow: '雪', fog: '霧', storm: '嵐' };
  const MONTHS = { spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], winter: [12, 1, 2] };

  const L = SI.Life = { STAGE_LABEL, SEASON_JA, WEATHER_JA };

  function nameFor(sex, born, r) {
    for (const [until, list] of NAMES[sex]) if (born <= until) return U.pick(r, list);
    return NAMES[sex][NAMES[sex].length - 1][1][0];
  }

  function pickJob(cause, sex, age, born, r) {
    if (age <= 12) return { cat: 'student', label: '小学生', status: 'student' };
    if (age <= 15) return { cat: 'student', label: '中学生', status: 'student' };
    if (age <= 18) return { cat: 'student', label: '高校生', status: 'student' };
    const forced = cause.job && cause.job !== 'student' ? cause.job : null;
    if (cause.job === 'student' || (!forced && age <= 22 && r() < 0.6)) return { cat: 'student', label: age <= 22 ? '大学生' : '大学院生', status: 'student' };
    let cat = forced;
    if (!cat) {
      const oldF = sex === 'f' && born < 1966;
      cat = U.weighted(r, [['office', 22], ['home', sex === 'f' ? (oldF ? 22 : 7) : 0.6], ['factory', 8], ['construction', sex === 'm' ? 9 : 1.5], ['farm', 7], ['shop', 8],
        ['medical', sex === 'f' ? 11 : 5], ['teacher', 6], ['public', 6], ['driver', sex === 'm' ? 8 : 1.5], ['craft', 6], ['fishery', sex === 'm' ? 4 : 0.8], ['forestry', sex === 'm' ? 2.5 : 0.3], ['art', 3]]);
    }
    let label = U.pick(r, JOBS[cat]);
    if (cat === 'home') label = sex === 'm' ? '主夫' : '主婦';
    const retired = !forced && age >= RETIRE[cat] + Math.floor(r() * 5);
    return { cat, label, status: cat === 'home' ? 'home' : (retired ? 'retired' : 'working') };
  }

  function family(sex, age, r) {
    const f = { partner: 'never', kids: 0, grandkids: 0 };
    if (age < 25) return f;
    const ever = age < 35 ? 0.45 : (age < 50 ? 0.72 : 0.86);
    if (r() < ever) {
      f.partner = 'with';
      let pw = age < 60 ? 0.03 : (age < 70 ? 0.1 : (age < 80 ? (sex === 'f' ? 0.36 : 0.13) : (age < 90 ? (sex === 'f' ? 0.66 : 0.32) : (sex === 'f' ? 0.88 : 0.55))));
      const x = r();
      if (x < pw) f.partner = 'widowed'; else if (x < pw + 0.1) f.partner = 'divorced';
      const none = age < 30 ? 0.6 : 0.16;
      const y = r();
      f.kids = y < none ? 0 : (y < none + 0.28 ? 1 : (y < none + 0.66 ? 2 : 3));
      if (f.kids > 0 && age >= 58 && r() < (age >= 70 ? 0.86 : 0.6)) f.grandkids = 1 + Math.floor(r() * 4);
    }
    return f;
  }

  /* いちばん身近な人。{大切な人} と {呼び名} のもと */
  function closePerson(life, r) {
    const { sex, age, name, fam } = life;
    const parentCall = sex === 'f' ? 'お母さん' : 'お父さん';
    const mk = (rel, call, csex, cage) => ({ rel, call, sex: csex, age: U.clamp(Math.round(cage), 6, 100) });
    if (age < 25) {
      const x = r();
      if (age >= 19 && x < 0.2) return mk('友人', name, sex, age);
      if (x < 0.62) return mk('母', name, 'f', age + 29);
      if (x < 0.92) return mk('父', name, 'm', age + 31);
      return mk('祖母', name, 'f', age + 58);
    }
    const opts = [];
    if (fam.partner === 'with') opts.push([sex === 'f' ? mk('夫', fam.kids && r() < 0.45 ? 'お母さん' : name, 'm', age + 2) : mk('妻', fam.kids && r() < 0.5 ? 'お父さん' : 'あなた', 'f', age - 2), 6]);
    if (fam.kids > 0 && age >= 46) { const d = r() < 0.5; opts.push([mk(d ? '娘' : '息子', parentCall, d ? 'f' : 'm', age - 29), fam.partner === 'with' ? 2.5 : 6]); }
    if (fam.grandkids > 0 && age >= 74) opts.push([mk('孫', sex === 'f' ? 'おばあちゃん' : 'おじいちゃん', r() < 0.5 ? 'f' : 'm', age - 56), 1.4]);
    if (!opts.length || fam.partner !== 'with') {
      if (age < 46) { const m = r() < 0.6; opts.push([m ? mk('母', name, 'f', age + 28) : mk('父', name, 'm', age + 30), 3]); }
      if (age < 82) opts.push([mk('友人', age < 35 ? name : name + 'さん', sex, age), age < 60 ? 2 : 1.2]);
      if (age >= 60) { const s = r() < 0.6; opts.push([mk(s ? '妹' : '弟', sex === 'f' ? '姉さん' : '兄さん', s ? 'f' : 'm', age - 5), 1.2]); }
      if (age >= 76) { const n = r() < 0.6; opts.push([mk(n ? '姪' : '甥', sex === 'f' ? 'おばさん' : 'おじさん', n ? 'f' : 'm', age - 30), 1.2]); }
    }
    return U.weighted(r, opts);
  }

  L.make = function (cause, r) {
    const sex = cause.sex === 'f' || cause.sex === 'm' ? cause.sex : (r() < 0.5 ? 'f' : 'm');
    const age = U.irange(r, cause.age[0], cause.age[1]);
    const born = NOW - age;
    const life = { sex, age, born, name: nameFor(sex, born, r) };
    life.job = pickJob(cause, sex, age, born, r);
    life.fam = family(sex, age, r);
    life.close = closePerson(life, r);
    life.season = cause.season === 'any' ? U.pick(r, ['spring', 'summer', 'autumn', 'winter']) : cause.season;
    if (cause.weather === 'any') life.weather = r() < 0.66 ? 'clear' : 'cloudy';
    else life.weather = cause.weather;
    if (life.weather === 'snow' && life.season === 'summer') life.season = 'winter';
    const mo = U.pick(r, MONTHS[life.season]);
    life.date = { m: mo, d: U.irange(r, 1, mo === 2 ? 28 : 30) };
    life.dateJa = U.kanji(mo) + '月' + U.kanji(life.date.d) + '日';
    life.ageJa = U.kanji(age) + '歳';
    life.jobJa = life.job.status === 'retired' ? '元・' + life.job.label : life.job.label;
    return life;
  };

  /* 年齢・性別・生まれ年・家族・仕事の条件。記憶にも、最後の一言にも同じものを当てる */
  function fits(m, life, min) {
    if (min != null && life.age < min) return false;
    if (m.max != null && life.age > m.max) return false;
    if (m.sex && m.sex !== life.sex) return false;
    if (m.born && (life.born < m.born[0] || life.born > m.born[1])) return false;
    if (m.job && m.job !== life.job.cat) return false;
    const f = life.fam;
    if (m.need) for (const n of m.need) {
      if (n === 'partner' && f.partner === 'never') return false;
      if (n === 'widowed' && f.partner !== 'widowed') return false;
      if (n === 'kids' && f.kids < 1) return false;
      if (n === 'grandkids' && f.grandkids < 1) return false;
    }
    return true;
  }
  function eligible(m, life) {
    const st = m.stage;
    if (!fits(m, life, m.min != null ? m.min : STAGE_MIN[st])) return false;
    const f = life.fam;
    if (st === 'love' && f.partner === 'never') return false;
    if (st === 'kids' && f.kids < 1) return false;
    if (st === 'work') {
      if (life.job.status === 'student') return false;
      if (m.job && m.job !== life.job.cat) return false;
      if (!m.job && life.job.cat === 'home') return false;
    }
    return true;
  }

  function plan(age) {
    if (age < 16) return [['child'], ['child'], ['loss', 'child'], ['joy']];
    if (age < 24) return [['child'], ['child'], ['teen'], ['teen'], ['loss', 'teen'], ['joy']];
    if (age < 40) return [['child'], ['teen'], ['young'], ['work', 'young'], ['love', 'kids', 'young'], ['joy']];
    if (age < 60) return [['child'], ['teen'], ['young', 'love'], ['work'], ['kids', 'loss', 'mid'], ['joy']];
    if (age < 72) return [['child'], ['teen'], ['love', 'young'], ['work'], ['kids', 'mid', 'loss'], ['joy', 'loss']];
    return [['child'], ['teen', 'young'], ['love', 'work'], ['kids', 'mid', 'work'], ['loss', 'late'], ['late', 'joy']];
  }
  const ORDER = ['child', 'teen', 'young', 'love', 'work', 'kids', 'mid', 'loss', 'late', 'joy'];

  /* 思い出す記憶を、人生の順にえらぶ */
  L.pickMemories = function (life, memories, r, recent) {
    const used = new Set(), out = [], avoid = new Set(recent || []);
    const pool = memories.filter(m => eligible(m, life));
    const byStage = {};
    for (const m of pool) (byStage[m.stage] = byStage[m.stage] || []).push(m);
    const take = (st) => {
      let c = (byStage[st] || []).filter(m => !used.has(m.id));
      if (!c.length) return null;
      if (st === 'work') { const mine = c.filter(m => m.job); if (mine.length && r() < 0.75) c = mine; }
      const fresh = c.filter(m => !avoid.has(m.id));
      const m = U.pick(r, fresh.length ? fresh : c);
      used.add(m.id); return m;
    };
    for (const slot of plan(life.age)) {
      const cands = slot.length > 1 && r() < 0.5 ? U.shuffle(r, slot) : slot;
      let m = null;
      for (const st of cands) { m = take(st); if (m) break; }
      if (!m) for (const st of ['joy', 'child', 'teen', 'young', 'loss']) { m = take(st); if (m) break; }
      if (m) out.push(m);
    }
    out.sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
    return out.map(m => ({ id: m.id, stage: m.stage, label: STAGE_LABEL[m.stage], text: L.resolve(m.text, life) }));
  };

  L.pickLast = function (life, lasts, r) {
    const c = lasts.filter(m => fits(m, life, m.min));
    return c.length ? L.resolve(U.pick(r, c).text, life) : '';
  };

  L.resolve = function (text, life) {
    return text.replace(/\{大切な人\}/g, life.close.rel).replace(/\{呼び名\}/g, life.close.call);
  };

  /* そばにいる人の見た目 */
  L.companionLook = function (life, r) {
    const c = life.close;
    const tops = ['#4f5d75', '#6f7f8c', '#5f7a6a', '#7a4f45', '#3f4a5c', '#7d7a52', '#5c4a3c'];     // 肌の色に近い服は、明るい部屋で裸に見えるので使わない
    const bottoms = ['#3d4352', '#4a4640', '#5a5a62', '#3f4a44'];
    const look = {
      top: U.pick(r, tops), bottom: U.pick(r, bottoms), hair: c.age >= 64 ? (c.age >= 76 ? '#c9c7c2' : '#9a9690') : (r() < 0.5 ? '#2e2a28' : '#3d332c'),
      long: c.sex === 'f' && c.age < 60 && r() < 0.6, old: c.age >= 80, child: c.age < 13, h: c.sex === 'f' ? 1.54 : 1.68, skin: c.age >= 70 ? '#cfb39a' : '#d8b89a'
    };
    /* 髪型（モデルがあるときだけ効く） */
    const k = r();
    if (c.sex === 'f') look.hairStyle = look.long ? 'hair_long' : (c.age >= 45 && k < 0.6 ? 'hair_bun' : (c.age < 13 && k < 0.5 ? 'hair_long' : 'hair_short'));
    else look.hairStyle = (c.age >= 62 && k < 0.5) ? 'hair_thin' : 'hair_short';
    return look;
  };
})(window.SI);
