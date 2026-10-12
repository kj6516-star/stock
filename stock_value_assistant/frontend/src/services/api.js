const API_BASE_URL = "http://127.0.0.1:8000";

// 1. 메인 화면 모멘텀 종목 리스트 가져오기 (market.py 연동)
export async function getMarketStocks(date = "") {
    let url = `${API_BASE_URL}/api/analysis/stocks`;
    if (date) {
        const cleanDate = date.replace(/-/g, '');
        url += `?date=${cleanDate}`;
    }
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
}

// 2. 종목 상세 DART 정보 가져오기 (detail.py 연동) - fetch 방식으로 통일
export async function getStockDetail(ticker) {
    try {
        console.log(`🚀 [API 요청] DART/상세 정보 요청 중: ticker = ${ticker}`);
        const res = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const json = await res.json();
        console.log(`✅ [API 응답 성공] ticker ${ticker}:`, json);
        return json;
    } catch (error) {
        console.error(`❌ [API 요청 실패] ticker ${ticker}:`, error);
        throw error;
    }
}

// 3. 뉴스 리스트 가져오기 (news.py 연동)
export async function getNewsList(query, analysisDate = "") {
    let url = `${API_BASE_URL}/api/news?query=${encodeURIComponent(query)}`;
    if (analysisDate) url += `&analysisDate=${analysisDate}`;
    const res = await fetch(url);
    return res.json();
}

// 4. 뉴스 본문 가져오기 (news.py 연동)
export async function getNewsContent(newsUrl) {
    const res = await fetch(`${API_BASE_URL}/api/news/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newsUrl })
    });
    return res.json();
}
// 5. 실시간 AI 분석 리포트 생성하기 (ai_router.py 연동)
export async function getAiReport(ticker, corpCode, stockName, dateStr = null) {
    try {
        console.log(`🤖 [API 요청] AI 분석 리포트 생성 중: ${stockName} (${ticker}) / 기준일: ${dateStr || "최신일"}`);
        
        // 👇 [해결 포인트] '2026-10-06' 형태의 날짜에서 하이픈(-)을 제거하여 '20261006'으로 변환
        const formattedDateStr = dateStr ? dateStr.replace(/-/g, '') : null;

        const res = await fetch(`${API_BASE_URL}/api/ai/report`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ticker: ticker,
                corp_code: corpCode,
                stock_name: stockName,
                date_str: formattedDateStr // 👈 하이픈이 제거된 문자열 전달
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        console.log(`✅ [API 응답 성공] AI 리포트 수신 완료:`, json);
        
        return json.report; 

    } catch (error) {
        console.error(`❌ [API 요청 실패] AI 리포트 생성 오류:`, error);
        throw error;
    }
}