import os
from google import genai
from google.genai import types
# system_prompts.py 에 정의된 프롬프트 불러오기 (구조에 맞게 임포트 경로 조정)
from app.prompts.system_prompts import STOCK_ANALYSIS_SYSTEM_PROMPT # 예시 프롬프트명

def analyze_stock_with_gemini(
    krx_detail: dict, 
    dart_data: dict, 
    news_data: dict
) -> str:
    """
    수집된 KRX 상세 데이터, DART 재무/공시 데이터, 최신 뉴스 본문을 
    Gemini API로 전달하여 전문적인 주식 분석 보고서를 생성합니다.
    """
    # 1. API 키 로드 (환경 변수 GEMINI_API_KEY 또는 GOOGLE_API_KEY 사용)
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return "ERROR: GEMINI_API_KEY 또는 GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다."

    # 2. 최신 google-genai 클라이언트 초기화
    client = genai.Client(api_key=api_key)

    # 3. 수집된 데이터를 AI가 이해하기 쉽도록 하나의 프롬프트 컨텍스트(문맥)로 통합
    stock_name = krx_detail.get("name", "알 수 없음")
    ticker = krx_detail.get("ticker", "알 수 없음")
    
    # 💡 파이썬 3.10 버전 호환: f-string 내부의 '\n' 사용을 방지하기 위해 밖에서 미리 가공합니다.
    disclosures_list = dart_data.get('disclosures', ['공시 없음'])
    disclosures_text = '\n'.join(('- ' + d) for d in disclosures_list)
    
    user_prompt = f"""
[분석 대상 종목 정보]
- 종목명: {stock_name} ({ticker})
- 시장구분: {krx_detail.get('market')}
- 기준일자: {krx_detail.get('date')}

1. [KRX 시장 및 펀더멘털 데이터]
- 종가: {krx_detail.get('close')}원 (등락률: {krx_detail.get('change_rate')}%)
- 시가 / 고가 / 저가: {krx_detail.get('open')} / {krx_detail.get('high')} / {krx_detail.get('low')}
- 거래량: {krx_detail.get('volume'):,}주 / 거래대금: {krx_detail.get('amount'):,}원
- 시가총액: {krx_detail.get('market_cap'):,}원
- 펀더멘털: PER {krx_detail.get('per')}, PBR {krx_detail.get('pbr')}, EPS {krx_detail.get('eps')}, BPS {krx_detail.get('bps')}
- 특이사항 판정: {krx_detail.get('reason')}

2. [DART 재무제표 및 최근 공시 요약]
- 대상 기간: {dart_data.get('period_info')}
- 주요 재무:
  * 매출액: {dart_data.get('financial', {}).get('revenue')}
  * 영업이익: {dart_data.get('financial', {}).get('operating_income')}
  * 당기순이익: {dart_data.get('financial', {}).get('net_income')}
  * 부채비율: {dart_data.get('financial', {}).get('debt_ratio')}
- 최근 3개월 주요 공시 목록:
{disclosures_text}

3. [최신 뉴스 및 특징주 본문 정보]
- 기사 제목: {news_data.get('title')}
- 언론사 / 날짜: {news_data.get('press')} | {news_data.get('date')}
- 관련 링크: {news_data.get('link')}
- 기사 본문 전문:
{news_data.get('content')}

위 데이터를 바탕으로 시스템 프롬프트의 지침에 따라 종합적인 주식 분석 보고서를 작성해 주세요.
"""

    try:
        print("\n" + "="*60)
        print("🤖 [DEBUG] Gemini AI로 전달되는 최종 프롬프트 및 데이터 구조:")
        print("="*60)
        print(user_prompt)
        print("="*60 + "\n")
        # 4. Gemini 모델 호출
        response = client.models.generate_content(
            model='gemini-3.5-flash-lite',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=STOCK_ANALYSIS_SYSTEM_PROMPT,  # system_prompts.py에서 정의한 프롬프트 주입
                temperature=0.3,  # 금융 분석의 객관성을 위해 낮은 온도 설정
            ),
        )
        return response.text

    except Exception as e:
        return f"ERROR: Gemini API 호출 중 오류가 발생했습니다: {str(e)}"