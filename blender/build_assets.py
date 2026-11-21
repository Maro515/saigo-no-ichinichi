"""最期の一日 — Blender で人物と木のモデルを作り、assets/kit.glb に書き出す。

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P blender/build_assets.py
  （確認用の画像も出すとき）  … -P blender/build_assets.py -- --preview 出力フォルダ

人物: 骨つきの 1 体（肌・上着・下衣・靴の 4 素材）と、髪型 4 種。向きは −Y が正面（書き出すと +Z が正面）。
木: 6 種 × 2 本。高さ 1 にそろえてある。幹（bark）・葉（leaf）・冬の小枝（twig）に分かれる。
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'kit.glb')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = argv[argv.index('--preview') + 1] if '--preview' in argv else None

scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)


def link(name, data):
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    return ob


def mat(name, color):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = getattr(m, 'node_tree', None)
    if nt:
        for n in nt.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Base Color'].default_value = (*color, 1.0)
                n.inputs['Roughness'].default_value = 0.9
    return m


def skin(name, verts, edges, radii, root=0, sub=1, smooth=True, max_tris=None):
    """点と線の骨組みに肉をつけて、なめらかなメッシュにする"""
    me = bpy.data.meshes.new(name + '_stick')
    me.from_pydata([tuple(v) for v in verts], edges, [])
    me.update()
    ob = link(name + '_stick', me)
    md = ob.modifiers.new('Skin', 'SKIN')
    md.use_smooth_shade = smooth
    sv = me.skin_vertices[0].data
    for i, r in enumerate(radii):
        sv[i].radius = (r, r) if not isinstance(r, tuple) else r
        sv[i].use_root = (i == root)
    if sub:
        s = ob.modifiers.new('Sub', 'SUBSURF')
        s.levels = sub
        s.render_levels = sub
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    if max_tris:
        n = sum(len(p.vertices) - 2 for p in me2.polygons)
        if n > max_tris:
            bpy.data.meshes.remove(me2)
            d = ob.modifiers.new('Dec', 'DECIMATE')
            d.ratio = max_tris / n
            dg = bpy.context.evaluated_depsgraph_get()
            me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    out = link(name, me2)
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    return out


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-9, ab.dot(ab))))
    return (p - (a + ab * t)).length, t


# ============================ 人物 ============================
def build_human():
    V, E, R = [], [], []

    def v(p, r):
        V.append(Vector(p))
        R.append(r)
        return len(V) - 1

    def e(a, b):
        E.append((a, b))

    pelvis = v((0, 0, 0.94), 0.124)
    waist = v((0, 0, 1.06), 0.103)
    chest = v((0, 0, 1.22), 0.124)
    upch = v((0, 0, 1.33), 0.104)
    neck = v((0, 0, 1.425), 0.047)
    ntop = v((0, -0.003, 1.508), 0.043)          # 頭は別に作る。首はその中へ入る
    for a, b in ((pelvis, waist), (waist, chest), (chest, upch), (upch, neck), (neck, ntop)):
        e(a, b)
    for sx in (1, -1):
        clav = v((sx * 0.106, 0, 1.345), 0.061)
        sh = v((sx * 0.172, 0, 1.325), 0.051)
        el = v((sx * 0.215, 0.006, 1.06), 0.036)
        wr = v((sx * 0.242, -0.004, 0.815), 0.0255)         # 手首まで。手は別に作る
        e(upch, clav); e(clav, sh); e(sh, el); e(el, wr)
        hip = v((sx * 0.088, 0, 0.90), 0.088)
        knee = v((sx * 0.092, -0.008, 0.49), 0.059)
        ank = v((sx * 0.092, 0.006, 0.098), 0.043)
        mid = v((sx * 0.092, -0.022, 0.046), 0.042)
        heel = v((sx * 0.092, 0.034, 0.040), 0.036)
        ball = v((sx * 0.092, -0.098, 0.034), 0.036)
        toe = v((sx * 0.092, -0.152, 0.029), 0.027)
        e(pelvis, hip); e(hip, knee); e(knee, ank); e(ank, mid); e(mid, heel); e(mid, ball); e(ball, toe)

    body = skin('body', V, E, R, root=pelvis, sub=1)
    me = body.data
    HEM, CUFF, ANKLE, COLLAR = 1.0, 0.838, 0.115, 1.405
    bm = bmesh.new()
    bm.from_mesh(me)
    for z in (HEM, CUFF, ANKLE, COLLAR):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z), plane_no=(0, 0, 1))
    bmesh.ops.dissolve_degenerate(bm, dist=0.0004, edges=bm.edges[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    me.update()

    # ---- 骨 ----
    B = {}   # 名前 -> (頭, 尾, 親, 太さ, 向きをそろえる軸)
    UP, DOWN, FWD = Vector((0, -1, 0)), Vector((0, 1, 0)), Vector((0, 0, -1))

    def bone(name, h, t, parent, r, roll):
        B[name] = (Vector(h), Vector(t), parent, r, roll)

    bone('hips', (0, 0, 0.93), (0, 0, 1.06), None, 0.125, UP)
    bone('spine', (0, 0, 1.06), (0, 0, 1.22), 'hips', 0.125, UP)
    bone('chest', (0, 0, 1.22), (0, 0, 1.40), 'spine', 0.125, UP)
    bone('neck', (0, 0, 1.40), (0, 0, 1.47), 'chest', 0.05, UP)
    bone('head', (0, 0, 1.47), (0, 0, 1.65), 'neck', 0.11, UP)
    for sx, s in ((1, 'L'), (-1, 'R')):
        bone('upperarm.' + s, (sx * 0.172, 0, 1.325), (sx * 0.215, 0.006, 1.06), 'chest', 0.05, DOWN)
        bone('forearm.' + s, (sx * 0.215, 0.006, 1.06), (sx * 0.242, -0.004, 0.815), 'upperarm.' + s, 0.04, DOWN)
        bone('hand.' + s, (sx * 0.242, -0.004, 0.815), (sx * 0.242, -0.004, 0.719), 'forearm.' + s, 0.045, DOWN)
        bone('thigh.' + s, (sx * 0.088, 0, 0.90), (sx * 0.092, -0.008, 0.49), 'hips', 0.082, DOWN)
        bone('shin.' + s, (sx * 0.092, -0.008, 0.49), (sx * 0.092, 0.006, 0.098), 'thigh.' + s, 0.056, DOWN)
        bone('foot.' + s, (sx * 0.092, 0.006, 0.098), (sx * 0.092, -0.15, 0.03), 'shin.' + s, 0.046, FWD)
    # ---- 手の作り（関節の位置を先に決める。メッシュはあとで作る） ----
    #   手首を原点に、u = 指先のほう、v = 親指のほう、w = 手の甲のほう（長さはメートル）
    FINGERS = [   # 名前, つけ根の位置 (u, v), 開き, 節の長さ 3 つ, 太さ（半径）
        ('index', 0.0940, 0.0302, 0.045, (0.042, 0.024, 0.0205), 0.0106),
        ('middle', 0.0980, 0.0090, 0.0, (0.046, 0.028, 0.0215), 0.0108),
        ('ring', 0.0935, -0.0120, -0.04, (0.042, 0.026, 0.0210), 0.0101),
        ('little', 0.0830, -0.0312, -0.10, (0.033, 0.019, 0.0190), 0.0090),
    ]
    THUMB = dict(base=(0.020, 0.025, -0.007), dirs=((0.76, 0.56, -0.32), (0.89, 0.38, -0.24), (0.92, 0.31, -0.24)),
                 lens=(0.044, 0.031, 0.026), dorsal=(0, 0.74, 0.67), rad=0.0116)
    HS = 1.07     # 手の大きさ（手首を中心に、この倍率でひとまわり大きくする）
    FB = {}       # 指の骨: 名前 -> (頭, 尾, 親, 甲の向き)。体の重みづけには使わない
    HAND = {}     # 側 -> 手の座標の決まりと、関節の位置
    for sx, s in ((1, 'L'), (-1, 'R')):
        wrist = Vector((sx * 0.242, -0.004, 0.815))
        Uh, Vh, Wh = Vector((0, 0, -1)), Vector((0, -1, 0)), Vector((sx, 0, 0))

        def HP(u, vv, w, wrist=wrist, Uh=Uh, Vh=Vh, Wh=Wh):
            return wrist + Uh * u + Vh * vv + Wh * w

        def HD(u, vv, w, Uh=Uh, Vh=Vh, Wh=Wh):
            return (Uh * u + Vh * vv + Wh * w).normalized()
        chains = {}
        for name, fu, fv, spread, lens, rad in FINGERS:
            d = HD(math.cos(spread), math.sin(spread), 0)
            J = [HP(fu, fv, 0.0005)]
            for ln in lens:
                J.append(J[-1] + d * ln)
            chains[name] = (J, [d, d, d], Wh.copy(), rad, lens)
            par = 'hand.' + s
            Js = [wrist + (q - wrist) * HS for q in J]
            for k in range(3):
                FB[f'{name}{k + 1}.{s}'] = (Js[k], Js[k + 1], par, Wh.copy())
                par = f'{name}{k + 1}.{s}'
        dirs = [HD(*x) for x in THUMB['dirs']]
        J = [HP(*THUMB['base'])]
        for d, ln in zip(dirs, THUMB['lens']):
            J.append(J[-1] + d * ln)
        dors = HD(*THUMB['dorsal'])
        chains['thumb'] = (J, dirs, dors, THUMB['rad'], THUMB['lens'])
        par = 'hand.' + s
        Js = [wrist + (q - wrist) * HS for q in J]
        for k in range(3):
            FB[f'thumb{k + 1}.{s}'] = (Js[k], Js[k + 1], par, dors.copy())
            par = f'thumb{k + 1}.{s}'
        HAND[s] = dict(P=HP, chains=chains, wrist=wrist)

    children = {}
    for n, b in B.items():
        if b[2]:
            children.setdefault(b[2], []).append(n)

    # ---- 重み（いちばん近い骨。関節の近くでは隣の骨と混ぜる） ----
    ZONE = 0.3
    near = []
    weights = []
    for vert in me.vertices:
        p = vert.co
        best, bd, bt = None, 1e9, 0
        for n, (h, t, par, r, _) in B.items():
            d, tt = seg_dist(p, h, t)
            if d / r < bd:
                best, bd, bt = n, d / r, tt
        w = {best: 1.0}
        par = B[best][2]
        if bt < ZONE and par:
            wp = 0.5 * (1 - bt / ZONE)
            w = {best: 1 - wp, par: wp}
        elif bt > 1 - ZONE and best in children:
            c = min(children[best], key=lambda n: seg_dist(p, B[n][0], B[n][1])[0] / B[n][3])
            wc = 0.5 * ((bt - (1 - ZONE)) / ZONE)
            w = {best: 1 - wc, c: wc}
        near.append(best)
        weights.append(w)

    # ---- 形を整える（胴を平たく、手を薄く） ----
    for i, vert in enumerate(me.vertices):
        n = near[i]
        if n in ('hips', 'spine', 'chest'):
            vert.co.y *= 0.80
        elif n.startswith('hand'):
            cx = 0.242 if vert.co.x > 0 else -0.242
            vert.co.x = cx + (vert.co.x - cx) * 0.74
    me.update()

    # ---- 素材（肌・上着・下衣・靴）と、服のふくらみ ----
    mats = [mat('skin', (0.85, 0.72, 0.6)), mat('top', (0.7, 0.66, 0.6)), mat('bottom', (0.25, 0.27, 0.33)), mat('shoe', (0.2, 0.2, 0.22))]
    for m in mats:
        me.materials.append(m)

    def region(n, z):
        if n in ('head', 'neck'):
            return 0 if z > COLLAR else 1
        if n.startswith('hand'):
            return 0
        if n.startswith('forearm'):
            return 0 if z < CUFF else 1
        if n in ('chest', 'spine') or n.startswith('upperarm'):
            return 1
        if n == 'hips':
            return 1 if z > HEM else 2
        if n.startswith('thigh'):
            return 2
        if n.startswith('shin'):
            return 3 if z < ANKLE else 2
        return 3

    vreg = [set() for _ in me.vertices]
    for poly in me.polygons:
        c = poly.center
        cnt = {}
        for vi in poly.vertices:
            cnt[near[vi]] = cnt.get(near[vi], 0) + 1
        n = max(cnt, key=cnt.get)
        r = region(n, c.z)
        poly.material_index = r
        poly.use_smooth = True
        for vi in poly.vertices:
            vreg[vi].add(r)
    puff = {1: 0.010, 2: 0.009, 3: 0.007}
    for i, vert in enumerate(me.vertices):
        if len(vreg[i]) == 1:
            r = next(iter(vreg[i]))
            if r in puff:
                vert.co += vert.normal * puff[r]
    me.update()

    # ---- 骨を組む ----
    arm = bpy.data.armatures.new('rig')
    rig = link('rig', arm)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for n, (h, t, par, r, roll) in B.items():
        eb = arm.edit_bones.new(n)
        eb.head, eb.tail = h, t
        if par:
            eb.parent = arm.edit_bones[par]
        eb.use_connect = False
        eb.align_roll(roll)
    for n, (h, t, par, dors) in FB.items():          # 指の骨。甲の向きに Z をそろえると、X の負の回転が「握る」になる
        eb = arm.edit_bones.new(n)
        eb.head, eb.tail = h, t
        eb.parent = arm.edit_bones[par]
        eb.use_connect = False
        eb.align_roll(dors)
    bpy.ops.object.mode_set(mode='OBJECT')

    def bind(ob, wts):
        for n in list(B) + list(FB):
            ob.vertex_groups.new(name=n)
        for i, w in enumerate(wts):
            for n, x in w.items():
                ob.vertex_groups[n].add([i], x, 'REPLACE')
        ob.parent = rig
        md = ob.modifiers.new('Armature', 'ARMATURE')
        md.object = rig

    bind(body, weights)

    # ---- 頭（顔のつくり）。中心 HC からの位置で形を決める。−Y が顔 ----
    HC = Vector((0, -0.006, 1.572))
    RX, RY, RZ = 0.081, 0.099, 0.108

    def g(a, w):
        return math.exp(-(a / w) ** 2)

    def sstep(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3 - 2 * t)

    def skull(d):
        """向き d（長さ 1）の先にある頭の表面"""
        x, y, z = d.x * RX, d.y * RY, d.z * RZ
        if z < 0:
            t = min(1.0, -z / RZ)
            z *= 1.16                                            # あごへ伸ばす
            x *= 1 - 0.42 * t ** 1.5                             # あごへ向けて細く
            y *= (1 - 0.5 * t ** 1.2) if y > 0 else (1 - 0.14 * t ** 2)
        return Vector((x, y, z))

    def skull_n(p):
        return Vector((p.x / RX ** 2, p.y / RY ** 2, p.z / RZ ** 2)).normalized()

    def face(p):
        x, y, z = p
        if y >= 0:
            return p
        front = min(1.0, -y / 0.03)
        ax = abs(x)
        dy = 0.0
        dy -= 0.005 * g(z - 0.004, 0.011) * g(x, 0.05)                    # 眉の出
        dy += 0.012 * g(z + 0.012, 0.012) * g(ax - 0.033, 0.016)          # 目のくぼみ
        if -0.066 < z < 0.014:                                             # 鼻
            if z > 0.0:
                prof = 0.3 * (1 - z / 0.014)
            elif z > -0.052:
                prof = 0.3 + 0.7 * (-z / 0.052)
            else:
                prof = 1 - (-0.052 - z) / 0.014
            tt = min(1.0, max(0.0, -z / 0.052))
            dy -= 0.028 * prof * g(x, 0.009 + 0.006 * tt)
        dy -= 0.004 * g(z + 0.080, 0.02) * g(x, 0.03)                     # 口もとのふくらみ
        dy += 0.0025 * g(z + 0.083, 0.008) * g(x, 0.022)                  # 口
        dy -= 0.005 * g(z + 0.110, 0.016) * g(x, 0.022)                   # あご
        return Vector((x, y + dy * front, z))

    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=5, radius=1.0)
    for vv in bm.verts:
        vv.co = face(skull(vv.co.normalized())) + HC
    mh = bpy.data.meshes.new('face_hi')
    bm.to_mesh(mh)
    bm.free()
    oh = link('face_hi', mh)
    dec = oh.modifiers.new('Dec', 'DECIMATE')
    dec.ratio = 900 / 5120
    dg = bpy.context.evaluated_depsgraph_get()
    mf = bpy.data.meshes.new_from_object(oh.evaluated_get(dg))
    bpy.data.objects.remove(oh)
    bpy.data.meshes.remove(mh)
    bm = bmesh.new()
    bm.from_mesh(mf)
    for sx in (1, -1):                                                     # 耳
        r = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for vv in r['verts']:
            q = Vector((vv.co.x * 0.009, vv.co.y * 0.016, vv.co.z * 0.029))
            q.y += q.z * 0.22
            q.x += max(0.0, q.y) * 0.55
            vv.co = Vector((sx * (0.074 + q.x), 0.014 + q.y, -0.030 + q.z)) + HC
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(mf)
    bm.free()
    for poly in mf.polygons:
        poly.use_smooth = True
    mf.materials.append(mats[0])
    face_ob = link('face', mf)
    bind(face_ob, [{'head': 1.0} for _ in mf.vertices])

    # ---- 手（手のひらは断面をつないで作り、指は 1 本ずつ、節ごとの骨で曲がる筒にする） ----
    def build_hand(s):
        P, chains = HAND[s]['P'], HAND[s]['chains']
        hb, fa = 'hand.' + s, 'forearm.' + s
        bm = bmesh.new()
        wid = bm.verts.layers.int.new('wid')        # 点ごとの重みの番号（0 は「まだ決めていない」）
        wlist = [{hb: 1.0}]

        def nv(co, w):
            vt = bm.verts.new(co)
            wlist.append(w)
            vt[wid] = len(wlist) - 1
            return vt

        # 手のひら。手首から指のつけ根まで、角のまるい断面を 7 つ
        NP, ex = 14, 2 / 2.25
        us = [-0.014, 0.0, 0.016, 0.040, 0.066, 0.086, 0.098, 0.1035]
        aw = [0.0262, 0.0278, 0.0316, 0.0388, 0.0430, 0.0436, 0.0418, 0.0380]       # 幅の半分
        bw = [0.0225, 0.0200, 0.0188, 0.0172, 0.0152, 0.0130, 0.0104, 0.0062]       # 厚みの半分
        rings = []
        for i, u in enumerate(us):
            ring = []
            for k in range(NP):
                th = (k + 0.5) / NP * math.tau
                c, sn = math.cos(th), math.sin(th)
                vv = aw[i] * math.copysign(abs(c) ** ex, c) + 0.0015
                ww = bw[i] * math.copysign(abs(sn) ** ex, sn)
                uu = u
                if i >= 5:                                      # 指のつけ根の線は、中指を頂点に弓なり
                    uu -= 11.3 * (vv - 0.009) ** 2 * (1.0 if i >= 6 else 0.55)
                if ww < 0:                                      # 手のひらの側: 親指のつけ根と小指側のふくらみ、まんなかのくぼみ
                    ww -= 0.011 * g(uu - 0.034, 0.028) * g(vv - 0.022, 0.019)
                    ww -= 0.005 * g(uu - 0.030, 0.030) * g(vv + 0.026, 0.014)
                    ww += 0.003 * g(uu - 0.062, 0.024) * g(vv - 0.002, 0.016)
                else:                                           # 甲の側: ゆるく丸く、指のつけ根には骨の出
                    ww += 0.0028 * g(vv - 0.004, 0.03) * g(uu - 0.05, 0.05)
                    for (_, fu, fv, _, _, _) in FINGERS:
                        ww += 0.0022 * g(uu - fu + 0.004, 0.008) * g(vv - fv, 0.0065)
                if c > 0.3:
                    vv += 0.007 * g(uu - 0.034, 0.026) * c
                wt = {fa: 0.6, hb: 0.4} if i == 0 else ({fa: 0.25, hb: 0.75} if i == 1 else {hb: 1.0})
                ring.append(nv(P(uu, vv, ww), wt))
            rings.append(ring)
        for i in range(len(rings) - 1):
            for k in range(NP):
                bm.faces.new((rings[i][k], rings[i][(k + 1) % NP], rings[i + 1][(k + 1) % NP], rings[i + 1][k]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])

        def tube(J, dirs, dors, rspec, nail_bands, squash=0.9):
            """関節をつないだ筒。rspec = [(節の番号, その節の頭からの距離, 半径, 重み)]。爪は甲の側の面"""
            NS, rgs = 8, []
            for (seg, off, rad, wt) in rspec:
                t = dirs[seg]
                dd = (dors - t * dors.dot(t)).normalized()
                side = dd.cross(t).normalized()
                c = J[seg] + t * off
                rgs.append([nv(c + side * (rad * math.cos((k + 0.5) / NS * math.tau)) + dd * (rad * squash * math.sin((k + 0.5) / NS * math.tau)), wt) for k in range(NS)])
            for i in range(len(rgs) - 1):
                for k in range(NS):
                    f = bm.faces.new((rgs[i][k], rgs[i][(k + 1) % NS], rgs[i + 1][(k + 1) % NS], rgs[i + 1][k]))
                    if i in nail_bands and k == 1:
                        f.material_index = 1
            apex = nv(J[-1], rspec[-1][3])
            for k in range(NS):
                bm.faces.new((rgs[-1][k], rgs[-1][(k + 1) % NS], apex))
            bm.faces.new(list(reversed(rgs[0])))

        for name, _, _, _, _, _ in FINGERS:
            J, dirs, dors, R, (L1, L2, L3) = chains[name]
            n1, n2, n3 = (f'{name}{k}.{s}' for k in (1, 2, 3))
            tube(J, dirs, dors, [
                (0, -0.009, R * 1.02, {hb: 0.7, n1: 0.3}), (0, 0.006, R * 1.07, {hb: 0.25, n1: 0.75}), (0, L1 * 0.5, R * 0.95, {n1: 1.0}),
                (0, L1 - 0.006, R * 0.97, {n1: 0.8, n2: 0.2}), (1, 0.005, R * 0.96, {n1: 0.25, n2: 0.75}), (1, L2 * 0.5, R * 0.87, {n2: 1.0}),
                (1, L2 - 0.005, R * 0.89, {n2: 0.8, n3: 0.2}), (2, 0.004, R * 0.88, {n2: 0.25, n3: 0.75}),
                (2, 0.0085, R * 0.86, {n3: 1.0}), (2, L3 - 0.0075, R * 0.82, {n3: 1.0}), (2, L3 - 0.0026, R * 0.56, {n3: 1.0})], {8, 9})
        J, dirs, dors, R, (T1, T2, T3) = chains['thumb']
        t1, t2, t3 = (f'thumb{k}.{s}' for k in (1, 2, 3))
        tube(J, dirs, dors, [
            (0, 0.008, R * 1.18, {hb: 0.65, t1: 0.35}), (0, T1 - 0.006, R * 1.02, {t1: 0.8, t2: 0.2}), (1, 0.005, R * 0.98, {t1: 0.25, t2: 0.75}),
            (1, T2 - 0.005, R * 0.91, {t2: 0.8, t3: 0.2}), (2, 0.004, R * 0.89, {t2: 0.25, t3: 0.75}), (2, 0.010, R * 0.875, {t3: 1.0}),
            (2, T3 - 0.008, R * 0.80, {t3: 1.0}), (2, T3 - 0.0028, R * 0.55, {t3: 1.0})], {5, 6})

        d1, d2 = dirs[0], dirs[1]
        dd = (dors - d1 * dors.dot(d1)).normalized()
        sd = dd.cross(d1).normalized()
        cen = J[0] + d1 * 0.021 - dd * 0.003 - HAND[s]['P'](0, 1, 0).__sub__(HAND[s]['P'](0, 0, 0)) * 0.004
        ball = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for vt in ball['verts']:
            q = vt.co.copy()
            vt.co = cen + d1 * (q.x * 0.028) + sd * (q.y * 0.0155) + dd * (q.z * 0.0135)
        wlist.append({hb: 0.55, t1: 0.45})
        for vt in bm.verts:
            if vt[wid] == 0:
                vt[wid] = len(wlist) - 1

        for vt in bm.verts:                                  # 手首を中心に、ひとまわり大きくする
            vt.co = HAND[s]['wrist'] + (vt.co - HAND[s]['wrist']) * HS
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        wts = [wlist[vt[wid]] for vt in bm.verts]
        m = bpy.data.meshes.new('hand_' + s)
        bm.to_mesh(m)
        bm.free()
        for poly in m.polygons:
            poly.use_smooth = True
        m.materials.append(mats[0])
        m.materials.append(mat('nail', (0.93, 0.80, 0.74)))
        ob = link('hand_' + s, m)
        bind(ob, wts)
        return ob

    for s in ('L', 'R'):
        build_hand(s)

    # ---- 髪（頭の形に沿わせて厚みをつける。頭の骨についていく） ----
    def line(y, front, temple, nape):
        """生えぎわの高さ。額 → こめかみ（耳の上）→ えり足"""
        if y < -0.05:
            return front
        if y < 0.0:
            return front + (temple - front) * sstep((y + 0.05) / 0.05)
        if y < 0.05:
            return temple + (nape - temple) * sstep(y / 0.05)
        return nape

    def part(q, amt):
        """前髪を片側へ流す（額の線を斜めにする）"""
        return amt * (q.x / 0.06) * sstep((-q.y - 0.03) / 0.03)

    def hair(name, H=None, tk=0.017, extra=None, rim=0.004, fall=0.04, sub=4, Hd=None, pos=None, drop=None):
        Hd = Hd or (lambda d: H(skull(d)))

        def on_skull(d):
            q = skull(d)
            return q + skull_n(q) * (rim + tk * sstep(Hd(d) / fall))
        pos = pos(on_skull) if pos else on_skull
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)

        def inside(d):
            return Hd(d) >= 0
        dead = [f for f in bm.faces if not any(inside(vv.co.normalized()) for vv in f.verts)
                or (drop and any(drop(vv.co.normalized()) for vv in f.verts))]
        bmesh.ops.delete(bm, geom=dead, context='FACES')
        # 生えぎわの外にある点は、内側の隣の点との間で、ちょうど線の上まで寄せる
        nd = {}
        for vv in bm.verts:
            d = vv.co.normalized()
            if not inside(d):
                ins = [e2.other_vert(vv).co.normalized() for e2 in vv.link_edges if inside(e2.other_vert(vv).co.normalized())]
                if ins:
                    t0 = Vector((0, 0, 0))
                    for q in ins:
                        t0 += q
                    t0.normalize()
                    lo, hi = 0.0, 1.0
                    for _ in range(20):
                        mid = (lo + hi) / 2
                        if inside(d.lerp(t0, mid).normalized()):
                            hi = mid
                        else:
                            lo = mid
                    d = d.lerp(t0, hi).normalized()
            nd[vv] = d
        for vv in bm.verts:
            vv.co = pos(nd[vv]) + HC
        bmesh.ops.dissolve_degenerate(bm, dist=0.0005, edges=bm.edges[:])
        n_cap = len(bm.faces)
        # ふちを頭の側へ折り込む（すきまから中が見えないように）
        made = {}
        for e2 in [e2 for e2 in bm.edges if len(e2.link_faces) == 1]:
            pair = []
            for vv in e2.verts:
                if vv not in made:
                    made[vv] = (bm.verts.new(vv.co), bm.verts.new(vv.co - skull_n(vv.co - HC) * (rim + 0.006)))
                pair.append(made[vv])
            try:
                bm.faces.new((pair[0][0], pair[1][0], pair[1][1], pair[0][1]))
            except ValueError:
                pass
        n_all = len(bm.faces)
        if extra:
            extra(bm)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(name)
        bm.to_mesh(m)
        bm.free()
        for k, poly in enumerate(m.polygons):
            poly.use_smooth = not (n_cap <= k < n_all)
        m.materials.append(mat('hair', (0.18, 0.16, 0.15)))
        ob = link(name, m)
        bind(ob, [{'head': 1.0} for _ in m.vertices])
        return ob

    def add_ball(center, radius, scale=(1, 1, 1), sub=3):
        def f(bm):
            r = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=radius)
            for vv in r['verts']:
                vv.co = Vector((vv.co.x * scale[0], vv.co.y * scale[1], vv.co.z * scale[2])) + Vector(center) + HC
        return f

    # 短い髪
    hair('hair_short', lambda q: q.z - line(q.y, 0.058, 0.004, -0.062) - part(q, 0.009), 0.017)

    # 肩までの髪。耳の少し前から後ろは、頭の輪郭からそのまま下へ垂らす
    SB, LEN = -0.15, 0.168

    def long_line(y):
        if y < -0.065:
            return 0.050
        if y < -0.03:
            return 0.050 + (-0.02 - 0.050) * sstep((y + 0.065) / 0.035)
        return -0.02 - (y + 0.03) * 3.0

    def long_up(d):
        q = skull(d)
        return q.z - long_line(q.y) - part(q, 0.012)

    def ring(d):
        c = math.sqrt(1 - SB * SB)
        h = math.hypot(d.x, d.y) or 1e-6
        return Vector((d.x / h * c, d.y / h * c, SB))

    def long_pos(on_skull):
        def f(d):
            if d.z >= SB:
                return on_skull(d)
            pb = on_skull(ring(d))
            u = min(1.0, (SB - d.z) / (SB + 1) / 0.8)
            w = 1.0 + 0.05 * math.sin(u * math.pi) - 0.10 * u * u
            return Vector((pb.x * w, pb.y * w + 0.012 * u, pb.z - LEN * u))
        return f
    hair('hair_long', tk=0.021, Hd=lambda d: long_up(d) if d.z >= SB else long_up(ring(d)), pos=long_pos, drop=lambda d: d.z < -0.985)

    # うしろでまとめた髪
    hair('hair_bun', lambda q: q.z - line(q.y, 0.058, 0.0, -0.058) - part(q, 0.004), 0.013,
         add_ball((0, 0.101, 0.004), 0.040, (1.0, 0.9, 1.0)))

    # てっぺんの薄くなった髪（横とうしろに残る）
    hair('hair_thin', lambda q: min(q.z - line(q.y, 0.0, -0.002, -0.058), 0.034 + 0.026 * sstep((q.y + 0.01) / 0.08) - q.z, (q.y + 0.014) * 1.6),
         0.009, fall=0.02)

    # 作業用のヘルメット（頭の上半分をおおう椀と、ぐるりのつば）
    def brim(bm):
        n = 24
        ring_in, ring_out, low_in, low_out = [], [], [], []
        for k in range(n):
            a = k / n * math.tau
            cx, sy = math.cos(a), math.sin(a)
            fwd = 1.0 + 0.55 * max(0.0, -sy)                      # 前のつばは長め
            pi = Vector((cx * (RX + 0.014), sy * (RY + 0.014), 0.036)) + HC
            po = Vector((cx * (RX + 0.03 * fwd), sy * (RY + 0.03 * fwd), 0.029)) + HC
            dz = Vector((0, 0, 0.006))
            ring_in.append(bm.verts.new(pi))
            ring_out.append(bm.verts.new(po))
            low_in.append(bm.verts.new(pi - dz))
            low_out.append(bm.verts.new(po - dz))
        for k in range(n):
            j = (k + 1) % n
            bm.faces.new((ring_in[k], ring_in[j], ring_out[j], ring_out[k]))
            bm.faces.new((ring_out[k], ring_out[j], low_out[j], low_out[k]))
            bm.faces.new((low_out[k], low_out[j], low_in[j], low_in[k]))
    hair('hair_helmet', lambda q: q.z - 0.036, 0.019, brim, rim=0.014, fall=0.02)
    return rig


# ============================ 木 ============================
TREES = {
    #          幹の高さ 幹の太さ 傾き  樹冠の中心 半径  高さ  枝先 大枝 下向き 葉   つぶれ しなり
    'broad':  dict(trunk=0.36, r=0.032, lean=0.05, cz=0.68, cr=0.33, ch=0.30, tips=17, n=5, el0=-0.10, leaf=0.150, sq=0.80, arch=0.10),
    'sakura': dict(trunk=0.26, r=0.034, lean=0.09, cz=0.62, cr=0.45, ch=0.27, tips=22, n=5, el0=-0.25, leaf=0.118, sq=0.62, arch=0.18),
    'momiji': dict(trunk=0.22, r=0.027, lean=0.11, cz=0.60, cr=0.42, ch=0.27, tips=20, n=5, el0=-0.28, leaf=0.112, sq=0.5, arch=0.22),
    'ginkgo': dict(trunk=0.30, r=0.030, lean=0.02, cz=0.66, cr=0.235, ch=0.33, tips=17, n=4, el0=-0.55, leaf=0.118, sq=0.92, arch=0.04),
}


def build_tree(name, kind, seed):
    rnd = random.Random(seed)
    V, E, R = [], [], []
    blobs = []     # 葉のかたまり (位置, 半径, つぶれ, 細かさ)
    twigs = []     # 冬の小枝の線分

    def v(p, r):
        V.append(Vector(p))
        R.append(max(0.0035, r))
        return len(V) - 1

    def jit(k):
        return Vector((rnd.uniform(-k, k), rnd.uniform(-k, k), rnd.uniform(-k, k)))

    def twig_at(p, n, ln):
        for _ in range(n):
            a = rnd.uniform(0, math.tau)
            d = Vector((math.cos(a), math.sin(a), rnd.uniform(-0.1, 0.8))).normalized()
            twigs.append((p.copy(), p + d * ln * rnd.uniform(0.6, 1.0)))

    twig = None
    if kind == 'conifer':
        base = v((0, 0, 0), 0.036)
        top = v((0, 0, 0.5), 0.02)
        tip = v((0, 0, 0.96), 0.006)
        E.extend([(base, top), (top, tip)])
        trunk = skin(name + '_bark', V, E, R, root=base, sub=0, max_tris=160)
        bm = bmesh.new()
        tiers = 6
        for k in range(tiers):
            z0 = 0.17 + k * 0.125
            rad = 0.205 * (1 - k / (tiers + 0.7)) * rnd.uniform(0.92, 1.08)
            segs = 9
            ring = []
            for sgi in range(segs):
                a = sgi / segs * math.tau + rnd.uniform(-0.12, 0.12)
                rr = rad * rnd.uniform(0.8, 1.12)
                ring.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z0 - rnd.uniform(0.0, 0.035))))
            apex = bm.verts.new((rnd.uniform(-0.01, 0.01), rnd.uniform(-0.01, 0.01), z0 + 0.27 * (1 - k / (tiers * 1.7))))
            cen = bm.verts.new((0, 0, z0 + 0.03))
            for sgi in range(segs):
                bm.faces.new((ring[sgi], ring[(sgi + 1) % segs], apex))
                bm.faces.new((ring[(sgi + 1) % segs], ring[sgi], cen))
        lm = bpy.data.meshes.new(name + '_leaf')
        bm.to_mesh(lm)
        bm.free()
        leaf = link(name + '_leaf', lm)
    else:
        if kind == 'pine':
            # 庭の松: 曲がった幹に、平たい葉の段
            sgn = rnd.choice((-1, 1))
            path = [(0, 0, 0), (0.05 * sgn, 0.01, 0.2), (-0.05 * sgn, 0.03, 0.44), (0.05 * sgn, -0.01, 0.68), (0.01 * sgn, 0.0, 0.86)]
            rad = [0.064, 0.048, 0.040, 0.030, 0.017]
            idx = [v(p, r) for p, r in zip(path, rad)]
            for a, b in zip(idx, idx[1:]):
                E.append((a, b))
            base = idx[0]
            for k, (hgt, ln) in enumerate(((0.36, 0.34), (0.50, 0.30), (0.63, 0.26), (0.76, 0.2))):
                seg = min(range(len(path) - 1), key=lambda i: abs((path[i][2] + path[i + 1][2]) / 2 - hgt))
                a = Vector(path[seg]).lerp(Vector(path[seg + 1]), 0.5)
                ai = v(a, 0.027)
                E.append((idx[seg], ai))
                ang = k * 2.2 + rnd.uniform(-0.4, 0.4)
                d = Vector((math.cos(ang), math.sin(ang), 0.12))
                m = a + d * ln * 0.55 + Vector((0, 0, 0.03))
                mi = v(m, 0.019)
                E.append((ai, mi))
                t = a + d * ln + Vector((0, 0, 0.02))
                ti = v(t, 0.011)
                E.append((mi, ti))
                for q in (t, m.lerp(t, 0.4) + jit(0.05), t + jit(0.07)):
                    blobs.append((q + Vector((0, 0, 0.03)), rnd.uniform(0.105, 0.15), 0.33, 1))
                twig_at(t, 3, 0.09)
            blobs.append((Vector(path[-1]) + Vector((0, 0, 0.04)), 0.14, 0.4, 1))
            blobs.append((Vector(path[-1]) + Vector((0.07, 0.03, 0.0)), 0.11, 0.35, 1))
        else:
            p = TREES[kind]
            a0 = rnd.uniform(0, math.tau)
            lean = Vector((math.cos(a0), math.sin(a0), 0)) * p['lean']
            base = v((0, 0, 0), p['r'] * 1.7)
            f1 = v((lean.x * 0.08, lean.y * 0.08, 0.05), p['r'] * 1.15)
            f2 = v((lean.x * 0.55 + rnd.uniform(-0.02, 0.02), lean.y * 0.55 + rnd.uniform(-0.02, 0.02), p['trunk'] * 0.55), p['r'])
            top = v((lean.x, lean.y, p['trunk']), p['r'] * 0.9)
            E.extend([(base, f1), (f1, f2), (f2, top)])
            tp = Vector((lean.x, lean.y, p['trunk']))
            C = Vector((lean.x * 1.3, lean.y * 1.3, p['cz']))
            groups = [[] for _ in range(p['n'])]
            for i in range(p['tips']):
                az = (i + rnd.random() * 0.8) / p['tips'] * math.tau
                el = math.asin(max(-1, min(1, rnd.uniform(p['el0'], 1.0))))
                q = C + Vector((math.cos(az) * math.cos(el) * p['cr'], math.sin(az) * math.cos(el) * p['cr'], math.sin(el) * p['ch'])) * rnd.uniform(0.84, 1.0)
                groups[int((az % math.tau) / math.tau * p['n']) % p['n']].append(q)
            for g in groups:
                if not g:
                    continue
                cen = sum(g, Vector()) / len(g)
                ln = (cen - tp).length
                mid = tp.lerp(cen, 0.6) + Vector((0, 0, p['arch'] * ln))
                h1 = v(tp.lerp(mid, 0.5) + jit(0.015), p['r'] * 0.52)
                E.append((top, h1))
                mi = v(mid, p['r'] * 0.36)
                E.append((h1, mi))
                for q in g:
                    w = mid.lerp(q, 0.55) + jit(0.02)
                    wi = v(w, p['r'] * 0.2)
                    E.append((mi, wi))
                    ti = v(q, p['r'] * 0.09)
                    E.append((wi, ti))
                    blobs.append((q + Vector((0, 0, p['leaf'] * 0.15)), p['leaf'] * rnd.uniform(0.75, 1.2), p['sq'], 1))
                    twig_at(q, 4, 0.085)
                    twig_at(w, 2, 0.1)
                blobs.append((cen.lerp(C, 0.25), p['leaf'] * rnd.uniform(1.15, 1.45), p['sq'], 2))
            blobs.append((C + Vector((0, 0, p['ch'] * 0.55)), p['leaf'] * 1.3, p['sq'], 2))
        trunk = skin(name + '_bark', V, E, R, root=base, sub=0, max_tris=760)
        bm = bmesh.new()
        for pos, rad, sq, sub in blobs:
            res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=rad)
            for vv in res['verts']:
                j = 1 + rnd.uniform(-0.16, 0.16)
                vv.co = Vector((vv.co.x * j, vv.co.y * j, vv.co.z * j * sq)) + pos
        lm = bpy.data.meshes.new(name + '_leaf')
        bm.to_mesh(lm)
        bm.free()
        leaf = link(name + '_leaf', lm)
        bm = bmesh.new()
        for a1, b1 in twigs:
            ax = (b1 - a1).normalized()
            side = ax.cross(Vector((0, 0, 1)))
            if side.length < 0.01:
                side = Vector((1, 0, 0))
            side.normalize()
            up2 = ax.cross(side)
            ring = [bm.verts.new(a1 + (side * math.cos(t) + up2 * math.sin(t)) * 0.0045) for t in (0, 2.094, 4.189)]
            tipv = bm.verts.new(b1)
            for sgi in range(3):
                bm.faces.new((ring[sgi], ring[(sgi + 1) % 3], tipv))
        tm = bpy.data.meshes.new(name + '_twig')
        bm.to_mesh(tm)
        bm.free()
        twig = link(name + '_twig', tm)

    # 高さ 1 にそろえる
    zs = [vv.co.z for o in (trunk, leaf) for vv in o.data.vertices]
    sc = 1.0 / max(zs)
    parent = bpy.data.objects.new(name, None)
    scene.collection.objects.link(parent)
    for o, mn, col, smooth in ((trunk, 'bark', (0.35, 0.27, 0.2), True), (leaf, 'leaf', (0.3, 0.48, 0.24), False), (twig, 'bark', (0.35, 0.27, 0.2), False)):
        if o is None:
            continue
        for vv in o.data.vertices:
            vv.co *= sc
        for poly in o.data.polygons:
            poly.use_smooth = smooth
        o.data.materials.append(mat(mn, col))
        o.data.update()
        o.parent = parent
    return parent


# ============================ 実行 ============================
rig = build_human()
trees = []
x = 2.0
for kind in ('broad', 'sakura', 'momiji', 'ginkgo', 'pine', 'conifer'):
    for k in range(2):
        t = build_tree(f'tree_{kind}_{k}', kind, hash((kind, k)) % 100000 if False else (sum(map(ord, kind)) * 7 + k * 131))
        trees.append(t)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
for o in bpy.data.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, export_apply=False, export_yup=True,
                          export_skins=True, export_animations=False, export_morph=False, export_texcoords=False,
                          export_normals=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
print('WROTE', OUT, os.path.getsize(OUT), 'bytes', 'tris', tris)
for o in bpy.data.objects:
    if o.type == 'MESH':
        print('  ', o.name, len(o.data.vertices), 'verts', sum(len(p.vertices) - 2 for p in o.data.polygons), 'tris')

# ---- 確認用の画像 ----
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    for i, t in enumerate(trees):
        t.location = (i * 1.25, 12.0, 0)
    for o in bpy.data.objects:
        if o.name.startswith('hair_') and o.name != 'hair_short':
            o.hide_render = True
    hairs = [o for o in bpy.data.objects if o.name.startswith('hair_')]
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_cavity = True
    cam = bpy.data.cameras.new('cam')
    co = link('cam', cam)
    scene.camera = co

    def shot(fname, loc, target, lens=50, size=(900, 900)):
        scene.render.resolution_x, scene.render.resolution_y = size
        cam.lens = lens
        co.location = loc
        d = Vector(target) - Vector(loc)
        co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(PREVIEW, fname)
        bpy.ops.render.render(write_still=True)

    shot('human_front.png', (1.2, -4.4, 1.2), (0, 0, 0.84), 50, (700, 1000))
    shot('human_back.png', (-1.6, 4.2, 1.3), (0, 0, 0.84), 50, (700, 1000))
    shot('hand.png', (0.72, -0.34, 0.78), (0.243, -0.008, 0.715), 85, (800, 800))
    others = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'hand_L']
    keep = {o.name: o.hide_render for o in others}
    for o in others:
        o.hide_render = True
    shot('hand_palm.png', (-0.26, -0.22, 0.76), (0.243, -0.008, 0.715), 85, (800, 800))
    shot('hand_side.png', (0.30, -0.56, 0.74), (0.243, -0.008, 0.715), 85, (800, 800))
    for o in others:
        o.hide_render = keep[o.name]
    for h in hairs:
        for o in hairs:
            o.hide_render = (o is not h)
        shot('head_' + h.name[5:] + '.png', (0.42, -0.86, 1.62), (0, 0, 1.55), 85, (640, 640))
        shot('side_' + h.name[5:] + '.png', (-0.95, 0.12, 1.6), (0, 0, 1.55), 85, (640, 640))
    for o in hairs:
        o.hide_render = (o.name != 'hair_short')
    shot('trees.png', (6.9, -3.5, 1.0), (6.9, 12.0, 0.45), 42, (1800, 520))
