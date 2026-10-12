import { useQuery, useMutation } from '@tanstack/react-query';
import { 
    getMarketStocks, 
    getStockDetail, 
    getNewsList, 
    getNewsContent 
} from '../services/api'; // 방금 작성하신 api.js 경로

// 1. 메인 화면 모멘텀 종목 리스트 훅
export function useMarketStocks(date = "") {
    return useQuery({
        queryKey: ['marketStocks', date],
        queryFn: () => getMarketStocks(date),
        staleTime: 1000 * 60 * 60, // 10분 동안 캐시 유지
    });
}

// 2. 종목 상세 DART 정보 훅
export function useStockDetail(ticker) {
    return useQuery({
        queryKey: ['stockDetail', ticker],
        queryFn: () => getStockDetail(ticker),
        staleTime: 1000 * 60 * 60,  // 5분 동안 캐시 유지
        gcTime: 1000 * 60 * 60,    // 30분 동안 메모리 유지
        enabled: !!ticker,         // ticker가 유효할 때만 자동 요청
    });
}

// 3. 종목/검색어별 뉴스 리스트 훅
export function useNewsList(query, analysisDate = "") {
    return useQuery({
        queryKey: ['newsList', query, analysisDate],
        queryFn: () => getNewsList(query, analysisDate),
        staleTime: 1000 * 60 * 60,  // 3분 동안 캐시 유지
        enabled: !!query,          // 검색어가 있을 때만 자동 요청
    });
}

// 4. 뉴스 본문 가져오기 (POST 요청이므로 useMutation 추천)
// 사용자가 특정 뉴스를 클릭했을 때 불러오는 용도로 적합합니다.
export function useNewsContentMutation() {
    return useMutation({
        mutationFn: (newsUrl) => getNewsContent(newsUrl),
    });
}