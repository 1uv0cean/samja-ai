'use client';

import { BirthInfoModal } from '@/components/BirthInfoModal';
import { AgentLog } from '@/components/chat/AgentLog';
import { ChatInput } from '@/components/chat/ChatInput';
import { VerdictStamp } from '@/components/chat/VerdictStamp';
import type { BirthInfo, SajuData } from '@/lib/saju/engine';
import { calculateSaju } from '@/lib/saju/engine';
import type { AgentResponse, FinalVerdict } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'samja-birth-info';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [verdict, setVerdict] = useState<FinalVerdict | null>(null);
  const [birthInfo, setBirthInfo] = useState<BirthInfo | null>(null);
  const [sajuData, setSajuData] = useState<SajuData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // 클라이언트 사이드에서만 localStorage 접근
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as BirthInfo;
        setBirthInfo(parsed);
        setSajuData(calculateSaju(parsed));
      } catch {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
    setIsHydrated(true);
  }, []);

  const handleBirthInfoSubmit = (info: BirthInfo) => {
    setBirthInfo(info);
    const saju = calculateSaju(info);
    setSajuData(saju);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setShowModal(false);
  };

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setVerdict(null);
    setAgents([]);
    setCurrentQuery(query);
    setError(null); // 에러 상태 초기화

    try {
      const response = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          birthInfo,
          sajuData,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'agent_start') {
                // 에이전트 발언 시작 - pending 상태로 추가
                setAgents(prev => [
                  ...prev,
                  { 
                    agent: data.agent, 
                    content: '', 
                    status: 'pending' as const,
                  }
                ]);
              } else if (data.type === 'agent_response') {
                // 마지막 pending 항목 업데이트
                setAgents(prev => {
                  const lastPendingIndex = prev.findLastIndex(
                    a => a.agent === data.agent && a.status === 'pending'
                  );
                  if (lastPendingIndex === -1) return prev;
                  
                  const updated = [...prev];
                  updated[lastPendingIndex] = {
                    ...updated[lastPendingIndex],
                    content: data.content,
                    status: 'completed' as const,
                  };
                  return updated;
                });
              } else if (data.type === 'verdict') {
                setVerdict(data.verdict);
              } else if (data.type === 'error') {
                // 서버에서 에러 발생
                setError(data.message || 'AI 응답 중 오류가 발생했습니다.');
                setIsLoading(false);
              } else if (data.type === 'done') {
                setIsLoading(false);
              }
            } catch {
              // JSON 파싱 에러 무시
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('서버와 연결할 수 없습니다. 네트워크를 확인해주세요.');
      setIsLoading(false);
    }
  };

  const handleResetBirthInfo = () => {
    setShowModal(true);
  };

  // SSR 하이드레이션 전에는 로딩 표시
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#3182F6] text-lg font-medium"
        >
          로딩 중...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* 생년월일 입력 모달 */}
      <AnimatePresence>
        {showModal && (
          <BirthInfoModal onSubmit={handleBirthInfoSubmit} />
        )}
      </AnimatePresence>

      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-2xl">
        {/* 헤더 */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-[#191F28] mb-2">
            삼자대면
          </h1>
          <p className="text-[#6B7684] text-sm sm:text-base">
            T형 · F형 · 사주, 세 관점의 조언
          </p>
          
          {/* 사용자 정보 표시 */}
          {birthInfo && sajuData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full shadow-sm"
            >
              <span className="text-[#3182F6] font-semibold">{birthInfo.name}</span>
              <span className="w-px h-4 bg-[#E5E8EB]" />
              <span className="text-[#6B7684] text-sm">
                {sajuData.dayMaster}({sajuData.dayMasterElement}) · {sajuData.zodiacAnimal}띠
              </span>
              <button
                onClick={handleResetBirthInfo}
                className="ml-1 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F4F4F5] transition-colors text-[#8B95A1]"
                title="정보 수정"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </motion.div>
          )}
        </motion.header>

        {/* 사용자 질문 표시 */}
        <AnimatePresence>
          {currentQuery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <div className="bg-[#3182F6] text-white rounded-2xl rounded-tr-sm p-4 shadow-sm">
                <p className="text-sm font-medium opacity-70 mb-1">내 고민</p>
                <p className="text-base leading-relaxed">{currentQuery}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 토론 진행 표시 */}
        <AnimatePresence>
          {agents.length > 0 && !verdict && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm text-[#6B7684]">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  💬
                </motion.span>
                <span>의견 나누는 중... ({agents.length}번째)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 에이전트 로그 영역 */}
        <AnimatePresence>
          {agents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 mb-8"
            >
              {agents.map((agent, index) => (
                <AgentLog
                  key={`${agent.agent}-${index}`}
                  agent={agent}
                  isActive={agent.status === 'pending'}
                  order={index + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 최종 합의 결과 */}
        <AnimatePresence>
          {verdict && verdict.consensus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <VerdictStamp verdict={verdict} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 에러 메시지 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-red-800 font-medium mb-1">오류가 발생했습니다</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 하단 여백 */}
        <div className="h-32" />
      </main>

      {/* 입력창 - 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E8EB] safe-area-bottom">
        <div className="container mx-auto max-w-2xl p-4">
          <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
