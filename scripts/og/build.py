#!/usr/bin/env python3
# Builds the static Open Graph share image source (og.html) for the site.
# Design = the "minimal / centered" composition: oniku mark + meatup2026
# wordmark + date, on the warm cream background. Reuses the REAL brand assets so
# the share image never drifts from the site:
#   - display font  : src/app/fonts/righteous-latin.woff2 (same as the wordmark)
#   - mascot        : public/oniku.svg (the shared 2018/2019 brand mark)
#   - color tokens  : globals.css @theme (cream / meat / ink-soft)
#
# Output is og.html (this dir). Render it to public/og.png at 1200x630:
#   python3 scripts/og/build.py
#   npx playwright screenshot --viewport-size=1200,630 \
#       "file://$PWD/scripts/og/og.html" public/og.png
# (any 1200x630 headless screenshot works; the page is exactly 1200x630.)
import base64
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent

font_b64 = base64.b64encode(
    (REPO / "src/app/fonts/righteous-latin.woff2").read_bytes()
).decode()
oniku = (REPO / "public/oniku.svg").read_text()
oniku = oniku.replace('width="500px" height="500px"', 'width="150" height="150"', 1)

html = (
    "<!doctype html><html><head><meta charset='utf-8'><style>"
    "@font-face{font-family:'Righteous';"
    "src:url(data:font/woff2;base64," + font_b64 + ") format('woff2');"
    "font-weight:400;font-display:block;}"
    ":root{--meat:#b33d44;--ink:#1d1411;--ink-soft:#6f615a;--cream:#fff7ef;}"
    "*{margin:0;padding:0;box-sizing:border-box;}"
    "html,body{width:1200px;height:630px;overflow:hidden;}"
    "body{font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',"
    "system-ui,sans-serif;}"
    ".disp{font-family:'Righteous',system-ui,sans-serif;}"
    ".pill{display:inline-block;background:var(--meat);color:#fff;"
    "border-radius:999px;transform:rotate(-2deg);"
    "box-shadow:0 8px 24px rgba(126,0,29,.18);}"
    "</style></head><body>"
    "<div style='width:1200px;height:630px;background:var(--cream);position:relative;'>"
    "<div style='position:absolute;inset:0;display:flex;flex-direction:column;"
    "align-items:center;justify-content:center;'>"
    + oniku +
    "<div class='disp' style='font-size:118px;line-height:.9;letter-spacing:.02em;"
    "color:var(--ink);margin-top:14px;'>meat<span style='color:var(--meat);'>up</span></div>"
    "<div class='disp pill' style='font-size:38px;padding:1px 28px;margin-top:14px;'>2026</div>"
    "<div style='width:64px;height:3px;background:var(--meat);border-radius:2px;"
    "margin-top:40px;opacity:.85;'></div>"
    "<div class='disp' style='font-size:30px;letter-spacing:.18em;color:var(--ink-soft);"
    "margin-top:26px;'>2026.07.25&nbsp;&nbsp;SAT</div>"
    "</div></div></body></html>"
)

out = HERE / "og.html"
out.write_text(html)
print("wrote", out)
