#!/usr/bin/env python3
"""Generate every app icon from assets/app-icon.png (requires Pillow)."""
from pathlib import Path
import base64
import io
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / 'assets/app-icon.png').convert('RGB')
public = root / 'public'
for size in (16, 32, 48, 180, 192, 512, 1024):
    source.resize((size, size), Image.Resampling.LANCZOS).save(public / f'icon-{size}.png', optimize=True)
master = source.resize((1024, 1024), Image.Resampling.LANCZOS)
master.save(root / 'ios/WritingStudio/Assets.xcassets/AppIcon.appiconset/icon-1024.png', optimize=True)
master.save(public / 'favicon.ico', sizes=[(16,16), (32,32), (48,48)])
master.save(public / 'icon.webp', quality=95)
master.save(root / 'assets/app-icon.icns')
# Preserve the existing SVG URL. The supplied artwork is raster, not vector art.
# Embed the 192px rendering so the wrapper stays small (it is only a fallback URL).
buffer = io.BytesIO()
source.resize((192, 192), Image.Resampling.LANCZOS).save(buffer, format='PNG', optimize=True)
encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
(public / 'icon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><image width="1024" height="1024" href="data:image/png;base64,{encoded}"/></svg>\n')
print('Generated web, home-screen, iOS and macOS icons from assets/app-icon.png')
