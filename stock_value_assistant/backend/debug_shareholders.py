import os
import sys
from dotenv import load_dotenv
import OpenDartReader
import pandas as pd

# backend 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv()
DART_API_KEY = os.getenv("DART_API_KEY")
dart = OpenDartReader(DART_API_KEY)

def debug_shareholders(ticker):
    print(f"\n--- [Debugging Shareholders for {ticker}] ---")
    
    keywords = ['최대주주', '주주'] # '주요주주'는 위 에러 메시지에 없었음
    for kw in keywords:
        print(f"\n[Method B: report('{kw}')]")
        try:
            df = dart.report(ticker, kw, 2024)
            if df is not None:
                print(f"Columns: {df.columns.tolist()}")
                if not df.empty:
                    # 데이터 샘플 출력 (컬럼명 유동적일 수 있음)
                    print(df.head(3))
        except Exception as e: print(f"Error for {kw}: {e}")

if __name__ == "__main__":
    if not DART_API_KEY:
        print("DART_API_KEY가 설정되지 않았습니다.")
    else:
        # 삼성전자와 다른 종목 하나 더 테스트
        debug_shareholders("005930")
        debug_shareholders("000660") # SK하이닉스
