from pathlib import Path
import math,random
random.seed(8)
parts=[]
def poly(pts,fill,stroke='#584638',sw=1.5):
 parts.append('<polygon points="'+ ' '.join(f'{x:.1f},{y:.1f}' for x,y in pts)+f'" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>')
def P(u,v,z=0):return (400+u-v,265+(u+v)*.48-z)
def box(u,v,w,d,h,top='#cfb795',left='#b49a78',right='#a08768',z=0):
 poly([P(u,v,z+h),P(u+w,v,z+h),P(u+w,v+d,z+h),P(u,v+d,z+h)],top)
 poly([P(u,v+d,z+h),P(u+w,v+d,z+h),P(u+w,v+d,z),P(u,v+d,z)],left)
 poly([P(u+w,v,z+h),P(u+w,v+d,z+h),P(u+w,v+d,z),P(u+w,v,z)],right)
def line(a,b,color='#806b52',width=1):parts.append(f'<path d="M{a[0]:.1f} {a[1]:.1f}L{b[0]:.1f} {b[1]:.1f}" fill="none" stroke="{color}" stroke-width="{width}"/>')
def ellipse(x,y,rx,ry,fill):parts.append(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}"/>')
parts.append('<svg class="iso-room-art" viewBox="0 0 800 620" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">')
ellipse(400,545,300,38,'#3b2f2512')
box(0,0,300,300,18,'var(--iso-floor,#cfb795)','#b49a78','#9c8465',z=-18)
# Floor boards
for v in range(0,301,25):line(P(0,v),P(300,v),'#b59b7b',1)
for v in range(0,300,25):
 for u in range(25 if v%50 else 65,300,80):line(P(u,v),P(u,v+25),'#b59b7b',1)
# walls
poly([P(0,300),P(0,0),P(0,0,220),P(0,300,220)],'var(--iso-wall-left,#e7dfce)')
poly([P(0,0),P(300,0),P(300,0,220),P(0,0,220)],'var(--iso-wall-right,#f3ecdd)')
for v in range(12,300,18):line(P(0,v,15),P(0,v,213),'#d5c8b2',.7)
for u in range(12,300,18):line(P(u,0,15),P(u,0,213),'#e4d9c6',.7)
for a,b in [(P(0,300,220),P(0,0,220)),(P(0,0,220),P(300,0,220)),(P(0,300,5),P(0,0,5)),(P(0,0,5),P(300,0,5))]:line(a,b,'#8d795c',6)
line(P(0,0),P(0,0,220),'#8d795c',4)
# window on left wall
poly([P(1,180,65),P(1,285,65),P(1,285,185),P(1,180,185)],'#a7bab2','#84745e',7)
for v in [182,233,283]:line(P(2,v,65),P(2,v,185),'#fbf9f5',5)
line(P(2,180,125),P(2,285,125),'#fbf9f5',5)
for v in [185,277]:
 poly([P(4,v,189),P(4,v+12,189),P(4,v+16,64),P(4,v,70)],'#fbf9f5','#c4b69d',1)
box(0,178,14,110,6,z=60)
# low bookshelf
box(14,60,36,115,126,'#c4ac88','#baa07e','#8b7459')
# exposed front shelves at u=51, books array along v
for z in [12,51,90]:
 for i in range(11):
  v=65+i*9;h=random.randint(22,31);color=random.choice(['#76876b','#a57d70','#c8b996','#879a9b','#ece4d2'])
  box(49,v,5,6,h,color,color,color,z=z)
 box(48,61,7,112,4,'#dfc8a3','#c0a17c','#93785a',z=z-3)
# books on top
box(23,90,20,26,5,'#f3ecda','#ece3cf','#8a9d97',z=126)
box(24,90,20,24,4,'#a57d70','#e8ddc7','#a57d70',z=131)
# rug
poly([P(90,120,1),P(235,120,1),P(235,255,1),P(90,255,1)],'#8e9c82','#68745e',2)
poly([P(99,129,2),P(226,129,2),P(226,246,2),P(99,246,2)],'#aab39a','#dcd6be',2)
for v in range(125,252,10):line(P(86,v),P(91,v),'#c5c1a7',2);line(P(234,v),P(240,v),'#c5c1a7',2)
# desk against back wall
for u,v in [(115,20),(193,20),(115,59),(193,59)]:box(u,v,6,6,63,'#a58a68','#b89a74','#8c7357')
box(108,12,100,59,9,'#d6bd93','#b89b73','#9f805d',z=63)
# open diary on desk
poly([P(131,30,73),P(153,30,73),P(153,56,73),P(131,56,73)],'#fbf9f5','#b8a98f',1)
poly([P(154,30,73),P(176,30,73),P(176,56,73),P(154,56,73)],'#efe7d7','#b8a98f',1)
for v in [36,42,48]:line(P(135,v,74),P(148,v,74),'#b4aa96',1);line(P(159,v,74),P(171,v,74),'#b4aa96',1)
# mug with steam
x,y=P(190,42,74);ellipse(x,y,7,3,'#695840');parts.append(f'<path d="M{x-6} {y-10}v10q6 5 12 0v-10" fill="#fbf9f5" stroke="#77644e"/><ellipse cx="{x}" cy="{y-10}" rx="6" ry="3" fill="#9e8060"/><path class="tea-steam" d="M{x} {y-16}q-5-6 0-12t0-12" fill="none" stroke="#fbf9f5" stroke-width="2"/>')
# round stool
x,y=P(160,92);ellipse(x,y,20,8,'#3b2f2518')
for dx in [-12,12]:line((x+dx,y),(x+dx,y-28),'#927557',5)
ellipse(x,y-29,23,11,'#b9aa8d');ellipse(x,y-33,23,11,'#d5c5a7')
# sofa back right
for u,v in [(226,65),(285,65),(226,149),(285,149)]:box(u,v,5,5,10,'#80694f','#80694f','#695540')
box(219,54,70,105,31,'#c5b99e','#b4a78c','#9c9079',z=10)
box(270,54,20,105,51,'#ded4bc','#cabfa6','#afa18a',z=22)
for v in [58,108]:box(223,v,48,44,12,'#e9dec6','#d7cab0','#c5b697',z=41)
for v in [50,151]:box(217,v,75,12,40,'#d5c6a9','#bfad90','#ac987d',z=20)
box(251,73,15,26,23,'#8e9b7f','#7c8b70','#6b7c62',z=52)
# foreground table and stack
for u,v in [(155,209),(208,209),(155,247),(208,247)]:box(u,v,4,4,28)
box(149,203,65,50,7,'#dec5a0','#b69a78','#a18765',z=28)
box(165,216,26,21,4,'#8d9d94','#eae1d1','#8d9d94',z=35)
box(168,216,24,19,4,'#b08477','#f0e7d5','#b08477',z=39)
# plant floor
x,y=P(42,251);ellipse(x,y,24,8,'#3b2f2515');parts.append(f'<path d="M{x-16} {y-31}h32l-5 29h-22Z" fill="#b79172" stroke="#76624d" stroke-width="2"/>');ellipse(x,y-31,16,5,'#806d53')
for dx,dy in [(-21,-66),(22,-77),(-12,-92),(14,-109)]:
 line((x,y-29),(x+dx,y+dy),'#68795d',3);ellipse(x+dx,y+dy,12,7,'#80916e')
# wall clock in right wall local plane
parts.append('<g transform="translate(648 210) skewY(25.64)"><circle r="22" fill="#a68b67" stroke="#69563f" stroke-width="2"/><circle r="18" fill="#f5efdf"/><path d="M0-12V0l9 4" fill="none" stroke="#69563f" stroke-width="2"/><circle r="2" fill="#69563f"/></g>')
# wall peg rail, hanging tote on left corner
line(P(2,35,170),P(2,85,170),'#987b56',4)
for v in [42,63,79]:ellipse(*P(4,v,168),2,3,'#5f4c36')
poly([P(6,39,150),P(6,56,150),P(6,56,121),P(6,39,121)],'#a0ac91','#7f8d70')
# small front book crate
box(63,266,45,24,22,'#b79b73','#c4aa81','#947957')
for i,c in enumerate(['#b58473','#7d9185','#dbcaac','#8d92a2']):box(68+i*8,267,6,19,25,c,c,c,z=5)
parts.append('</svg>')
svg=''.join(parts)
p=Path('room.html')
s=p.read_text(encoding='utf-8')
import re
s=re.sub(r'<svg\s+class="iso-room-art"[\s\S]*?</svg>',svg,s,count=1)
p.write_text(s,encoding='utf-8')
