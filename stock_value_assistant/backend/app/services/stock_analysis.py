# 예시: 삼성전자(005930 / corp_code: 00126380) 분석 실행 흐름
from app.services.krx_collector import get_stock_krx_detail
from app.services.dart_service import get_dart_financial_and_disclosures
from app.services.collector import get_latest_news_content_for_stock
from app.services.analyzer import analyze_stock_with_gemini

def run_full_stock_analysis(ticker: str, corp_code: str, stock_name: str):
    print(f"=== [{stock_name}] 데이터 수집 및 AI 분석 파이프라인 시작 ===")
    
    # 1. KRX 데이터 수집
    krx_res = get_stock_krx_detail(ticker)
    if "error" in krx_res:
        return f"KRX 데이터 수집 실패: {krx_res['error']}"
        
    # 2. DART 재무/공시 데이터 수집
    dart_res = get_dart_financial_and_disclosures(corp_code)
    
    # 3. 최신 뉴스 및 본문 수집
    news_res = get_latest_news_content_for_stock(stock_name)
    
    # 4. Gemini AI 분석 수행
    ai_report = analyze_stock_with_gemini(krx_res, dart_res, news_res)
    
    return ai_report