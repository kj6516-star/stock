import sys
from pykrx import stock
import pandas as pd

# 출력 인코딩 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def diagnose_pykrx():
    import datetime
    curr = datetime.datetime.now()
    for _ in range(10):
        d = curr.strftime("%Y%m%d")
        print(f"\n--- [Testing Date: {d}] ---")
        try:
            ohlcv = stock.get_market_ohlcv(d, market="KOSPI")
            if ohlcv.empty:
                print(f"OHLCV: Empty")
            else:
                print(f"OHLCV - Shape: {ohlcv.shape}, Sum Volume: {ohlcv['거래량'].sum() if '거래량' in ohlcv else 'N/A'}")
            
            funda = stock.get_market_fundamental(d, market="KOSPI")
            if funda.empty:
                print(f"Funda: Empty")
            else:
                print(f"Funda - Shape: {funda.shape}, Columns: {funda.columns.tolist()[:3]}...")
        except Exception as e:
            print(f"Error on {d}: {e}")
        curr -= datetime.timedelta(days=1)

if __name__ == "__main__":
    diagnose_pykrx()
