import pandas as pd
import opendartreader
import os
import requests
import math
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pykrx import stock
from app.services.news_service import get_news_list, get_news_content
from app.services.krx_collector import get_latest_valid_date, get_valid_date, sanitize_value
from cachetools import TTLCache, cached

load_dotenv()
DART_API_KEY = os.getenv("DART_API_KEY")
dart = opendartreader(DART_API_KEY) if DART_API_KEY else None

def get_stock_krx_detail(ticker: str, date_str: str = None) -> dict:
    """
    특정 종목 코드(ticker)를 받아 해당 영업일의 
    KRX OHLCV, 시가총액, 펀더멘털(PER, PBR, EPS, BPS)을 단건으로 조회하여 반환합니다.
    """
    # 티커 6자리 문자열로 보정
    ticker = str(ticker).strip().zfill(6)

    if not date_str:
        date_str = get_latest_valid_date()
    else:
        date_str = get_valid_date(date_str)
        
    print(f"DEBUG: [KRX Detail] 종목({ticker}) 데이터 조회 - 날짜: {date_str}")
    
    try:
        orig_getitem = pd.DataFrame.__getitem__
        def patched_getitem(self, key):
            try: return orig_getitem(self, key)
            except:
                if isinstance(key, list) and '시가' in key:
                    return self.iloc[:, :7]
                raise
        
        pd.DataFrame.__getitem__ = patched_getitem
        try:
            # 1. 해당 날짜 전체 종목 OHLCV 및 등락률 수집
            df_kospi = stock.get_market_ohlcv_by_ticker(date_str, market="KOSPI")
            df_kosdaq = stock.get_market_ohlcv_by_ticker(date_str, market="KOSDAQ")
            df_all = pd.concat([df_kospi, df_kosdaq])
            
            # 2. 시가총액 수집
            df_kospi_cap = stock.get_market_cap_by_ticker(date_str, market="KOSPI")
            df_kosdaq_cap = stock.get_market_cap_by_ticker(date_str, market="KOSDAQ")
            df_cap = pd.concat([df_kospi_cap, df_kosdaq_cap])

            # 3. 펀더멘털(PER, PBR, EPS, BPS 등) 수집
            df_kospi_fund = stock.get_market_fundamental_by_ticker(date_str, market="KOSPI")
            df_kosdaq_fund = stock.get_market_fundamental_by_ticker(date_str, market="KOSDAQ")
            df_fund = pd.concat([df_kospi_fund, df_kosdaq_fund])
        finally:
            pd.DataFrame.__getitem__ = orig_getitem

        # 데이터가 아예 없는 경우 방어 코드
        if df_all.empty or ticker not in df_all.index:
            return {"error": f"해당 종목({ticker})의 {date_str} 시장 데이터를 찾을 수 없습니다."}

        # 👇 [핵심 수정] 잘 되는 코드와 동일하게 컬럼명을 명시적으로 매핑
        actual_cols = df_all.columns.tolist()
        new_cols = ['open', 'high', 'low', 'close', 'volume', 'amount', 'change_rate']
        mapping = {}
        for i, name in enumerate(new_cols):
            if i < len(actual_cols):
                mapping[actual_cols[i]] = name
        
        df_all = df_all.rename(columns=mapping)

        # 종목명 확인
        name = stock.get_market_ticker_name(ticker)
        market = "KOSPI" if ticker in df_kospi.index else "KOSDAQ"

        row = df_all.loc[ticker]

        # 데이터 추출 (매핑된 이름을 쓰므로 안전함)
        open_p = int(sanitize_value(row.get('open'), 0))
        high_p = int(sanitize_value(row.get('high'), 0))
        low_p = int(sanitize_value(row.get('low'), 0))
        close_p = int(sanitize_value(row.get('close'), 0))
        volume = int(sanitize_value(row.get('volume'), 0))
        amount = int(sanitize_value(row.get('amount'), 0))
        change_rate = round(float(sanitize_value(row.get('change_rate'), 0.0)), 2)

        # 시가총액 추출
        market_cap = 0
        try:
            if ticker in df_cap.index:
                val = df_cap.loc[ticker, '시가총액']
                if isinstance(val, pd.Series):
                    val = val.iloc[0]
                market_cap = int(val)
        except:
            pass

        # 펀더멘털(PER, PBR, EPS, BPS) 추출
        per, pbr, eps, bps = 'N/A', '0.0', 'N/A', 'N/A'
        try:
            if ticker in df_fund.index:
                fund_row = df_fund.loc[ticker]
                if isinstance(fund_row, pd.DataFrame):
                    fund_row = fund_row.iloc[0]
                
                per_val = sanitize_value(fund_row.get('PER'), None)
                per = round(per_val, 2) if per_val is not None else 'N/A'
                
                pbr_val = sanitize_value(fund_row.get('PBR'), None)
                pbr = round(pbr_val, 2) if pbr_val is not None else '0.0'
                
                eps = sanitize_value(fund_row.get('EPS'), 'N/A')
                bps = sanitize_value(fund_row.get('BPS'), 'N/A')
        except:
            pass

        # 상승 특징 사유 판정
        is_limit = change_rate >= 29.5
        is_high_vol = volume >= 10000000
        reasons = []
        if is_limit: reasons.append("상한가")
        if is_high_vol: reasons.append("거래량 폭증")
        reason_str = " & ".join(reasons) if reasons else "일반 변동성 종목"

        return {
            "ticker": ticker,
            "name": name,
            "market": market,
            "date": date_str,
            "open": open_p,
            "high": high_p,
            "low": low_p,
            "close": close_p,
            "volume": volume,
            "amount": amount,
            "change_rate": change_rate,
            "market_cap": market_cap,
            "per": per,
            "pbr": pbr,
            "eps": eps,
            "bps": bps,
            "reason": reason_str
        }

    except Exception as e:
        print(f"ERROR: [KRX Detail] 종목({ticker}) 조회 중 예외 발생: {e}")
        return {"error": str(e)}



from datetime import datetime, timedelta
import os
# OpenDartReader가 이미 선언되어 있거나 전역으로 임포트되어 있다고 가정합니다.
# (예: dart = OpenDartReader(DART_API_KEY))

dart_cache = TTLCache(maxsize=100, ttl=1800)

def clean_data(obj):
    """NaN, Inf 등 표준 JSON 규격에 어긋나는 float 값을 None으로 변환합니다."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
    elif isinstance(obj, dict):
        return {k: clean_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_data(v) for v in obj]
    return obj

@cached(cache=dart_cache)
def get_dart_financial_and_disclosures(target_code: str, bsns_year: str = None) -> dict:
    """
    OpenDartReader를 활용하여 특정 기업의:
    1. 전년도 연말보고서 및 분기보고서별 재무제표 (매출액, 영업이익, 순이익, 자본총계, 부채총계, 부채비율)
    2. 주요주주 현황 (지분율 기준 Top 3)
    3. 최근 주요 공시 (최근 3개)
    를 종합하여 구조화된 딕셔너리로 반환합니다.
    """
    if 'dart' not in globals() or dart is None:
        return {"error": "OpenDartReader가 초기화되지 않았거나 DART_API_KEY가 설정되지 않았습니다."}

    if not bsns_year:
        bsns_year = str(datetime.now().year - 1)

    result_data = {
        "target_code": target_code,
        "base_year": bsns_year,
        "financials": {
            "annual": {},      # 전년도 연말 (사업보고서, 11011)
            "quarterly": {}    # 분기/반기 보고서 (1Q: 11013, 2Q/반기: 11012, 3Q: 11014)
        },
        "major_shareholders": [],
        "recent_disclosures": []
    }

    # 내부 재무항목 추출 헬퍼 함수
    def extract_financial_accounts(fs_df):
        target_accounts = {
            "매출액": ["매출액", "수익(매출액)", "영업수익"],
            "영업이익": ["영업이익", "영업이익(손실)"],
            "당기순이익": ["당기순이익", "분기당기순이익", "반기당기순이익", "연결당기순이익"],
            "자산총계": ["자산총계"],
            "부채총계": ["부채총계"],
            "자본총계": ["자본총계"]
        }
        extracted = {}
        for _, row in fs_df.iterrows():
            account_nm = str(row.get("account_nm", "")).strip()
            amount = str(row.get("thstrm_amount", "0"))
            
            for key, synonyms in target_accounts.items():
                if key not in extracted and account_nm in synonyms:
                    extracted[key] = amount

        # 부채비율 자동 계산
        debt_ratio = "N/A"
        try:
            total_debt = float(extracted.get("부채총계", "0").replace(",", ""))
            total_equity = float(extracted.get("자본총계", "0").replace(",", ""))
            if total_equity > 0:
                debt_ratio = f"{round((total_debt / total_equity) * 100, 2)}%"
        except:
            pass

        return {
            "revenue": extracted.get("매출액", "정보 없음"),
            "operating_income": extracted.get("영업이익", "정보 없음"),
            "net_income": extracted.get("당기순이익", "정보 없음"),
            "total_assets": extracted.get("자산총계", "정보 없음"),
            "total_debt": extracted.get("부채총계", "정보 없음"),
            "total_equity": extracted.get("자본총계", "정보 없음"),
            "debt_ratio": debt_ratio
        }

    # 1. 재무제표 수집 (연말보고서 + 분기/반기보고서)
    report_targets = {
        "annual_report": ("11011", bsns_year),      # 연말 사업보고서
        "1Q": ("11013", bsns_year),                # 1분기보고서
        "2Q": ("11012", bsns_year),                # 반기보고서
        "3Q": ("11014", bsns_year)                 # 3분기보고서
    }

    for label, (reprt_code, year_str) in report_targets.items():
        try:
            fs_df = None
            # 연결재무제표(CFS) 시도
            try:
                fs_df = dart.finstate(target_code, int(year_str), reprt_code=reprt_code, fs_div="CFS")
            except:
                pass
            
            # 실패 시 개별재무제표(OFS)로 방어
            if fs_df is None or fs_df.empty:
                fs_df = dart.finstate(target_code, int(year_str), reprt_code=reprt_code, fs_div="OFS")

            if fs_df is not None and not fs_df.empty:
                fin_summary = extract_financial_accounts(fs_df)
                if label == "annual_report":
                    result_data["financials"]["annual"][year_str] = fin_summary
                else:
                    result_data["financials"]["quarterly"][f"{year_str}_{label}"] = fin_summary
        except Exception as e:
            print(f"INFO: {year_str}년 {label} 재무제표 조회 생략 또는 실패: {e}")

    # 2. 주요주주 현황 수집 (Top 3)
    try:
        sh = dart.major_shareholders(target_code)
        if sh is not None and not sh.empty:
            records = sh.to_dict(orient="records")
            latest_dict = {}
            for item in records:
                name = item.get("repror") or item.get("nm") or "기타"
                rcept_dt = item.get("rcept_dt", "")
                if name not in latest_dict or rcept_dt > latest_dict[name].get("rcept_dt", ""):
                    latest_dict[name] = item
            
            def get_stkrt(x):
                try:
                    return float(str(x.get("stkrt", 0)).replace(",", ""))
                except:
                    return 0.0

            sorted_shareholders = sorted(list(latest_dict.values()), key=get_stkrt, reverse=True)
            result_data["major_shareholders"] = sorted_shareholders[:3]
    except Exception as e:
        print(f"WARN: 주요주주 현황 조회 실패: {e}")

    # 3. 최근 주요 공시 수집 (최근 3개)
    try:
        ds = dart.list(target_code)
        if ds is not None and not ds.empty:
            disclosures = []
            for _, row in ds.head(3).iterrows():
                disclosures.append({
                    "rcept_dt": row.get("rcept_dt"),
                    "report_nm": row.get("report_nm"),
                    "dart_url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={row.get('rcept_no')}" if row.get('rcept_no') else None
                })
            result_data["recent_disclosures"] = disclosures
    except Exception as e:
        print(f"WARN: 최근 공시 조회 실패: {e}")

    # NaN / Inf 정제 후 반환
    return clean_data(result_data)
def get_latest_news_content_for_stock(stock_name: str, start_date: str = None, end_date: str = None) -> dict:
    """
    주신 get_news_list와 get_news_content 함수를 결합하여,
    특정 종목의 가장 최신 뉴스 1건의 제목, 언론사, 날짜, URL, 그리고 노이즈가 제거된 본문 전문을 반환합니다.
    """
    search_query = f"{stock_name} 특징주"
    print(f"DEBUG: [Collector] '{stock_name}' 최신 뉴스 본문 추출 파이프라인 가동 (검색어: {search_query})")
    
    # 1. 주신 캐시 적용 뉴스 검색 함수 호출 (최신순 정렬)
    news_list = get_news_list(query=search_query, start_date=start_date, end_date=end_date)
    
    if not news_list:
        print(f"WARNING: [Collector] '{stock_name}' 관련 검색된 뉴스가 없습니다.")
        return {
            "title": "관련 뉴스 없음",
            "press": "N/A",
            "date": "N/A",
            "link": "",
            "content": "검색된 관련 뉴스가 없습니다."
        }
    
    # 2. 검색 결과 목록 중 가장 첫 번째(가장 최신) 기사 선택
    latest_news = news_list[0]
    target_url = latest_news.get("link")
    
    print(f"DEBUG: [Collector] 최신 기사 확정 -> 제목: {latest_news.get('title')}, URL: {target_url}")
    
    # 3. 주신 캐시 적용 본문 크롤링 함수 호출 (정규식 및 셀렉터 필터링 적용)
    article_content = get_news_content(target_url)
    
    # 4. 결과 통합 반환
    return {
        "title": latest_news.get("title"),
        "press": latest_news.get("press"),
        "date": latest_news.get("date"),
        "link": target_url,
        "content": article_content,
        "is_naver_news": latest_news.get("is_naver_news", False)
    }

