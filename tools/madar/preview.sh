# preview.sh pages(e.g. 1-4) res
cd ~/mag; rm -f /tmp/pv-*.png; pdftoppm -r ${2:-50} -f ${1%-*} -l ${1#*-} -png issue/madar-001.pdf /tmp/pv
python3 -c "
from PIL import Image;import glob
fs=sorted(glob.glob('/tmp/pv-*.png'));ims=[Image.open(f) for f in fs];w,h=ims[0].size
n=len(ims);m=Image.new('RGB',(w*min(n,4)+10*(min(n,4)-1),h*((n+3)//4)),'#888')
for i,im in enumerate(ims): m.paste(im,((i%4)*(w+10),(i//4)*h))
m.save('/tmp/claude-0/-home-user/ee82ad44-089b-5bae-9f84-5e3836d8527b/scratchpad/pv.png')"
