from pathlib import Path
import json
root=Path('recommendations')
skip={'history.md','today.md','鸿蒙元服务开发学习指南.md'}
def read_text(p):
    for enc in ('utf-8','utf-8-sig','gb18030','gbk'):
        try:
            return p.read_text(encoding=enc)
        except Exception:
            pass
    return p.read_text(encoding='utf-8', errors='ignore')
data=[]
for p in root.glob('*.md'):
    if p.name in skip:
        continue
    text=read_text(p)
    data.append({'name':p.name,'lines':len(text.splitlines())})
short=sorted([x for x in data if x['lines']<200], key=lambda x:(x['lines'],x['name']))
Path('_tmp_shortest_task_utf8.json').write_text(json.dumps({'short_count':len(short),'shortest':short[:50]}, ensure_ascii=False, indent=2), encoding='utf-8')
print(short[0]['name'] if short else 'NO_SHORT')
print(short[0]['lines'] if short else 0)
