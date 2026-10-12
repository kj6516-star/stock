from fastapi import APIRouter, HTTPException
from app.services.dart_service import get_dart_detailed_data

router = APIRouter(tags=["Stock Detail"])

@router.get("/{ticker}")
def get_stock_detail(ticker: str):
    """
    특정 종목의 DART 상세 재무 정보만 조회합니다. (Lazy Loading)
    """
    try:
        dart_data = get_dart_detailed_data(ticker)
        if not dart_data:
            raise HTTPException(status_code=404, detail="해당 종목의 재무 정보를 찾을 수 없습니다.")

        return {
            "status": "success",
            "ticker": ticker,
            "dart_info": dart_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상세 정보 조회 중 오류 발생: {str(e)}")