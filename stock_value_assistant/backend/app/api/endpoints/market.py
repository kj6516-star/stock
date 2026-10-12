from fastapi import APIRouter, Query
from typing import Optional
from app.services.krx_collector import filter_top_momentum_stocks

router = APIRouter()

@router.get("/stocks", tags=["Market"])
def get_market_stocks(date: Optional[str] = Query(None, description="조회일자 (YYYYMMDD), 미입력시 최근 영업일 자동 보정")):
    """
    상한가(29.5% 이상) 또는 거래량 폭증(1천만 주 이상) 종목을 개수 제한 없이 조회합니다.
    (메인 화면 리스트업 전용 - 가볍고 빠르게 동작)
    """
    stocks = filter_top_momentum_stocks(date)
    return {
        "status": "success",
        "count": len(stocks),
        "data": stocks
    }