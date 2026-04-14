from pathlib import Path
for p in Path('recommendations').glob('*.md'):
    if p.stem == '坚毅':
        print(p)
        break
else:
    print('NOT_FOUND')
