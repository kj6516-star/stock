import sys
from pykrx import stock
import pandas as pd
import datetime

# 출력 인코딩 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def diagnose():
    date_str = "20260226" # 최근 영업일
    print(f"--- [Detailed Diagnosis: {date_str}] ---")
    
    try:
        print("\n1. Testing get_market_ohlcv")
        df = stock.get_market_ohlcv(date_str, market="KOSPI")
        print(f"Shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        if not df.empty:
            print(f"First 5 index: {df.index[:5].tolist()}")
            print(f"First row: \n{df.iloc[0]}")
            
        print("\n2. Testing get_market_fundamental")
        df_f = stock.get_market_fundamental(date_str, market="KOSPI")
        print(f"Shape: {df_f.shape}")
        print(f"Columns: {df_f.columns.tolist()}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnose()
