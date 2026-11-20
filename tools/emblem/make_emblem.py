#!/usr/bin/env python3
"""يرسم شعار مؤسسة إرتوفيا الخيرية رسمًا متجهيًّا نظيفًا (SVG) بنفس عناصر الشعار الأصلي وألوانه."""
import math, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "img", "emblem.svg")
INK = "#33241a"     # خط الحدود
SW = 7              # سماكة الخط

def mirror(svg):  # نسخة معكوسة حول المحور العمودي x=620
    return f'<g transform="translate(1240 0) scale(-1 1)">{svg}</g>'

def tri_down(cx, top, w, h, fill, inner=True):
    """مثلث مقلوب ملوّن مع خط داخلي (مثل أعلام الشعار)."""
    x0, x1, y0, y1 = cx - w/2, cx + w/2, top, top + h
    s = f'<path d="M{x0} {y0}H{x1}L{cx} {y1}Z" fill="{fill}" stroke="{INK}" stroke-width="{SW-1}" stroke-linejoin="round"/>'
    if inner:
        k = 0.62
        ix0, ix1 = cx - w/2*k, cx + w/2*k
        iy0, iy1 = y0 + h*0.16, y0 + h*0.16 + h*k*0.92
        s += f'<path d="M{ix0} {iy0}H{ix1}L{cx} {iy1}Z" fill="url(#shine)" stroke="{INK}" stroke-width="3" stroke-opacity=".55" stroke-linejoin="round"/>'
    return s

def stud(x, y, r=13):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#ink)" stroke="#d8c39a" stroke-width="2.5"/><circle cx="{x-3.5}" cy="{y-4}" r="{r*0.3}" fill="#fff" opacity=".35"/>'

def orb(x, y, r):
    return (f'<circle cx="{x}" cy="{y}" r="{r+9}" fill="url(#bronze)" stroke="{INK}" stroke-width="{SW-1}"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#ink)"/>'
            f'<ellipse cx="{x-r*0.32}" cy="{y-r*0.4}" rx="{r*0.38}" ry="{r*0.2}" fill="#fff" opacity=".22" transform="rotate(-30 {x-r*0.32} {y-r*0.4})"/>')

def sword():
    """سيف مقوّس عريض: الطرف أعلى اليسار، والمقبض أسفل اليمين (منحنى بيزييه مع إزاحة متدرّجة)."""
    P = [(206, 22), (300, 300), (560, 560), (872, 772)]
    def bz(t):
        u = 1 - t
        return [u**3*P[0][i] + 3*u*u*t*P[1][i] + 3*u*t*t*P[2][i] + t**3*P[3][i] for i in (0, 1)]
    def d(t):
        u = 1 - t
        return [3*u*u*(P[1][i]-P[0][i]) + 6*u*t*(P[2][i]-P[1][i]) + 3*t*t*(P[3][i]-P[2][i]) for i in (0, 1)]
    top, bot, edge = [], [], []
    N = 40
    for k in range(N + 1):
        t = k / N
        x, y = bz(t); dx, dy = d(t); L = math.hypot(dx, dy); nx, ny = -dy / L, dx / L
        w = 44 * (t ** 0.33) + 3          # يعرض النصل كلما اقترب من المقبض
        back = w * 0.35; front = w * 0.65
        top.append((x + nx * front, y + ny * front)); bot.append((x - nx * back, y - ny * back))
        edge.append((x + nx * front * 0.55, y + ny * front * 0.55))
    pts = top + bot[::-1]
    blade = "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in pts) + "Z"
    ridge = "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in edge[4:])
    # واقي اليد عمودي على النصل، ثم المقبض وينحني طرفه للخارج
    gx, gy = 872, 772
    guard = f'<path d="M{gx-46} {gy+40} L{gx+40} {gy-46} L{gx+54} {gy-32} L{gx-32} {gy+54} Z" fill="url(#bronze)" stroke="{INK}" stroke-width="{SW-1}" stroke-linejoin="round"/>'
    grip = (f'<path d="M{gx+6} {gy+16} C 930 840 975 885 1000 925 C 1018 952 1046 972 1074 966 '
            f'C 1092 962 1096 986 1078 1000 C 1046 1022 1000 1004 976 962 C 950 920 912 878 {gx-14} {gy+36} Z" '
            f'fill="url(#bronzeD)" stroke="{INK}" stroke-width="{SW-1}" stroke-linejoin="round"/>')
    return (f'<path d="{blade}" fill="url(#steel)" stroke="{INK}" stroke-width="{SW-1}" stroke-linejoin="round"/>'
            f'<path d="{ridge}" fill="none" stroke="#7d8790" stroke-opacity=".6" stroke-width="2.5"/>'
            + guard + grip)

def stalk():
    """غصن جانبي: ساق وعليها سنابل مائلة وفوقها كرة."""
    x, y0, y1 = 212, 380, 745
    s = f'<path d="M{x} {y0} V{y1}" stroke="{INK}" stroke-width="22" stroke-linecap="round"/><path d="M{x} {y0} V{y1}" stroke="url(#bronzeV)" stroke-width="11" stroke-linecap="round"/>'
    for i in range(6):
        y = 430 + i * 52
        for d in (-1, 1):
            path = f"M{x} {y+26} L{x + d*62} {y-16}"
            s += f'<path d="{path}" stroke="{INK}" stroke-width="20" stroke-linecap="round"/><path d="{path}" stroke="url(#bronzeV)" stroke-width="9" stroke-linecap="round"/>'
    s += orb(x, 352, 22)
    return s

def tree(x, base, h):
    s = f'<path d="M{x} {base} V{base-h}" stroke="#2f3b3a" stroke-width="5" stroke-linecap="round"/>'
    for i in range(5):
        y = base - h + 10 + i * (h - 22) / 5
        for d in (-1, 1):
            s += f'<path d="M{x} {y+12} L{x + d*15} {y}" stroke="#2f3b3a" stroke-width="4" stroke-linecap="round"/>'
    return s

def sun(cx, cy):
    rays = []
    n = 18
    for i in range(n):
        a = 2*math.pi*i/n - math.pi/2
        a1, a2 = a - math.pi/n*0.55, a + math.pi/n*0.55
        R = 104 if i % 2 == 0 else 86
        rays.append(f"M{cx+60*math.cos(a1):.1f} {cy+60*math.sin(a1):.1f} L{cx+R*math.cos(a):.1f} {cy+R*math.sin(a):.1f} L{cx+60*math.cos(a2):.1f} {cy+60*math.sin(a2):.1f}")
    return (f'<circle cx="{cx}" cy="{cy}" r="150" fill="url(#sunGlow)"/>'
            f'<path d="{" ".join(rays)}Z" fill="url(#rays)" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
            f'<circle cx="{cx}" cy="{cy}" r="60" fill="url(#sun)" stroke="{INK}" stroke-width="4.5"/>'
            f'<circle cx="{cx}" cy="{cy}" r="46" fill="none" stroke="#c98a12" stroke-width="2" opacity=".5"/>')

defs = f'''<defs>
 <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c48d"/><stop offset=".45" stop-color="#a88458"/><stop offset="1" stop-color="#6e5232"/></linearGradient>
 <linearGradient id="bronzeD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9a46c"/><stop offset=".5" stop-color="#8e6c43"/><stop offset="1" stop-color="#5a4128"/></linearGradient>
 <linearGradient id="bronzeV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5b37"/><stop offset=".5" stop-color="#d8b67c"/><stop offset="1" stop-color="#7a5b37"/></linearGradient>
 <linearGradient id="frame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7cc93"/><stop offset=".5" stop-color="#b08c5c"/><stop offset="1" stop-color="#7c5d39"/></linearGradient>
 <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#b9c0c8"/><stop offset=".55" stop-color="#8e969f"/><stop offset="1" stop-color="#d9dee3"/></linearGradient>
 <radialGradient id="ink" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5a4430"/><stop offset="1" stop-color="#1e140c"/></radialGradient>
 <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf7"/><stop offset="1" stop-color="#f3ead6"/></linearGradient>
 <radialGradient id="sun" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#f7cd3a"/><stop offset="1" stop-color="#e3a419"/></radialGradient>
 <radialGradient id="rays" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#f8d64e"/><stop offset="1" stop-color="#eaa922"/></radialGradient>
 <radialGradient id="sunGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
 <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55b79a"/><stop offset="1" stop-color="#2f846c"/></linearGradient>
 <linearGradient id="mtnD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9c82"/><stop offset="1" stop-color="#256b58"/></linearGradient>
 <linearGradient id="earth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c7a26d"/><stop offset=".5" stop-color="#9a7547"/><stop offset="1" stop-color="#6b4e2e"/></linearGradient>
 <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="g-teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb596"/><stop offset="1" stop-color="#2f846c"/></linearGradient>
 <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b78c8"/><stop offset="1" stop-color="#3b519a"/></linearGradient>
 <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6cf4a"/><stop offset="1" stop-color="#d9a21d"/></linearGradient>
 <linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d86670"/><stop offset="1" stop-color="#ae3f4a"/></linearGradient>
 <linearGradient id="g-rust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3735a"/><stop offset="1" stop-color="#a84e37"/></linearGradient>
 <clipPath id="inside"><path d="M620 262 L262 722 H978 Z"/></clipPath>
 <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".35"/></filter>
</defs>'''

# الأعلام الملوّنة خلف المثلث (يسار ثم معكوسها يمينًا)
flags_left = (tri_down(556, 212, 118, 52, "url(#g-teal)") + tri_down(462, 300, 122, 54, "url(#g-gold)") +
              tri_down(398, 386, 122, 54, "url(#g-red)") + tri_down(336, 474, 118, 54, "url(#g-blue)") +
              tri_down(482, 752, 112, 56, "url(#g-red)"))
flags_right_colors = ["url(#g-blue)", "url(#g-red)", "url(#g-rust)", "url(#g-gold)", "url(#g-blue)"]
flags_right = "".join(tri_down(1240 - cx, top, w, h, c) for (cx, top, w, h), c in
                      zip([(556, 212, 118, 52), (462, 300, 122, 54), (398, 386, 122, 54), (336, 474, 118, 54), (482, 752, 112, 56)], flags_right_colors))
studs = "".join(stud(x, y) + stud(1240 - x, y) for x, y in [(466, 192), (404, 290), (330, 360), (262, 452), (386, 832)])

inside = (f'<path d="M620 262 L262 722 H978 Z" fill="url(#field)"/>'
          f'<g clip-path="url(#inside)">'
          + sun(612, 430) +
          "".join(tree(x, 650, 112) for x in (500, 560, 620, 680, 740)) +
          f'<path d="M262 722 L440 582 L560 690 L620 640 L680 690 L790 590 L978 722 Z" fill="url(#mtn)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
          f'<path d="M480 722 L530 660 L575 700 L620 655 L665 700 L712 655 L760 722 Z" fill="url(#mtnD)" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
          f'<path d="M440 582 L520 722 M790 590 L700 722" stroke="#ffffff" stroke-opacity=".25" stroke-width="5"/>'
          '</g>')

frame = (f'<path d="M620 205 L196 758 H1044 Z" fill="none" stroke="{INK}" stroke-width="40" stroke-linejoin="round"/>'
         f'<path d="M620 205 L196 758 H1044 Z" fill="none" stroke="url(#frame)" stroke-width="24" stroke-linejoin="round"/>'
         f'<path d="M620 228 L232 735 H1008 Z" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>')

vee = (f'<path d="M426 652 H814 L620 942 Z" fill="none" stroke="{INK}" stroke-width="34" stroke-linejoin="round"/>'
       f'<path d="M426 652 H814 L620 942 Z" fill="none" stroke="url(#frame)" stroke-width="20" stroke-linejoin="round"/>'
       f'<path d="M620 612 L728 750 L620 908 L512 750 Z" fill="url(#earth)" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"/>'
       f'<path d="M620 612 L728 750 L620 750 Z" fill="#fff" opacity=".12"/>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1040" role="img" aria-label="شعار مؤسسة إرتوفيا الخيرية">
{defs}
<g filter="url(#soft)">
 <g>{sword()}{mirror(sword())}</g>
 <g>{stalk()}{mirror(stalk())}</g>
 <g>{flags_left}{flags_right}</g>
 {studs}
 {inside}
 {frame}
 {vee}
 {orb(620, 140, 40)}
 {orb(620, 972, 28)}
</g>
</svg>'''
open(OUT, "w").write(svg)
print("wrote", OUT, len(svg))
