from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pprint import pprint
from typing import Optional

from app.services.collect import (
    get_stock_krx_detail,
    get_dart_financial_and_disclosures,
    get_latest_news_content_for_stock
)
from app.services.analyzer import analyze_stock_with_gemini

router = APIRouter(tags=["AI Analysis"])

class AiReportRequest(BaseModel):
    ticker: str
    corp_code: str
    stock_name: str
    date_str: Optional[str] = None  # 프론트에서 넘어온 기준일

@router.post("/report")
def generate_ai_report_endpoint(req: AiReportRequest):
    try:
        # print(f"INFO: [AI Endpoint] '{req.stock_name}({req.ticker})' 분석 요청 수신 (기준일: {req.date_str or '최신'})")

        # 👇 [수정 포인트] get_stock_krx_detail에 date_str=req.date_str를 반드시 넘겨주어야 합니다!
        krx_data = get_stock_krx_detail(req.ticker, date_str=req.date_str)
        
        
        if not krx_data or "error" in krx_data:
            raise HTTPException(status_code=400, detail=f"KRX 데이터 수집 실패: {krx_data.get('error', '알 수 없는 오류')}")

        # 2. DART 데이터 수집 후 확인
        dart_data = get_dart_financial_and_disclosures(req.corp_code)
        print("\n--- [DEBUG] DART 수집 데이터 ---")
        pprint(dart_data)

        # 3. 뉴스 데이터 수집 후 확인
        news_data = get_latest_news_content_for_stock(req.stock_name)
        # print("\n--- [DEBUG] 뉴스 수집 데이터 ---")
        # pprint(news_data)

        # 4. AI 분석 실행
        ai_report_text = analyze_stock_with_gemini(krx_data, dart_data, news_data)

        if ai_report_text.startswith("ERROR:"):
            raise HTTPException(status_code=500, detail=ai_report_text)

        return {
            "status": "success",
            "ticker": req.ticker,
            "stock_name": req.stock_name,
            "report": ai_report_text
        }

    except Exception as e:
        print(f"ERROR: [AI Endpoint] 처리 중 예외 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))