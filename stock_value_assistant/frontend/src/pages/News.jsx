import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Newspaper, BookOpen, X } from 'lucide-react';
import { useNewsList, useNewsContentMutation } from '../hooks/useStockQueries.js'; 

const NewsPage = () => {
  const { ticker } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stockName = location.state?.stockName || ticker;
  const analysisDate = location.state?.analysisDate;

  const { 
    data: rawNewsData, 
    isLoading: loading, 
    isError 
  } = useNewsList(stockName, analysisDate);

  const contentMutation = useNewsContentMutation();
  const [selectedNews, setSelectedNews] = useState(null);

  const newsList = isError || !rawNewsData 
    ? [
        {
          title: `${stockName}, 신제품 호조에 급등세 기록... 투자자 관심 집중`,
          press: '한국경제',
          date: '2026-06-07 14:30',
          link: 'https://www.naver.com',
          content: 'API 연동 에러로 표시되는 임시 본문입니다.'
        }
      ]
    : (rawNewsData.data || rawNewsData || []);

  const handleOpenContent = (news) => {
    if (news.content) {
      setSelectedNews(news);
      return;
    }

    setSelectedNews(news);

    contentMutation.mutate(news.link, {
      onSuccess: (res) => {
        const contentText = res.content || res.data || "본문 내용을 불러오지 못했습니다.";
        setSelectedNews(prev => ({ ...prev, content: contentText }));
      },
      onError: (err) => {
        console.error("본문 크롤링 실패:", err);
        setSelectedNews(prev => ({ ...prev, content: "본문 크롤링 중 오류가 발생했습니다." }));
      }
    });
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* 상단 뒤로가기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0',
          padding: '8px 16px', borderRadius: '12px', color: '#64748b', cursor: 'pointer', fontWeight: '600', marginBottom: '1.5rem'
        }}
      >
        <ArrowLeft size={18} /> 상세 페이지로 돌아가기
      </button>

      {/* 헤더 타이틀 */}
      <header style={{ backgroundColor: 'white', padding: '1.5rem', sm: { padding: '2rem' }, borderRadius: '20px', marginBottom: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
          <Newspaper size={24} color="#2563eb" />
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', fontWeight: '900', color: '#0f172a', margin: 0 }}>
            {stockName} 관련 주요 뉴스
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
          {analysisDate ? `기준일 (${analysisDate}) 전후의 특징주 및 호재성 기사 목록입니다.` : '실시간 관련 뉴스 목록입니다.'}
        </p>
      </header>

      {/* 로딩 상태 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '600' }}>
          🔄 뉴스를 수집하고 불러오는 중입니다...
        </div>
      )}

      {/* 뉴스 목록 리스트 */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {newsList.length > 0 ? (
            newsList.map((news, index) => (
              <div 
                key={index} 
                className="news-card"
                style={{ 
                  backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', 
                  border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex', flexDirection: 'column', md: { flexDirection: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start', md: { alignItems: 'center' }, gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, width: '100%' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                      {news.press}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{news.date}</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', margin: 0, lineHeight: '1.4' }}>
                    {news.title}
                  </h3>
                </div>
                
                {/* 💡 버튼 그룹: 모바일에서는 너비 100% 채우기 또는 간격 정렬 */}
                <div className="news-card-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', md: { width: 'auto' }, justifyContent: 'flex-end', marginTop: '8px', md: { marginTop: '0' } }}>
                  <button
                    onClick={() => handleOpenContent(news)}
                    style={{
                      flex: 1, md: { flex: 'none' },
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: '#eff6ff',
                      border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '10px',
                      color: '#2563eb', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.9rem'
                    }}
                  >
                    <BookOpen size={16} /> 본문 보기
                  </button>

                  <a 
                    href={news.link} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      flex: 1, md: { flex: 'none' },
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: '#f8fafc',
                      border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px',
                      color: '#334155', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.9rem'
                    }}
                  >
                    원문 <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              관련 뉴스가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 본문 미리보기 모달 */}
      {selectedNews && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', width: '100%', maxWidth: '700px', maxHeight: '85vh',
            borderRadius: '20px', padding: '1.5rem', sm: { padding: '2rem' }, display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            {/* 모달 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div style={{ paddingRight: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                    {selectedNews.press}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{selectedNews.date}</span>
                </div>
                <h2 style={{ fontSize: '1.1rem', sm: { fontSize: '1.25rem' }, fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.4' }}>
                  {selectedNews.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', flexShrink: 0 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* 모달 본문 내용 */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '1.5rem', lineHeight: '1.7', color: '#334155', fontSize: '0.95rem', sm: { fontSize: '1rem' }, whiteSpace: 'pre-line' }}>
              {contentMutation.isPending ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '600' }}>
                  🔄 기사 본문을 크롤링 중입니다...
                </div>
              ) : (
                selectedNews.content || '본문 내용을 불러올 수 없습니다.'
              )}
            </div>

            {/* 모달 하단 푸터 */}
            <div style={{ display: 'flex', flexDirection: 'column', sm: { flexDirection: 'row' }, justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <a
                href={selectedNews.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: '#2563eb', color: 'white',
                  padding: '10px 16px', borderRadius: '10px', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem'
                }}
              >
                브라우저에서 원문 전체 보기 <ExternalLink size={16} />
              </a>
              <button
                onClick={() => setSelectedNews(null)}
                style={{
                  background: '#f1f5f9', border: 'none', padding: '10px 16px', borderRadius: '10px',
                  color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NewsPage;