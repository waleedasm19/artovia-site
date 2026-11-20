import numpy as np
from PIL import Image, ImageFilter
W,H=2480,3508
rng=np.random.default_rng(7)
y,x=np.mgrid[0:H,0:W].astype(np.float32)
# background gradient: deep night blue to violet
bg=np.zeros((H,W,3),np.float32)
t=y/H
bg[...,0]=6+20*t; bg[...,1]=10+8*t; bg[...,2]=28+30*(1-abs(t-0.45)*1.6).clip(0)
# nebula noise (fractal by summing blurred random fields)
def field(scale,seed):
    r=np.random.default_rng(seed).random((H//scale+2,W//scale+2)).astype(np.float32)
    im=Image.fromarray((r*255).astype(np.uint8)).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(scale*0.6))
    return np.asarray(im,np.float32)/255
n=0.5*field(220,1)+0.3*field(90,2)+0.2*field(35,3)
n=(n-n.min())/(n.max()-n.min());neb=np.clip((n-0.45)*2.2,0,1)**1.6
bg+=neb[...,None]*np.array([70,25,90])*0.9
n2=0.6*field(160,4)+0.4*field(60,5);n2=(n2-n2.min())/(n2.max()-n2.min())
bg+=np.clip((n2-0.55)*2.5,0,1)[...,None]**1.5*np.array([20,60,80])
# galaxy: barred spiral, centred
cx,cy=W*0.5,H*0.47
dx,dy=(x-cx),(y-cy)
ang=np.deg2rad(-28)
u=dx*np.cos(ang)-dy*np.sin(ang); v=(dx*np.sin(ang)+dy*np.cos(ang))/0.62
r=np.sqrt(u*u+v*v)+1e-3; th=np.arctan2(v,u)
k=1/260.
arms=np.cos(2*(th-np.log(r/90)/0.55))  # log spiral 2 arms
armmask=np.clip(arms,0,1)**1.6*np.exp(-r/650)*(r>180)
disk=np.exp(-r/420)
bar=np.exp(-(u/430)**2-(v/80)**2)
core=np.exp(-(r/70)**2)
ring=np.exp(-((r-260)/40)**2)*0.6
dust=np.clip(np.cos(2*(th-np.log(r/90)/0.55)-0.5),0,1)**6*np.exp(-r/600)*(r>150)
grain=field(14,9)*0.5+0.6
lum=(0.35*disk+0.9*armmask*grain+0.6*bar+1.6*core+ring*grain)
col=np.stack([lum*255*1.0,lum*235*0.95,lum*210*0.95],-1)
# blue star-forming knots along arms
knots=np.clip((field(9,11)-0.6)*5,0,1)*armmask*1.8
col+=knots[...,None]*np.array([90,140,255])
col*=(1-0.55*dust)[...,None]
img=bg+col
# stars
ns=5200
sx=rng.integers(0,W,ns); sy=rng.integers(0,H,ns); sb=rng.random(ns)**8
star=np.zeros((H,W),np.float32); np.add.at(star,(sy,sx),sb*600+30)
sim=Image.fromarray(np.clip(star,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
st=np.asarray(sim,np.float32)*2.2
img+=st[...,None]*np.array([1,0.97,0.92])
# supernova on arm, with glow and spikes
px,py=cx-600,cy-250
d=np.sqrt((x-px)**2+(y-py)**2)
glow=1400*np.exp(-(d/18)**2)+260*np.exp(-d/60)+90*np.exp(-d/260)
sp=np.exp(-np.abs(x-px)/3.5)*np.exp(-np.abs(y-py)/230)+np.exp(-np.abs(y-py)/3.5)*np.exp(-np.abs(x-px)/230)
glow+=300*sp
img+=glow[...,None]*np.array([1.0,0.88,0.62])
# soft vignette
vig=1-0.55*(((x-W/2)/(W*0.75))**2+((y-H/2)/(H*0.7))**2)
img*=vig[...,None]
img=255*(1-np.exp(-img/200))  # tonemap
Image.fromarray(np.clip(img,0,255).astype(np.uint8)).save('/root/mag/issue/art/cover-art.jpg',quality=92)
