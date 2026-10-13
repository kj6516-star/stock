import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // 💡 표(Table)와 체크박스 등 확장 마크다운 지원을 위해 추가 추천
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Copy, Check, Share2 } from 'lucide-react';
import { getAiReport } from '../services/api.js';

function AiReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const stock = location.state || {}; 

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchAiReport = async () => {
    if (!stock.ticker || !stock.stock_name) {
      setError("종목 정보가 올바르지 않습니다. Detail 페이지에서 다시 진입해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reportText = await getAiReport(
        stock.ticker, 
        stock.corp_code || "", 
        stock.stock_name,
        stock.analysisDate 
      );
      setReport(reportText);
    } catch (err) {
      setError(err.message || "AI 보고서를 생성하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiReport();
  }, []);

  // 리포트 텍스트 복사 기능
  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 상단 네비게이션 및 타이틀 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', 
            borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', color: '#334155',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <ArrowLeft size={16} /> 상세 페이지로 돌아가기
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {stock.analysisDate && (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
              기준일: {stock.analysisDate}
            </span>
          )}
          {report && !loading && (
            <button
              onClick={handleCopyReport}
              style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 12px',
                borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#2563eb', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              {copied ? '복사완료!' : '리포트 복사'}
            </button>
          )}
        </div>
      </div>

      {/* 헤더 섹션 */}
      <header style={{ backgroundColor: 'white', padding: '1.5rem', sm: { padding: '2rem' }, borderRadius: '20px', marginBottom: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#7c3aed', fontWeight: '700', fontSize: '0.9rem' }}>
          <Sparkles size={18} /> AI 애널리스트 심층 분석 리포트
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
          {stock.stock_name} <span style={{ color: '#2563eb', fontSize: '1.2rem', fontWeight: '700' }}>({stock.ticker})</span>
        </h1>
      </header>

      {/* 로딩 상태 화면 */}
      {loading && (
        <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>AI 애널리스트가 분석 중입니다...</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
            KRX 시세, DART 재무공시, 최신 뉴스 본문을 취합하여 심층 리포트를 작성하고 있습니다. (약 10~15초 소요)
          </p>
        </div>
      )}

      {/* 에러 발생 시 화면 */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '4px' }}>⚠️ 분석 실패</h3>
          <p style={{ fontSize: '0.95rem', marginBottom: '12px' }}>{error}</p>
          <button 
            onClick={fetchAiReport}
            style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* AI 보고서 출력 화면 (가독성 최적화 마크다운 렌더링) */}
      {report && !loading && (
        <div style={{ 
          backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
          border: '1px solid #e2e8f0', padding: '2rem', sm: { padding: '3rem' }, 
          lineHeight: '1.8', color: '#334155', fontSize: '1rem' 
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 💡 주요 제목(h1, h2, h3) 스타일링: 계층별 간격과 하단 구분선 추가
              h1: ({node, ...props}) => <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', marginTop: '2.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' }} {...props} />,
              h2: ({node, ...props}) => <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1e293b', marginTop: '2rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }} {...props} />,
              h3: ({node, ...props}) => <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#2563eb', marginTop: '1.5rem', marginBottom: '0.6rem' }} {...props} />,
              
              // 본문 단락(p) 간격 조정
              p: ({node, ...props}) => <p style={{ marginBottom: '1.2rem', lineHeight: '1.8', color: '#334155' }} {...props} />,
              
              // 강조 리스트(ul, ol)
              ul: ({node, ...props}) => <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.2rem', color: '#334155' }} {...props} />,
              ol: ({node, ...props}) => <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.2rem', color: '#334155' }} {...props} />,
              li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem', lineHeight: '1.6' }} {...props} />,

              // 💡 중요 인용구(blockquote): 애널리스트 총평이나 핵심 요약 박스로 연출
              blockquote: ({node, ...props}) => (
                <blockquote style={{
                  margin: '1.5rem 0', padding: '1.2rem 1.5rem',
                  backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb',
                  borderRadius: '0 12px 12px 0', color: '#1e293b', fontStyle: 'normal',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }} {...props} />
              ),

              // 💡 테이블(table): 모바일 가로 스크롤 및 깔끔한 테두리 적용
              table: ({node, ...props}) => (
                <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }} {...props} />
                </div>
              ),
              th: ({node, ...props}) => <th style={{ backgroundColor: '#f1f5f9', padding: '10px 12px', fontWeight: '800', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }} {...props} />,
              td: ({node, ...props}) => <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#334155' }} {...props} />,

              // 강조 코드 블록
              code: ({node, inline, ...props}) => inline ? (
                <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#2563eb', fontSize: '0.9em', fontWeight: '600' }} {...props} />
              ) : (
                <pre style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '1rem', borderRadius: '12px', overflowX: 'auto', fontSize: '0.85rem' }}>
                  <code {...props} />
                </pre>
              ),
            }}
          >
            {report}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default AiReportPage;