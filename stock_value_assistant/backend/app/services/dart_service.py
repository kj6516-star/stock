import os
import math
import opendartreader
from dotenv import load_dotenv
from cachetools import TTLCache, cached  # [추가됨] 캐시 라이브러리 임포트

load_dotenv()
DART_API_KEY = os.getenv("DART_API_KEY")
KRX_ID = os.getenv("KRX_ID")
KRX_PW = os.getenv("KRX_PW")

dart = opendartreader(DART_API_KEY) if DART_API_KEY else None

# [추가됨] DART 캐시 설정 (최대 100개 종목 보관, 유지 시간 30분 = 1800초)
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

# [수정됨] ticker를 기준으로 cachetools가 결과를 메모리에 캐싱합니다.
@cached(cache=dart_cache)
def get_dart_detailed_data(ticker: str):
    """
    특정 종목의 DART 상세 정보(기업 개황, 재무제표, 주요주주, 공시, 임직원/배당)를 수집합니다.
    """
    if not dart:
        return {"error": "DART API Key가 설정되지 않았습니다."}
    
    print(f"DEBUG: [DART Service] API 호출 발생 (캐시 미스) - 종목코드: {ticker}")
    try:
        # 1. 기업 개황 정보
        company_info = dart.company(ticker)
        
        # 2. 재무제표 구조화 (연간 + 최신 분기/반기)
        financials = {
            "annual": {},
            "quarterly": {}
        }
        
        # [A] 연간 사업보고서 (2022~2025)
        for year in ["2022", "2023", "2024", "2025"]:
            try:
                fs_annual = dart.finstate(ticker, int(year), reprt_code='11011')
                if fs_annual is not None and not fs_annual.empty:
                    financials["annual"][year] = fs_annual.to_dict(orient="records")
            except Exception as e:
                print(f"WARN: {year}년 연간 재무제표 조회 실패: {e}")

        # [B] 최신 분기/반기 재무제표
        quarter_codes = {
            "2026_1Q": "11013",
            "2026_2Q": "11012",
            "2026_3Q": "11014"
        }
        
        for q_key, reprt_code in quarter_codes.items():
            year = int(q_key.split("_")[0])
            try:
                fs_q = dart.finstate(ticker, year, reprt_code=reprt_code)
                if fs_q is not None and not fs_q.empty:
                    financials["quarterly"][q_key] = fs_q.to_dict(orient="records")
            except Exception as e:
                print(f"INFO: {q_key} 재무제표 미공시 또는 조회 실패: {e}")

        # 3. 주요주주 현황
        major_shareholders = []
        try:
            sh = dart.major_shareholders(ticker)
            if sh is not None and not sh.empty:
                records = sh.to_dict(orient="records")
                
                latest_dict = {}
                for item in records:
                    name = item.get("repror") or item.get("nm") or "기타"
                    rcept_dt = item.get("rcept_dt", "")
                    
                    if name not in latest_dict:
                        latest_dict[name] = item
                    else:
                        if rcept_dt > latest_dict[name].get("rcept_dt", ""):
                            latest_dict[name] = item
                
                def get_stkrt(x):
                    try:
                        return float(str(x.get("stkrt", 0)).replace(",", ""))
                    except:
                        return 0.0

                sorted_shareholders = sorted(list(latest_dict.values()), key=get_stkrt, reverse=True)
                major_shareholders = sorted_shareholders[:3] # Top 3만 추출
                
        except Exception as e:
            print(f"WARN: 주주 현황 조회 실패: {e}")

        # 4. 최근 공시 정보 (공시 검색)
        disclosures = []
        try:
            ds = dart.list(ticker)
            if ds is not None and not ds.empty:
                disclosures = ds.head(10).to_dict(orient="records") # 최근 10개 공시
        except Exception as e:
            print(f"WARN: 최근 공시 조회 실패: {e}")

        # 5. 임직원 및 배당 정보 (최근 사업연도 2025 기준)
        employee_dividend = {
            "avg_salary": "-",
            "avg_service": "-",
            "div_per_share": "-"
        }
        
        try:
            target_year = 2025
            
            # (1) 직원 정보 조회
            emp = dart.report(ticker, '직원', target_year, reprt_code='11011')
            if emp is not None and not emp.empty:
                for _, row in emp.iterrows():
                    salary = row.get("jan_salary_am") or row.get("fyer_salary_totamt") or row.get("1인당평균급여액")
                    service = row.get("avrg_cnwk_sdytrn") or row.get("평균근속연수")
                    
                    if salary:
                        employee_dividend["avg_salary"] = salary
                    if service:
                        employee_dividend["avg_service"] = service
                        break

            # (2) 배당 정보 조회
            div = dart.report(ticker, '배당', target_year, reprt_code='11011')
            if div is not None and not div.empty:
                for _, row in div.iterrows():
                    se = str(row.get("se", ""))
                    if "주당" in se or "현금배당금" in se:
                        dps = row.get("thstrm") or row.get("당기")
                        if dps:
                            employee_dividend["div_per_share"] = dps
                            break
                            
        except Exception as e:
            print(f"WARN: 임직원/배당 정보 조회 실패: {e}")

        # 최종 데이터 묶음
        raw_data = {
            "company_info": company_info,
            "financials": financials,
            "지분구조": major_shareholders,
            "최근공시": disclosures,
            "인력및배당": employee_dividend
        }
        
        # NaN/Inf 정제 후 반환
        return clean_data(raw_data)
        
    except Exception as e:
        print(f"ERROR: DART 상세 데이터 수집 실패 ({ticker}): {e}")
        return None