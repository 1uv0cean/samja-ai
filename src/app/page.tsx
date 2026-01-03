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
    
    // 초기 상태 설정
    setAgents([
      { agent: 'LOGIC', content: '', status: 'pending' },
      { agent: 'INSTINCT', content: '', status: 'pending' },
      { agent: 'REALITY', content: '', status: 'pending' },
    ]);

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

      const data = await response.json();
      setAgents(data.agents);
      setVerdict(data.verdict);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetBirthInfo = () => {
    setShowModal(true);
  };

  // SSR 하이드레이션 전에는 로딩 표시
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-orange-500 animate-pulse text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 배경 그리드 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,100,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,100,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* 스캔라인 오버레이 */}
      <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]" />

      {/* 생년월일 입력 모달 */}
      <AnimatePresence>
        {showModal && (
          <BirthInfoModal onSubmit={handleBirthInfoSubmit} />
        )}
      </AnimatePresence>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-clip-text text-transparent">
              삼자대면
            </span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm tracking-widest">
            LOGIC • INSTINCT • REALITY
          </p>
          <div className="mt-3 sm:mt-4 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          
          {/* 사용자 정보 표시 */}
          {birthInfo && sajuData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 sm:mt-6 inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-full text-sm"
            >
              <span className="text-orange-400 font-medium">{birthInfo.name}</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-xs sm:text-sm">
                {sajuData.dayMaster}({sajuData.dayMasterElement}) • {sajuData.zodiacAnimal}띠
              </span>
              <button
                onClick={handleResetBirthInfo}
                className="ml-2 text-gray-500 hover:text-orange-400 transition-colors text-xs"
                title="정보 수정"
              >
                ✏️
              </button>
            </motion.div>
          )}
        </motion.header>

        {/* 에이전트 로그 영역 */}
        <AnimatePresence>
          {agents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8"
            >
              {agents.map((agent) => (
                <AgentLog
                  key={agent.agent}
                  agent={agent}
                  isActive={agent.status === 'pending'}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 최종 판결 */}
        <AnimatePresence>
          {verdict && verdict.decision && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-8"
            >
              <VerdictStamp verdict={verdict} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 입력창 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="container mx-auto max-w-2xl">
            <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </div>

        {/* 하단 여백 */}
        <div className="h-32" />
      </main>
    </div>
  );
}
