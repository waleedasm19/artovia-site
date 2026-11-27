import re,json,io,sys,os,qrcode,qrcode.image.svg,asyncio
D=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.expanduser('~/mag/issue')
import glob
src='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>المدار</title><link rel="stylesheet" href="style.css"></head><body>'+''.join(open(f,encoding='utf8').read() for f in sorted(glob.glob(f'{D}/pages/p*.html')))+'</body></html>'
CP=f'{D}/img/credits.json' if os.path.exists(f'{D}/img/credits.json') else os.path.expanduser('~/mag/img/credits.json')
cr=json.load(open(CP))
def credit(m):
    k=m.group(1); c=cr.get(k)
    if not c: return '<span class="cr">image: '+k+'</span>'
    OV={'sn-gemini.jpg':'International Gemini Observatory/NOIRLab/NSF/AURA','sn-beforeafter.jpg':'Dark Energy Survey/DOE/FNAL/DECam/CTIO/NOIRLab/NSF/AURA','sn-decam.jpg':'CTIO/NOIRLab/NSF/AURA','geminids.jpg':'KPNO/NOIRLab/NSF/AURA/R. Sparks','earth-hayabusa.jpg':'JAXA','ngc1433-webb.jpg':'NASA, ESA, CSA, STScI, J. Lee, T. Williams, PHANGS','percy.jpg':'NASA/JPL-Caltech/MSSS'}
    LV={'percy.jpg':'Public domain'}
    a=OV.get(k) or c['author'].split('\n')[0]
    a=re.sub(r'\s+',' ',a).strip()
    c=dict(c); c['license']=LV.get(k,c['license'])
    a=re.sub(r'Acknowledgments?:.*','',a).strip()
    return f'<span class="cr">{a} · {c["license"].strip()} · Wikimedia Commons</span>'
def qr(m):
    q=qrcode.QRCode(border=1,box_size=10,error_correction=qrcode.constants.ERROR_CORRECT_M);q.add_data(m.group(1));q.make()
    mat=q.get_matrix();n=len(mat)
    rects=''.join(f'<rect x="{x}" y="{y}" width="1.02" height="1.02"/>' for y,row in enumerate(mat) for x,v in enumerate(row) if v)
    return f'<svg viewBox="0 0 {n} {n}" xmlns="http://www.w3.org/2000/svg"><rect width="{n}" height="{n}" fill="#fff"/><g fill="#2B2218">{rects}</g></svg>'
out=re.sub(r'\{\{cr:([^}]+)\}\}',credit,src)
out=re.sub(r'\{\{qr:([^}]+)\}\}',qr,out)
out=out if os.path.exists(f'{D}/img') else out.replace('src="img/','src="../img/')
open(f'{D}/out.html','w',encoding='utf8').write(out)
import subprocess
pdf=sys.argv[2] if len(sys.argv)>2 else f'{D}/madar.pdf'
subprocess.run(['node',os.path.join(os.path.dirname(os.path.abspath(__file__)),'render.js'),D+'/out.html',pdf],check=True)
print('ok')
