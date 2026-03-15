#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'screenshots' / 'ui-parity'
OUT.mkdir(parents=True, exist_ok=True)

W = 1440
BG = '#f4f1ea'
RED = '#7b1113'
GOLD = '#c7a55b'
TEXT = '#1f1f1f'
MUTED = '#666666'
BORDER = '#d7d2c8'
NOTE = '#f8f7f3'
BADGE = '#eee4d3'

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def f(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def screen(h=1500):
    img = Image.new('RGB', (W, h), BG)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 86), fill=RED)
    d.rectangle((0, 82, W, 86), fill=GOLD)
    d.text((50, 24), 'ColumbiaGames Rewrite', fill='white', font=f(28, True))
    nav = 'Products   Cart (3)   Checkout   Library   Login'
    d.text((840, 30), nav, fill='white', font=f(18))
    return img, d


def panel(d, x, y, w, h):
    d.rounded_rectangle((x, y, x + w, y + h), radius=6, fill='white', outline=BORDER, width=1)


def note(d, x, y, w, h):
    d.rounded_rectangle((x, y, x + w, y + h), radius=4, fill=NOTE, outline='#ddd5c8', width=1)


def badge(d, x, y, text, fill=BADGE, color='#614500'):
    tw = d.textlength(text, font=f(14))
    d.rounded_rectangle((x, y, x + tw + 24, y + 30), radius=15, fill=fill)
    d.text((x + 12, y + 7), text, fill=color, font=f(14))
    return x + tw + 36


def button(d, x, y, text, secondary=False):
    tw = d.textlength(text, font=f(16, not secondary))
    if secondary:
        d.rounded_rectangle((x, y, x + tw + 28, y + 38), radius=4, fill='white', outline=RED, width=1)
        d.text((x + 14, y + 9), text, fill=RED, font=f(16))
    else:
        d.rounded_rectangle((x, y, x + tw + 28, y + 38), radius=4, fill=RED, outline=RED, width=1)
        d.text((x + 14, y + 9), text, fill='white', font=f(16, True))
    return x + tw + 40


def save(img, name):
    img.save(OUT / f'{name}.png')


# login
img, d = screen(1100)
panel(d, 360, 170, 720, 520)
d.text((410, 220), 'Login', fill=TEXT, font=f(34, True))
d.text((410, 270), 'Legacy-compatible sign in tied to the secure account area.', fill=MUTED, font=f(18))
badge(d, 855, 220, 'Guest session')
d.text((410, 350), 'Email', fill=TEXT, font=f(16))
d.rounded_rectangle((410, 378, 1030, 430), radius=4, fill='white', outline='#c7c1b7')
d.text((426, 393), 'fixture-library@example.invalid', fill=TEXT, font=f(18))
d.text((410, 465), 'Password', fill=TEXT, font=f(16))
d.rounded_rectangle((410, 493, 1030, 545), radius=4, fill='white', outline='#c7c1b7')
d.text((426, 508), '••••••••••', fill=TEXT, font=f(18))
x = button(d, 410, 585, 'Login')
button(d, x, 585, 'Refresh session', secondary=True)
note(d, 410, 645, 620, 70)
d.text((430, 670), 'No authenticated customer session yet.', fill=MUTED, font=f(18))
save(img, 'login')

# product list
img, d = screen(1400)
panel(d, 55, 135, 1330, 245)
d.text((90, 175), 'Products', fill=TEXT, font=f(34, True))
d.text((90, 225), 'Catalog-first storefront with category browsing and add-to-cart actions.', fill=MUTED, font=f(18))
button(d, 1180, 175, 'Refresh list', secondary=True)
for x, label, value, w in [(90, 'Search', 'harn', 500), (620, 'Category', 'Rulebooks', 250), (900, 'Sub-category', 'Digital Editions', 250)]:
    d.text((x, 285), label, fill=TEXT, font=f(16))
    d.rounded_rectangle((x, 312, x + w, 364), radius=4, fill='white', outline='#c7c1b7')
    d.text((x + 14, 327), value, fill=TEXT, font=f(18))
x = button(d, 90, 405, 'Apply filters')
x = button(d, x, 405, 'Reset', secondary=True)
d.text((x, 414), '3 categories / 3 sub-categories cached', fill=MUTED, font=f(16))
xs = [55, 510, 965]
items = [
    ('Miniatures / Space Fleets', 'Atlas Carrier Fleet', 'CG-ATLAS', '$59.99', 'Physical'),
    ('Rulebooks / Digital Editions', 'Nebula Border Wars PDF', 'CG-NEBULA', '$19.99', 'Downloadable'),
    ('Board Games / Starter Sets', 'Orbit Siege Command Pack', 'CG-ORBIT', '$34.50', 'Physical'),
]
for x, item in zip(xs, items):
    panel(d, x, 420, 400, 370)
    d.text((x + 20, 450), item[0], fill=MUTED, font=f(14))
    d.text((x + 20, 480), item[1], fill=TEXT, font=f(26, True))
    d.text((x + 20, 520), item[2], fill=MUTED, font=f(16))
    d.text((x + 20, 580), item[3], fill=RED, font=f(32, True))
    badge(d, x + 20, 640, item[4])
    xx = button(d, x + 20, 705, 'Add to cart')
    button(d, xx, 705, 'View', secondary=True)
save(img, 'product-list')

# product detail
img, d = screen(1200)
panel(d, 55, 140, 1330, 880)
d.text((90, 185), 'CG-ATLAS', fill=MUTED, font=f(16))
d.text((90, 215), 'Atlas Carrier Fleet', fill=TEXT, font=f(36, True))
d.text((90, 265), 'Miniatures / Space Fleets', fill=MUTED, font=f(18))
d.text((1170, 215), '$59.99', fill=RED, font=f(36, True))
d.text((90, 330), 'Flagship starter fleet with capital ships, escorts, and printable campaign reference sheets.', fill=TEXT, font=f(20))
d.text((90, 400), 'Quantity', fill=TEXT, font=f(16))
d.rounded_rectangle((90, 428, 220, 480), radius=4, fill='white', outline='#c7c1b7')
d.text((106, 443), '1', fill=TEXT, font=f(18))
button(d, 250, 428, 'Add to cart')
note(d, 90, 520, 1240, 140)
d.text((110, 545), 'Specs', fill=TEXT, font=f(22, True))
d.multiline_text((110, 585), 'Scale: 1/3780\nMaterial: Resin + card components\nPlayers: 2+', fill=TEXT, font=f(18), spacing=6)
note(d, 90, 690, 1240, 140)
d.text((110, 715), 'Resources', fill=TEXT, font=f(22, True))
d.multiline_text((110, 755), 'Rulebook PDF\nShip cards\nScenario sheet', fill=TEXT, font=f(18), spacing=6)
x = badge(d, 90, 860, 'Physical product')
badge(d, x, 860, 'Release: 2025-11-04')
note(d, 90, 915, 1240, 80)
d.text((110, 940), 'Related products: CG-ORBIT — Orbit Siege Command Pack', fill=TEXT, font=f(18))
save(img, 'product-detail')

# cart
img, d = screen(1200)
panel(d, 55, 135, 1000, 760)
panel(d, 1080, 135, 305, 500)
d.text((90, 175), 'Cart', fill=TEXT, font=f(34, True))
d.text((90, 225), 'Storage mode: fixture-memory', fill=MUTED, font=f(18))
button(d, 890, 175, 'Refresh cart', secondary=True)
rows = [
    ('Miniatures / Space Fleets', 'Atlas Carrier Fleet', 'CG-ATLAS · Unit price: 59.99 USD', '1', '59.99 USD'),
    ('Rulebooks / Digital Editions', 'Nebula Border Wars PDF', 'CG-NEBULA · Unit price: 19.99 USD', '2', '39.98 USD'),
]
for i, row in enumerate(rows):
    y = 300 + i * 200
    d.line((90, y - 20, 1020, y - 20), fill='#ece6da', width=1)
    d.text((90, y), row[0], fill=MUTED, font=f(14))
    d.text((90, y + 28), row[1], fill=TEXT, font=f(28, True))
    d.text((90, y + 68), row[2], fill=MUTED, font=f(16))
    x = button(d, 790, y + 28, '-', secondary=True)
    d.text((x + 10, y + 37), row[3], fill=TEXT, font=f(18, True))
    button(d, x + 40, y + 28, '+', secondary=True)
    d.text((790, y + 92), row[4], fill=TEXT, font=f(20, True))
d.text((1110, 175), 'Summary', fill=TEXT, font=f(28, True))
for idx, (k, v) in enumerate([('Items','3'),('Unique products','2'),('Paid lines','2'),('Downloadable qty','2'),('Shippable subtotal','59.99 USD'),('Subtotal','99.97 USD')]):
    yy = 235 + idx * 48
    d.text((1110, yy), k, fill=TEXT, font=f(16))
    d.text((1320 - d.textlength(v, font=f(16, True)), yy), v, fill=TEXT, font=f(16, True))
button(d, 1110, 520, 'Continue to checkout')
save(img, 'cart')

# checkout
img, d = screen(1800)
panel(d, 55, 135, 1000, 300)
panel(d, 55, 460, 1000, 450)
panel(d, 55, 935, 1000, 420)
panel(d, 1080, 135, 305, 800)
d.text((90, 175), 'Checkout', fill=TEXT, font=f(34, True))
d.text((90, 225), 'Order FIXTURE-ORDER-1001 · Storage mode fixture-memory', fill=MUTED, font=f(18))
x = button(d, 650, 175, 'Reload summary', secondary=True)
x = button(d, x, 175, 'Validate checkout', secondary=True)
button(d, x, 175, 'Submit order')
note(d, 90, 270, 930, 120)
d.text((110, 292), 'Current status', fill=TEXT, font=f(22, True))
for i, line in enumerate(['Shipping required: yes', 'Payment required: yes', 'Available payment types: visa, mastercard, paypal', 'Customer points available: 180']):
    d.text((110, 325 + i * 20), line, fill=TEXT, font=f(16))
d.text((90, 410), 'Logged in as Alex Fixture (fixture-library@example.invalid)', fill=MUTED, font=f(16))
d.text((90, 500), 'Shipping', fill=TEXT, font=f(28, True))
shipping = [('Full name','Alex Fixture'),('Email','fixture-library@example.invalid'),('Phone','555-0104'),('Method','UPS Ground'),('Street','101 Demo Street'),('City','Hudson'),('State','NY'),('Zip','10001'),('Country','US')]
coords = [(90,540,430),(520,540,430),(90,635,430),(520,635,430),(90,730,860),(90,825,250),(370,825,250),(650,825,140),(820,825,130)]
for (label,val),(x,y,w) in zip(shipping, coords):
    d.text((x,y), label, fill=TEXT, font=f(16)); d.rounded_rectangle((x,y+28,x+w,y+80), radius=4, fill='white', outline='#c7c1b7'); d.text((x+14,y+43), val, fill=TEXT, font=f(18))
d.text((90, 975), 'Billing & payment', fill=TEXT, font=f(28, True))
billing = [('Billing name','Alex Fixture',430),('Payment type','Select',430),('Billing street','101 Demo Street',860),('Billing city','Hudson',250),('Billing state','NY',250),('Billing zip','10001',140),('Billing country','US',130),('Promo code','SPRING',430),('Apply points','25',430)]
positions = [(90,1015),(520,1015),(90,1110),(90,1205),(370,1205),(650,1205),(820,1205),(90,1300),(520,1300)]
for (label,val,w),(x,y) in zip(billing, positions):
    d.text((x,y), label, fill=TEXT, font=f(16)); d.rounded_rectangle((x,y+28,x+w,y+80), radius=4, fill='white', outline='#c7c1b7'); d.text((x+14,y+43), val, fill=TEXT, font=f(18))
d.text((1110, 175), 'Order preview', fill=TEXT, font=f(28, True))
for idx, (k, v) in enumerate([('Items','3'),('Subtotal','99.97 USD'),('Paid lines','2'),('Downloadable qty','2'),('Shippable subtotal','59.99 USD')]):
    yy = 235 + idx * 48; d.text((1110, yy), k, fill=TEXT, font=f(16)); d.text((1320 - d.textlength(v, font=f(16, True)), yy), v, fill=TEXT, font=f(16, True))
note(d, 1110, 450, 245, 110); d.text((1130, 475), 'Validation', fill=TEXT, font=f(20, True)); d.text((1130, 515), 'Payment type: Choose a payment', fill=TEXT, font=f(15)); d.text((1130, 535), 'type for paid orders.', fill=TEXT, font=f(15))
note(d, 1110, 590, 245, 170); d.text((1130, 615), 'Cart items', fill=TEXT, font=f(20, True)); d.text((1130, 655), 'Atlas Carrier Fleet — Qty 1', fill=TEXT, font=f(15)); d.text((1130, 675), '59.99 USD', fill=MUTED, font=f(15)); d.text((1130, 720), 'Nebula Border Wars PDF — Qty 2', fill=TEXT, font=f(15)); d.text((1130, 740), '39.98 USD', fill=MUTED, font=f(15))
save(img, 'checkout')

# library
img, d = screen(1200)
panel(d, 55, 135, 1330, 620)
d.text((90, 175), 'Digital library', fill=TEXT, font=f(34, True))
d.text((90, 225), 'Customer 1042 · 1 owned download', fill=MUTED, font=f(18))
button(d, 1180, 175, 'Reload library', secondary=True)
panel(d, 90, 290, 1260, 360)
d.text((120, 330), 'Nebula Border Wars PDF', fill=TEXT, font=f(30, True))
d.text((120, 375), 'CG-NEBULA', fill=MUTED, font=f(16))
x = badge(d, 1020, 330, 'Owned × 1')
badge(d, x, 330, 'Download file present')
for idx, (k, v) in enumerate([('Category','Rulebooks'),('Subcategory','Digital Editions'),('Filename','nebula-border-wars.pdf'),('Status','Owned'),('Release','2026-01-15')]):
    yy = 440 + idx * 34
    d.text((120, yy), k, fill=TEXT, font=f(16))
    d.text((350, yy), v, fill=TEXT, font=f(16, True))
x = button(d, 120, 580, 'View product', secondary=True)
button(d, x, 580, 'Download')
save(img, 'library')

print('Generated ui parity screenshots in', OUT)
