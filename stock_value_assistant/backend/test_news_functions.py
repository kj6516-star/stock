import requests
import os
import sys

# Ensure UTF-8 output for terminal
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.services.collector import get_news_list, get_news_content

def test_news_functions():
    query = "삼성전자"
    print(f"--- Testing get_news_list with query: {query} ---")
    news_list = get_news_list(query)
    
    # If 0 results, capture HTML to debug
    if not news_list:
        print("0 results. Capturing HTML for debug...")
        from bs4 import BeautifulSoup
        encoded_query = requests.utils.quote(query)
        url = f"https://search.naver.com/search.naver?where=news&query={encoded_query}&sm=tab_opt&sort=0&photo=0&field=0&pd=1&ds=&de=&docid=&related=0&mynews=0&office_type=0&office_section_code=0&news_office_checked=&nso=so%3Ar%2Cp%3A1w"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers)
        with open("debug_naver.html", "w", encoding="utf-8") as f:
            f.write(resp.text)
        print("HTML saved to debug_naver.html")
        return

    print(f"Total news items found: {len(news_list)}")
    for i, news in enumerate(news_list[:3]):
        print(f"[{i+1}] {news['title']}")
        print(f"    Press: {news['press']}, Date: {news['date']}, Naver: {news['is_naver_news']}")

    # Test content extraction
    # Naver News link usually contains /article/
    naver_news_articles = [n for n in news_list if n['is_naver_news'] and '/article/' in n['link']]
    
    test_url = None
    if naver_news_articles:
        test_url = naver_news_articles[0]['link']
    else:
        test_url = "https://n.news.naver.com/mnews/article/001/0015908189?sid=101" # Backup valid Naver news link

    if test_url: # Only proceed if we have a URL to test
        print(f"\n--- Testing get_news_content with URL: {test_url} ---")
        content = get_news_content(test_url)
        print(f"Content Length: {len(content)}")
        print("Snippet:", content[:200] + "...")

if __name__ == "__main__":
    test_news_functions()
