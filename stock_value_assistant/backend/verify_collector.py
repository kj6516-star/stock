import sys
import os
from datetime import datetime

# backend 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.collector import get_financial_data, get_latest_valid_date, get_valid_date
from pykrx import stock

# 출력 인코딩 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_actual_logic():
    ticker = "005930" # 삼성전자
    market = "KOSPI"
    
    print("=== [1] 최신 영업일 조회 테스트 ===")
    latest_date = get_latest_valid_date()
    print(f"최신 영업일: {latest_date}")
    
    print("\n=== [2] get_financial_data 호출 테스트 ===")
    try:
        data = get_financial_data(ticker, market, latest_date)
        print("수집된 데이터 요약:")
        print(f"시가총액: {data.get('market_cap')}")
        print(f"PER: {data.get('per')}")
        print(f"PBR: {data.get('pbr')}")
        print(f"배당수익률: {data.get('dividend_yield')}")
        
        # 상세 데이터 존재 여부
        detailed = data.get('dart_detailed', {})
        print(f"재무제표 데이터 수: {len(detailed.get('financial_3yr', []))}개년")
    except Exception as e:
        print(f"오류 발생: {e}")

    print("\n=== [3] pykrx 직접 호출 (컬럼 검증) ===")
    try:
        df = stock.get_market_fundamental(latest_date, market=market)
        print(f"반환된 DataFrame 컬럼: {df.columns.tolist()}")
        if ticker in df.index:
            print(f"삼성전자 데이터 로우:\n{df.loc[ticker]}")
        else:
            print("티커가 인덱스에 존재하지 않습니다.")
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    test_actual_logic()
