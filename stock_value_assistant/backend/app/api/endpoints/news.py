from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.services.news_service import get_news_list, get_news_content

router = APIRouter()

class NewsContentRequest(BaseModel):
    url: str

@router.get("")
def read_news(query: str, analysisDate: Optional[str] = None):
    """
    종목명으로 뉴스 리스트를 가져옵니다.
    analysisDate가 있으면 전후 1주일을 검색 범위로 설정하고 키워드를 확장합니다.
    """
    start_date = None
    end_date = None
    expanded_query = query
    
    if analysisDate:
        try:
            clean_date = analysisDate.replace('-', '')
            base_dt = datetime.strptime(clean_date, "%Y%m%d")
            
            start_date = (base_dt - timedelta(days=7)).strftime("%Y%m%d")
            end_date = (base_dt + timedelta(days=1)).strftime("%Y%m%d")
            
            expanded_query = f'+{query} +("특징주" | "분석")'
        except Exception as e:
            print(f"ERROR: [News Router] 날짜 파싱 실패: {e}")
            
    news_items = get_news_list(expanded_query, start_date=start_date, end_date=end_date)
    return news_items

@router.post("/content")
def read_news_content(req: NewsContentRequest):
    """뉴스 URL로 본문 텍스트를 가져옵니다."""
    content = get_news_content(req.url)
    return {"content": content}