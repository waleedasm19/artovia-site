# Procedural original planet textures for the Artovia site hero (no external imagery).
import numpy as np
from PIL import Image, ImageFilter
W,H=2048,1024
rng=np.random.default_rng(1448)
lon=(np.arange(W)+.5)/W*2*np.pi-np.pi
lat=np.pi/2-(np.arange(H)+.5)/H*np.pi
LON,LAT=np.meshgrid(lon,lat)
X=np.cos(LAT)*np.cos(LON);Y=np.cos(LAT)*np.sin(LON);Z=np.sin(LAT)
P=256;perm=rng.permutation(P);perm=np.concatenate([perm,perm]);grad=rng.normal(size=(P,3));grad/=np.linalg.norm(grad,axis=1)[:,None]
def fade(t):return t*t*t*(t*(t*6-15)+10)
def perlin(x,y,z):
    xi=np.floor(x).astype(int);yi=np.floor(y).astype(int);zi=np.floor(z).astype(int)
    xf=x-xi;yf=y-yi;zf=z-zi;xi&=255;yi&=255;zi&=255
    u,v,w=fade(xf),fade(yf),fade(zf)
    def g(ix,iy,iz,dx,dy,dz):
        h=perm[perm[perm[ix]+iy]+iz];gr=grad[h];return gr[...,0]*dx+gr[...,1]*dy+gr[...,2]*dz
    n000=g(xi,yi,zi,xf,yf,zf);n100=g(xi+1,yi,zi,xf-1,yf,zf)
    n010=g(xi,yi+1,zi,xf,yf-1,zf);n110=g(xi+1,yi+1,zi,xf-1,yf-1,zf)
    n001=g(xi,yi,zi+1,xf,yf,zf-1);n101=g(xi+1,yi,zi+1,xf-1,yf,zf-1)
    n011=g(xi,yi+1,zi+1,xf,yf-1,zf-1);n111=g(xi+1,yi+1,zi+1,xf-1,yf-1,zf-1)
    l=lambda a,b,t:a+t*(b-a)
    return l(l(l(n000,n100,u),l(n010,n110,u),v),l(l(n001,n101,u),l(n011,n111,u),v),w)
def fbm(s,oct,off=0,warp=None):
    x,y,z=X*s+off,Y*s+off*1.3,Z*s-off
    if warp is not None:x=x+warp;y=y+warp*.7
    t=np.zeros_like(X);a=1;tot=0
    for i in range(oct):t+=a*perlin(x*2**i,y*2**i,z*2**i);tot+=a;a*=.5
    return t/tot
w=fbm(1.2,4,7)*2.2
h=fbm(1.6,8,0,w)
h=h+0.08*(np.abs(LAT)>1.25)
sea=np.quantile(h,0.62)
land=h>sea
hn=np.clip((h-sea)/(h.max()-sea),0,1)
dn=np.clip((sea-h)/(sea-h.min()),0,1)
img=np.zeros((H,W,3))
deep=np.array([6,22,48]);shallow=np.array([18,78,112])
ocean=shallow+(deep-shallow)*dn[...,None]**.6
moist=fbm(2.5,5,31)
g1=np.array([52,98,64]);g2=np.array([120,112,70]);g3=np.array([150,120,82]);mt=np.array([110,96,84])
lc=g1+(g2-g1)*np.clip(moist[...,None]*-3+.5,0,1)
lc=lc+(g3-lc)*np.clip(hn[...,None]*2.5-.6,0,1)
lc=lc+(mt-lc)*np.clip(hn[...,None]*3-1.6,0,1)
ice=np.clip((np.abs(LAT)-1.22+fbm(4,4,57)*0.35)*5,0,1)[...,None]+np.clip(hn[...,None]*4-3.2,0,1)
img=np.where(land[...,None],lc,ocean)
img=img+(np.array([235,240,245])-img)*np.clip(ice,0,1)
# shading via height gradient
gy,gx=np.gradient(h);shade=np.clip(1+(gx-gy)*40,0.75,1.25)
img=np.where(land[...,None],img*shade[...,None],img)
Image.fromarray(np.clip(img,0,255).astype(np.uint8)).save('day.jpg',quality=90)
# clouds
c=fbm(3,7,91,fbm(1.5,3,13)*1.5)
c=np.clip((c+0.06)*2.6,0,1)**1.3
Image.fromarray((c*255).astype(np.uint8)).save('clouds.png',optimize=True)
# night lights: sparse warm points on land near coasts, in identity gold
lights=np.zeros((H,W))
coast=np.clip(1-hn*6,0,1)*land*(np.abs(LAT)<1.1)
pts=rng.random((H,W))<0.012*coast*np.clip(fbm(6,3,5)*4+.6,0,1)
lights[pts]=1
L=Image.fromarray((lights*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
la=np.array(L).astype(float);la=np.clip(la*3.5,0,255)
night=np.stack([la,la*0.78,la*0.32],-1)
Image.fromarray(night.astype(np.uint8)).save('night.jpg',quality=88)
# specular: ocean mask
Image.fromarray(((~land)*255).astype(np.uint8)).save('spec.png',optimize=True)
