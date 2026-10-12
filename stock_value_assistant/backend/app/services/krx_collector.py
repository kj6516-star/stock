import os
import requests
import pandas as pd
import math
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pykrx import stock
from cachetools import TTLCache, cached  # [추가됨] 캐시 라이브러리 임포트

# 환경 변수 로드
load_dotenv()
DART_API_KEY = os.getenv("DART_API_KEY")
KRX_ID = os.getenv("KRX_ID")
KRX_PW = os.getenv("KRX_PW")

# KRX 세션 및 로그인 로직
_session = requests.Session()

# [추가됨] 캐시 설정 (최대 30개 날짜/결과 보관, 유지 시간 30분 = 1800초)
market_cache = TTLCache(maxsize=30, ttl=1800)

def login_krx(login_id: str, login_pw: str) -> bool:
    """
    KRX data.krx.co.kr 로그인 후 세션 쿠키(JSESSIONID)를 갱신합니다.
    """
    if not login_id or not login_pw or login_id == "your_krx_id":
        print("WARNING: [Collector] KRX 계정 정보가 설정되지 않았습니다. (.env 확인 필요)")
        return False

    _LOGIN_PAGE = "https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001.cmd"
    _LOGIN_JSP  = "https://data.krx.co.kr/contents/MDC/COMS/client/view/login.jsp?site=mdc"
    _LOGIN_URL  = "https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001D1.cmd"
    _UA = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    )

    try:
        # 초기 세션 발급
        _session.get(_LOGIN_PAGE, headers={"User-Agent": _UA}, timeout=15)
        _session.get(_LOGIN_JSP, headers={"User-Agent": _UA, "Referer": _LOGIN_PAGE}, timeout=15)

        payload = {
            "mbrNm": "", "telNo": "", "di": "", "certType": "",
            "mbrId": login_id, "pw": login_pw,
        }
        headers = {"User-Agent": _UA, "Referer": _LOGIN_PAGE}

        # 로그인 POST
        resp = _session.post(_LOGIN_URL, data=payload, headers=headers, timeout=15)
        data = resp.json()
        error_code = data.get("_error_code", "")

        # CD011 중복 로그인 처리
        if error_code == "CD011":
            payload["skipDup"] = "Y"
            resp = _session.post(_LOGIN_URL, data=payload, headers=headers, timeout=15)
            data = resp.json()
            error_code = data.get("_error_code", "")

        success = (error_code == "CD001")
        if success:
            print("INFO: [Collector] KRX 로그인 성공")
        else:
            print(f"ERROR: [Collector] KRX 로그인 실패: {data.get('_error_msg', '알 수 없는 오류')}")
        return success
    except Exception as e:
        print(f"ERROR: [Collector] KRX 로그인 중 예외 발생: {e}")
        return False

# 초기 로그인 시도 및 pykrx Monkeypatch
if KRX_ID and KRX_PW:
    login_krx(KRX_ID, KRX_PW)
    
    # pykrx가 내부적으로 사용하는 requests를 인증된 세션으로 교체
    try:
        import pykrx.website.comm.webio as webio
        webio.requests = _session
        print("INFO: [Collector] pykrx에 인증된 세션(Monkeypatch) 적용 완료")
    except Exception as e:
        print(f"WARNING: [Collector] pykrx Monkeypatch 실패: {e}")

def sanitize_value(val, default=None):
    """NaN, inf 또는 JSON 지원하지 않는 값을 처리합니다."""
    if val is None:
        return default
    try:
        f_val = float(val)
        if math.isfinite(f_val):
            return f_val
        return default
    except (ValueError, TypeError):
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return default
        return val

def get_valid_date(target_date: str):
    """특정 날짜가 휴장일일 경우 가장 가까운 과거 영업일을 반환합니다."""
    curr = datetime.strptime(target_date, "%Y%m%d")
    for _ in range(10):
        date_str = curr.strftime("%Y%m%d")
        try:
            df = stock.get_market_ohlcv(date_str, market="KOSPI")
            if not df.empty and df['거래량'].sum() > 0:
                return date_str
        except:
            pass
        curr -= timedelta(days=1)
    return target_date

def get_latest_valid_date():
    """가장 최근의 유효한 영업일을 반환합니다."""
    today_str = datetime.now().strftime("%Y%m%d")
    return get_valid_date(today_str)

# [수정됨] 날짜(date_str) 인자가 포함되어 있으므로, cachetools가 날짜별로 각각 결과를 캐싱합니다.
@cached(cache=market_cache)
def filter_top_momentum_stocks(date_str: str):
    """상한가(29.5% 이상) 또는 거래량 1,000만 주 이상 종목 필터링 및 사유 표시"""
    if not date_str:
        date_str = get_latest_valid_date()
    else:
        date_str = get_valid_date(date_str)
        
    print(f"DEBUG: [KRX Service] 필터링 시작 (캐시 확인 또는 외부 API 호출) - 날짜: {date_str}")
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
            df_kospi = stock.get_market_ohlcv_by_ticker(date_str, market="KOSPI")
            df_kosdaq = stock.get_market_ohlcv_by_ticker(date_str, market="KOSDAQ")
            
            # 시가총액 데이터 수집
            df_kospi_cap = stock.get_market_cap_by_ticker(date_str, market="KOSPI")
            df_kosdaq_cap = stock.get_market_cap_by_ticker(date_str, market="KOSDAQ")
            df_cap = pd.concat([df_kospi_cap, df_kosdaq_cap])

            # 펀더멘털 데이터 수집 (PER, PBR, EPS, BPS, DIV)
            df_kospi_fund = stock.get_market_fundamental_by_ticker(date_str, market="KOSPI")
            df_kosdaq_fund = stock.get_market_fundamental_by_ticker(date_str, market="KOSDAQ")
            df_fund = pd.concat([df_kospi_fund, df_kosdaq_fund])
        finally:
            pd.DataFrame.__getitem__ = orig_getitem

        if df_kospi.empty and df_kosdaq.empty:
            print(f"WARNING: [KRX Service] {date_str} 시장 데이터가 없습니다.")
            return []

        df = pd.concat([df_kospi, df_kosdaq])
        
        actual_cols = df.columns.tolist()
        new_cols = ['open', 'high', 'low', 'close', 'volume', 'amount', 'change_rate']
        
        mapping = {}
        for i, name in enumerate(new_cols):
            if i < len(actual_cols):
                mapping[actual_cols[i]] = name
        
        df = df.rename(columns=mapping)
        
        filtered = df[(df['change_rate'] >= 29.5) | (df['volume'] >= 10000000)].copy()
        
        results = []
        for ticker, row in filtered.iterrows():
            name = stock.get_market_ticker_name(ticker)
            market = "KOSPI" if ticker in df_kospi.index else "KOSDAQ"
            
            is_limit_price = row['change_rate'] >= 29.5
            is_high_volume = row['volume'] >= 10000000
            
            reason_list = []
            if is_limit_price:
                reason_list.append("상한가")
            if is_high_volume:
                reason_list.append("거래량 폭증")
            
            reason = " & ".join(reason_list)

            # 티커별 시가총액 추출
            market_cap = 0
            try:
                if ticker in df_cap.index:
                    val = df_cap.loc[ticker, '시가총액']
                    if isinstance(val, pd.Series):
                        val = val.iloc[0]
                    market_cap = int(val)
            except:
                pass

            # 티커별 PER, PBR, EPS, BPS, 배당수익률 추출 및 소수점 자리 정리
            per, pbr, eps, bps, dividend_yield = 'N/A', '0.0', 'N/A', 'N/A', 0
            try:
                if ticker in df_fund.index:
                    fund_row = df_fund.loc[ticker]
                    if isinstance(fund_row, pd.DataFrame):
                        fund_row = fund_row.iloc[0]
                    
                    per = sanitize_value(fund_row.get('PER'), 'N/A')
                    if per != 'N/A': per = round(per, 2)
                    
                    pbr = sanitize_value(fund_row.get('PBR'), '0.0')
                    if pbr != '0.0': pbr = round(pbr, 2)
                    
                    eps = sanitize_value(fund_row.get('EPS'), 'N/A')
                    bps = sanitize_value(fund_row.get('BPS'), 'N/A')
                    
                    dividend_yield = sanitize_value(fund_row.get('DIV'), 0)
                    dividend_yield = round(dividend_yield, 2)
            except:
                pass

            results.append({
                "ticker": ticker,
                "name": name,
                "market": market,
                "close": int(row['close']),
                "change_rate": round(sanitize_value(row['change_rate'], 0.0), 2),
                "volume": int(row['volume']),
                "market_cap": market_cap,
                "reason": reason,
                "per": per,
                "pbr": pbr,
                "eps": eps,
                "bps": bps,
                "dividend_yield": dividend_yield
            })
        
        print(f"DEBUG: [KRX Service] 필터링 완료 - 검색된 종목 수: {len(results)}")
        return results
    except Exception as e:
        print(f"ERROR: [KRX Service] 필터링 중 오류 발생: {e}")
        return []