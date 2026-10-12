import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import math
import re
from cachetools import TTLCache, cached  # [추가됨] 캐시 라이브러리 임포트

# [추가됨] 캐시 설정 (최대 200개 보관, 유지 시간 10분 = 600초)
news_list_cache = TTLCache(maxsize=200, ttl=600)
news_content_cache = TTLCache(maxsize=500, ttl=1800)

# [수정됨] query, start_date, end_date 조합을 기준으로 캐싱합니다.
@cached(cache=news_list_cache)
def get_news_list(query: str, start_date: str = None, end_date: str = None):
    """
    네이버 뉴스에서 뉴스 검색 결과를 수집합니다.
    start_date, end_date가 있으면 해당 기간(YYYYMMDD)으로 검색하고, 
    없으면 최근 7일(1w)로 검색합니다.
    """
    print(f"DEBUG: [Collector] 뉴스 검색 시작 (캐시 미스) - 쿼리: {query}, 기간: {start_date}~{end_date}")
    try:
        encoded_query = requests.utils.quote(query)
        
        # 기본값: 최근 1주일
        pd_val = "1" # pd=1: 1주일
        nso = "so:r,p:1w"
        ds_val = ""
        de_val = ""
        
        # 특정 날짜 범위가 주어진 경우
        if start_date and end_date:
            pd_val = "3" # pd=3: 직접 입력
            nso = f"so:r,p:from{start_date}to{end_date}"
            ds_val = f"{start_date[:4]}.{start_date[4:6]}.{start_date[6:]}"
            de_val = f"{end_date[:4]}.{end_date[4:6]}.{end_date[6:]}"
        
        url = f"https://search.naver.com/search.naver?where=news&query={encoded_query}&sm=tab_opt&sort=0&photo=0&field=0&pd={pd_val}&ds={ds_val}&de={de_val}&docid=&related=0&mynews=0&office_type=0&office_section_code=0&news_office_checked=&nso={nso}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.naver.com",
        }
        
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 1. 뉴스 아이템 후보들 수집
        news_items = soup.select('ul.list_news > li.bx') or \
                     soup.select('div.news_wrap') or \
                     soup.select('div.news_contents') or \
                     soup.select('.news_contents') or \
                     soup.select('li[id^="sp_nws"]')
        
        results = []
        
        # 만약 컨테이너가 없으면 모든 링크를 돌며 기사 링크 찾기
        if not news_items:
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True)
                if (10 < len(text) < 100) and ('article' in href or 'view' in href or 'news.naver.com' in href):
                    if '/article/' not in href and 'news.naver.com' in href and 'Promotion' in href:
                         continue # 프로모션 링크 제외
                    
                    parent = a.find_parent(['li', 'div'], class_=lambda x: x and ('bx' in x or 'wrap' in x or 'contents' in x or 'sds-comps' in x))
                    if parent:
                        news_items.append(parent)
            news_items = list(dict.fromkeys(news_items)) if news_items else []

        for item in news_items:
            try:
                title_tag = item.select_one('a.news_tit') or \
                            item.select_one('.news_tit') or \
                            item.select_one('a[class*="tit"]')
                
                if not title_tag:
                    links = [a for a in item.find_all('a', href=True) if len(a.get_text(strip=True)) > 5]
                    naver_links = [l for l in links if 'news.naver.com' in l['href']]
                    if naver_links:
                        title_tag = naver_links[0]
                    elif links:
                        good_links = [l for l in links if 15 <= len(l.get_text(strip=True)) <= 100]
                        if good_links:
                            title_tag = good_links[0]
                        else:
                            title_tag = max(links, key=lambda x: len(x.get_text(strip=True)))

                if not title_tag: continue
                
                for blind in title_tag.select('.blind, span[class*="blind"]'):
                    blind.decompose()
                
                raw_title = title_tag.get_text(strip=True)
                title = raw_title.split('\n')[0].strip()
                title = title.replace("새 창 열림", "").strip()
                
                if len(title) > 120:
                    title = title[:120] + "..."
                
                link = title_tag['href']
                
                if title == '이미지' or 'Promotion' in link or '/static/' in link: continue
                if len(title) < 5: continue
                
                press = "알 수 없음"
                date_text = "-"
                
                press_tag = item.select_one('.info.press') or \
                            item.select_one('.press') or \
                            item.select_one('.info_press') or \
                            item.select_one('a[class*="press"]') or \
                            item.select_one('span[class*="press"]') or \
                            item.select_one('.info_source') or \
                            item.select_one('.info_group a')
                
                if press_tag:
                    press = press_tag.get_text(strip=True).replace('언론사 선정', '').strip()
                
                all_text_elements = item.select('.info') or item.select('span') or item.select('div[class*="text"]')
                for el in all_text_elements:
                    t = el.get_text(strip=True)
                    if not t: continue
                    
                    is_date = False
                    if any(p in t for p in ['분 전', '시간 전', '일 전', '주 전', '방금']):
                        is_date = True
                    elif '.' in t and 8 <= len(t) <= 12 and t.replace('.', '').strip().isdigit():
                        is_date = True
                    
                    if is_date:
                        if not date_text or date_text == "-":
                            date_text = t
                        continue
                    
                    if press == "알 수 없음" and 2 <= len(t) <= 15:
                        if not any(p in t for p in ['전', '방금', '이미지', '뉴스', '보기', '선정']):
                             press = t

                results.append({
                    "title": title,
                    "link": link,
                    "press": press,
                    "date": date_text,
                    "is_naver_news": "news.naver.com" in link or "n.news.naver.com" in link
                })
            except Exception:
                continue
                
        final_results = []
        seen_links = set()
        for r in results:
            if r['link'] not in seen_links:
                final_results.append(r)
                seen_links.add(r['link'])
        
        final_results.sort(key=lambda x: x['is_naver_news'], reverse=True)
        print(f"DEBUG: [Collector] 뉴스 검색 완료 - 결과 수: {len(final_results)}")
        return final_results[:10]
    except Exception as e:
        print(f"ERROR: [Collector] 뉴스 검색 중 오류 발생: {e}")
        return []


# [수정됨] URL을 기준으로 본문 내용을 메모리에 캐싱합니다.
@cached(cache=news_content_cache)
def get_news_content(url: str):
    """특정 뉴스 URL의 본문 텍스트를 추출합니다."""
    print(f"DEBUG: [Collector] 뉴스 본문 크롤링 시작 (캐시 미스) - URL: {url}")
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.naver.com",
        }
        
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        content = ""
        if "news.naver.com" in url:
            article = soup.select_one('#dic_area') or \
                      soup.select_one('#newsct_article') or \
                      soup.select_one('#articeBody') or \
                      soup.select_one('#contents')
            
            if article:
                unwanted_selectors = [
                    '.byline', '.article_footer', '.img_desc', 'script', 'style', 
                    '.vod_area', '.go_view_link', '.recommend_news', '.office_header',
                    '.copyright', '.footer', '.comment', '.u_cbox', '.u_likeit',
                    '.social_group', '.top_banner', '.end_btn_group', '.article_bottom',
                    '#copyright', '#header', '#footer', '.office_header', '.end_btn_group'
                ]
                for selector in unwanted_selectors:
                    for tag in article.select(selector):
                        tag.decompose()
                
                for tag in article.find_all(class_=re.compile(r'end_btn|social_group|byline|copyright|img_desc', re.I)):
                    tag.decompose()
                
                content = article.get_text('\n', strip=True)
        else:
            for junk in soup(['nav', 'header', 'footer', 'aside', 'script', 'style', 'iframe']):
                junk.decompose()
            
            candidates = []
            article_tag = soup.find('article')
            if article_tag and len(article_tag.get_text(strip=True)) > 200:
                 candidates.append(article_tag)
            
            item_body = soup.find(attrs={"itemprop": "articleBody"})
            if item_body: candidates.append(item_body)
            
            pattern = re.compile(r'article_body|articleBody|post-content|news_content|content_area|article_view|view_content', re.I)
            for div in soup.find_all(['div', 'section'], class_=pattern) + soup.find_all(['div', 'section'], id=pattern):
                if len(div.get_text(strip=True)) > 100:
                    candidates.append(div)
            
            if candidates:
                best_candidate = max(candidates, key=lambda x: len(x.get_text(strip=True)))
                
                for noisy_pattern in ['ad-', 'sidebar', 'comment', 'footer', 'banner', 'related', 'nav', 'header']:
                    for tag in best_candidate.find_all(class_=re.compile(noisy_pattern, re.I)):
                        tag.decompose()
                    for tag in best_candidate.find_all(id=re.compile(noisy_pattern, re.I)):
                        tag.decompose()
                
                text_content = best_candidate.get_text(strip=True)
                link_content = "".join([a.get_text(strip=True) for a in best_candidate.find_all('a')])
                if len(text_content) > 0 and (len(link_content) / len(text_content)) > 0.5:
                    candidates.remove(best_candidate)
                    if candidates:
                        best_candidate = max(candidates, key=lambda x: len(x.get_text(strip=True)))
                
                content = best_candidate.get_text('\n', strip=True)
            else:
                body = soup.find('body')
                if body:
                    content = body.get_text('\n', strip=True)

        if content:
            lines = [line.strip() for line in content.split('\n') if len(line.strip()) > 10]
            content = '\n\n'.join(lines)

        if not content or len(content) < 50:
            return "본문을 추출할 수 없는 기사입니다. (외부 링크 또는 지원되지 않는 형식)"
            
        print(f"DEBUG: [Collector] 뉴스 본문 추출 완료")
        return content
    except Exception as e:
        print(f"ERROR: [Collector] 뉴스 본문 크롤링 중 오류 발생: {e}")
        return f"기사 내용을 가져오지 못했습니다: {str(e)}"

