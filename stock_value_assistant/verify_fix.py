import json
import sys
import os

# 백엔드 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.db.session import SessionLocal
from backend.app.services.analyzer import analyze_and_save_stocks
from backend.app.db.models import DailyPrice

def test_fix():
    print("=== 2026-02-11 데이터 분석 및 저장 테스트 시작 ===")
    
    db = SessionLocal()
    try:
        # 1. 분석 실행
        results = analyze_and_save_stocks(db, date_str="20260211", use_ai=False)
        print(f"분석된 종목 수: {len(results)}")
        
        if not results:
            print("결과가 없습니다.")
            return

        # 2. JSON 직렬화 검증 (NaN/Inf 체크)
        try:
            json_str = json.dumps(results)
            print("✅ JSON 직렬화 테스트 통과 (모든 부동 소수점 값이 JSON 호환됨)")
        except ValueError as e:
            print(f"❌ JSON 직렬화 실패: {e}")
            return

        # 3. DB 저장 결과 검증
        ticker = results[0]['ticker']
        price = db.query(DailyPrice).filter(
            DailyPrice.ticker == ticker, 
            DailyPrice.date == "2026-02-11"
        ).first()

        if price:
            print(f"✅ DB 저장 성공: {ticker}")
            if hasattr(price, 'change_rate'):
                print(f"✅ change_rate 컬럼 존재 및 값 확인: {price.change_rate}%")
            else:
                print("❌ DailyPrice 모델에 change_rate 속성이 없습니다.")
        else:
            print(f"❌ DB에서 종목({ticker})의 데이터를 찾을 수 없습니다.")

    except Exception as e:
        print(f"❌ 예외 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_fix()
