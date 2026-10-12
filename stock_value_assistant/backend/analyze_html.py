from bs4 import BeautifulSoup

with open("debug_naver.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

print("--- Potential News Titles (Text > 10 chars) ---")
for a in soup.find_all("a", href=True):
    text = a.get_text(strip=True)
    if len(text) > 10 and not text.startswith("http"):
        print(f"Text: '{text}'")
        print(f"Href: {a['href'][:60]}...")
        print(f"Classes: {a.get('class')}")
        parent_bx = a.find_parent("li", class_="bx") or a.find_parent("div", class_="news_wrap")
        if parent_bx:
             print(f"Found inside bx/news_wrap: {parent_bx.get('class')}")
        print("-" * 30)

# Also check for news_contents div
for div in soup.find_all("div", class_=lambda x: x and "news_contents" in x):
    print(f"Found news_contents: {div.get_class()}")
    title = div.select_one(".news_tit")
    if title:
        print(f"Title: {title.get_text(strip=True)}")
