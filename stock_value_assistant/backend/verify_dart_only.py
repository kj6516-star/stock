import os
import sys
from dotenv import load_dotenv

# backend 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.collector import get_dart_detailed_data

load_dotenv()

def test_dart_shareholders():
    ticker = "005930" # 삼성전자
    print(f"=== [DART Detailed Data Test: {ticker}] ===")
    try:
        detailed = get_dart_detailed_data(ticker)
        
        # 지분 정보 확인
        shareholders = detailed.get("shareholders", [])
        print(f"수집된 주요주주 수: {len(shareholders)}")
        for i, sh in enumerate(shareholders):
            print(f" {i+1}. {sh['name']} | 지분율: {sh['rate']}% | 관계: {sh['relate']}")
            
        # 재무 데이터 확인 (샘플)
        fin = detailed.get("financial_3yr", [])
        if fin:
            print(f"수집된 재무 데이터: {fin[0]['year']}년 (매출: {fin[0].get('revenue', 0):,})")
            
    except Exception as e:
        print(f"예외 발생: {e}")

if __name__ == "__main__":
    test_dart_shareholders()
