from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import market, detail, news, ai_router  # 👈 ai_router로 임포트했고
from app.db.session import engine
from app.db import models

app = FastAPI(title="Stock Value Assistant API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB 테이블 생성
models.Base.metadata.create_all(bind=engine)

# API 라우터 등록 (각각의 prefix 부여)
app.include_router(market.router, prefix="/api/analysis", tags=["Market"])
app.include_router(detail.router, prefix="/api/stocks", tags=["Stock Detail"])
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["AI Analysis"])  # 👈 여기를 ai_router.router로 변경!

@app.get("/")
def read_root():
    return {"message": "Welcome to Stock Value Assistant API"}