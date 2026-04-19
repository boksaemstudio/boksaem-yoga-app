import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { askAssistant, getAssistantHistory } from '../../services/adminAssistantService';
import { Microphone, PaperPlaneRight, Robot, User, Clock, Lightning, ArrowClockwise } from '@phosphor-icons/react';
const AdminAIAssistant = () => {
  const t = useLanguageStore(s => s.t);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState({
    used: 0,
    limit: 50
  });
  const [isListening, setIsListening] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // 스크롤 자동 하단
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    }), 100);
  }, []);

  // 세션 대화 복원
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('ai_assistant_messages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {/* ignore */}
    setHistoryLoaded(true);
  }, []);

  // 세션 대화 저장
  useEffect(() => {
    if (historyLoaded && messages.length > 0) {
      try {
        sessionStorage.setItem('ai_assistant_messages', JSON.stringify(messages.slice(-30)));
      } catch {/* ignore */}
    }
  }, [messages, historyLoaded]);
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Web Speech API 초기화
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = event => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(finalTranscript);
        } else if (interimTranscript) {
          setInput(interimTranscript);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.onerror = e => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(t("g_673d3d") || "이 브라우저에서는 음성 입력을 지원하지 않습니다.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // 질문 전송
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await askAssistant(text, messages);
      const assistantMsg = {
        role: 'assistant',
        content: result.answer,
        timestamp: new Date().toISOString(),
        category: result.category,
        suggestions: result.suggestions
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (result.quota) setQuota(result.quota);
    } catch (error) {
      const errMsg = error?.message || t("g_cea340") || "오류가 발생했습니다.";
      const isQuotaError = errMsg.includes(t("g_f9a32a") || "한도") || errMsg.includes('resource-exhausted');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isQuotaError ? `⚠️ 오늘의 AI 비서 사용 한도(${quota.limit}회)를 모두 사용했습니다. 내일 다시 이용해주세요.` : `죄송합니다, 일시적인 오류가 발생했습니다. 다시 시도해주세요.\n\n(${errMsg})`,
        timestamp: new Date().toISOString(),
        category: 'error'
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // 후속 질문 클릭
  const handleSuggestionClick = suggestion => {
    setInput(suggestion);
    setTimeout(() => handleSend(), 50);
  };

  // 과거 대화 히스토리 로드
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getAssistantHistory(50);
      setHistory(data);
      setShowHistory(true);
    } catch (e) {
      console.error('History load failed:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 새 대화 시작
  const handleNewConversation = () => {
    setMessages([]);
    sessionStorage.removeItem('ai_assistant_messages');
    setShowHistory(false);
  };
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const getCategoryBadge = category => {

    const map = {
      member: {
        label: t("g_dae3ed") || "Member",
        color: '#3B82F6'
      },
      attendance: {
        label: t("g_937c42") || "Attendance",
        color: '#10B981'
      },
      revenue: {
        label: t("g_191145") || "Revenue",
        color: '#F59E0B'
      },
      schedule: {
        label: t("g_7fa4b7") || "Schedule",
        color: '#8B5CF6'
      },
      strategy: {
        label: t("g_913a74") || "전략",
        color: '#EC4899'
      },
      general: {
        label: t("g_aef1a1") || "General",
        color: '#6B7280'
      },
      error: {
        label: t("g_3efa8a") || "Error",
        color: '#EF4444'
      }
    };
    const info = map[category] || map.general;
    return <span style={{
      fontSize: '0.6rem',
      padding: '2px 6px',
      borderRadius: '4px',
      background: `${info.color}22`,
      color: info.color,
      fontWeight: 'bold',
      marginLeft: '6px'
    }}>{info.label}</span>;
  };
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '60vh',
    flex: 1
  }}>
            {/* 헤더 */}
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15), rgba(139, 92, 246, 0.1))',
      borderRadius: '16px 16px 0 0',
      borderBottom: '1px solid rgba(var(--primary-rgb), 0.2)'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
                    <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--primary-gold), #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)'
        }}>
                        <Robot size={20} weight="fill" color="white" />
                    </div>
                    <div>
                        <div style={{
            fontWeight: '800',
            fontSize: '1rem',
            color: 'var(--text-primary)'
          }}>{t("g_85b604") || "AI 비서"}</div>
                        <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-tertiary)'
          }}>{t("g_2bdce5") || "Today"}{quota.used}/{quota.limit}{t("g_5f86fc") || "회 사용"}</div>
                    </div>
                </div>
                <div style={{
        display: 'flex',
        gap: '8px'
      }}>
                    <button onClick={loadHistory} disabled={historyLoading} style={{
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: showHistory ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
          color: showHistory ? 'var(--primary-gold)' : 'var(--text-secondary)',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
                        <Clock size={14} />{t("g_9f545e") || "대화기록"}</button>
                    <button onClick={handleNewConversation} style={{
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-secondary)',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
                        <ArrowClockwise size={14} />{t("g_b69c6b") || "새 대화"}</button>
                </div>
            </div>

            {/* 과거 대화 히스토리 패널 */}
            {showHistory && <div style={{
      maxHeight: '250px',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.3)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '12px'
    }}>
                    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
                        <span style={{
          fontSize: '0.75rem',
          fontWeight: 'bold',
          color: 'var(--text-secondary)'
        }}>{t("g_8fb36d") || "📋 과거 대화 기록"}</span>
                        <button onClick={() => setShowHistory(false)} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: '0.75rem'
        }}>{t("g_748543") || "닫기 ✕"}</button>
                    </div>
                    {history.length === 0 ? <div style={{
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.8rem',
        padding: '20px 0'
      }}>{t("g_a37572") || "아직 대화 기록이 없습니다"}</div> : history.map((item, idx) => <div key={item.id || idx} style={{
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.02)',
        marginBottom: '6px',
        border: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onClick={() => {
        setInput(item.question);
        setShowHistory(false);
      }}>
                                <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
                                    <span style={{
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: 'var(--text-primary)'
          }}>
                                        {item.question.length > 40 ? item.question.slice(0, 40) + '...' : item.question}
                                    </span>
                                    <span style={{
            fontSize: '0.6rem',
            color: 'var(--text-tertiary)'
          }}>
                                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : ''}
                                    </span>
                                </div>
                                <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          marginTop: '4px',
          lineHeight: '1.4'
        }}>
                                    {item.answer?.length > 80 ? item.answer.slice(0, 80) + '...' : item.answer}
                                </div>
                            </div>)}
                </div>}

            {/* 대화 영역 */}
            <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '20px',
      background: 'rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
                {messages.length === 0 && <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
                        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.2), rgba(139, 92, 246, 0.15))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(var(--primary-rgb), 0.15)'
        }}>
                            <Robot size={32} weight="duotone" color="var(--primary-gold)" />
                        </div>
                        <div>
                            <div style={{
            fontSize: '1.1rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>{t("g_6faa2d") || "무엇이든 물어보세요"}</div>
                            <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)',
            lineHeight: '1.6'
          }}>{t("g_3eada3") || "이름·전화번호·종목으로 Member 검색, 출석·매출 분석까지"}<br />{t("g_8e36a0") || "스튜디오의"}<span style={{
              color: 'var(--primary-gold)',
              fontWeight: 'bold'
            }}>{t("g_3c636f") || "모든 데이터"}</span>{t("g_6a033c") || "를 기반으로 답변합니다."}<br />
                                <span style={{
              color: '#10B981',
              fontWeight: 'bold',
              display: 'inline-block',
              marginTop: '4px'
            }}>{t("g_748dbe") || "✨ 운영을 할수록 데이터가 쌓여 맞춤형 조언이 가능합니다."}</span>
                            </div>
                        </div>
                        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '420px'
        }}>
                            {[t("g_3acbce") || "홍길동 Member 정보 알려줘", t("g_dce2e2") || "오늘 출석 현황", t("g_70b524") || "이번 달 매출 분석", t("g_5646c3") || "만료 임박 Member 누구야", t("g_84dc88") || "횟수 부족한 Member 알려줘", t("g_9a166d") || "마케팅 아이디어 줘"].map(q => <button key={q} onClick={() => {
            setInput(q);
            setTimeout(() => {
              handleSend();
            }, 100);
          }} style={{
            padding: '8px 14px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            background: 'rgba(var(--primary-rgb), 0.08)',
            color: 'var(--primary-gold)',
            border: '1px solid rgba(var(--primary-rgb), 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.15)';
          }} onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.08)';
          }}>
                                    <Lightning size={12} weight="fill" /> {q}
                                </button>)}
                        </div>
                    </div>}

                {messages.map((msg, idx) => <div key={idx} style={{
        display: 'flex',
        gap: '10px',
        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
        alignItems: 'flex-start'
      }}>
                        {/* 아바타 */}
                        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          flexShrink: 0,
          background: msg.role === 'user' ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'linear-gradient(135deg, var(--primary-gold), #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: msg.role === 'user' ? '0 2px 8px rgba(59,130,246,0.3)' : '0 2px 8px rgba(var(--primary-rgb), 0.3)'
        }}>
                            {msg.role === 'user' ? <User size={16} weight="bold" color="white" /> : <Robot size={16} weight="fill" color="white" />}
                        </div>

                        {/* 메시지 버블 */}
                        <div style={{
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: '14px',
          background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.15))' : 'rgba(255,255,255,0.04)',
          border: msg.role === 'user' ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.06)',
          borderBottomRightRadius: msg.role === 'user' ? '4px' : '14px',
          borderBottomLeftRadius: msg.role === 'user' ? '14px' : '4px'
        }}>
                            <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
                                {msg.content}
                            </div>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '6px'
          }}>
                                <span style={{
              fontSize: '0.6rem',
              color: 'var(--text-tertiary)'
            }}>
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              }) : ''}
                                </span>
                                {msg.category && msg.role === 'assistant' && getCategoryBadge(msg.category)}
                            </div>

                            {/* 후속 질문 제안 */}
                            {msg.suggestions && msg.suggestions.length > 0 && <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
                                    {msg.suggestions.map((s, si) => <button key={si} onClick={() => handleSuggestionClick(s)} style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              background: 'rgba(var(--primary-rgb), 0.08)',
              color: 'var(--primary-gold)',
              border: '1px solid rgba(var(--primary-rgb), 0.15)',
              cursor: 'pointer'
            }}>{s}</button>)}
                                </div>}
                        </div>
                    </div>)}

                {/* 로딩 */}
                {loading && <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start'
      }}>
                        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary-gold), #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
                            <Robot size={16} weight="fill" color="white" />
                        </div>
                        <div style={{
          padding: '14px 18px',
          borderRadius: '14px 14px 14px 4px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <div style={{
            display: 'flex',
            gap: '4px'
          }}>
                                {[0, 1, 2].map(i => <div key={i} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--primary-gold)',
              opacity: 0.6,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
            }} />)}
                            </div>
                            <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)'
          }}>{t("g_eacaf3") || "데이터 분석 중..."}</span>
                        </div>
                    </div>}

                <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div style={{
      padding: '16px 20px',
      background: 'rgba(0,0,0,0.3)',
      flexShrink: 0,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '0 0 16px 16px'
    }}>
                <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
        background: 'rgba(255,255,255,0.04)',
        border: isListening ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '8px 12px',
        transition: 'border-color 0.3s',
        boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none'
      }}>
                    {/* 마이크 버튼 */}
                    <button onClick={toggleListening} style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
          color: isListening ? '#EF4444' : 'var(--text-secondary)',
          transition: 'all 0.2s',
          flexShrink: 0,
          animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }} title={isListening ? t("g_7739f2") || "음성 입력 중지" : t("g_0bda4d") || "음성으로 질문하기"}>
                        <Microphone size={20} weight={isListening ? 'fill' : 'regular'} />
                    </button>

                    {/* 텍스트 입력 */}
                    <textarea ref={inputRef} value={input} onChange={e => {
          setInput(e.target.value);
          e.target.style.height = '1.5em'; // reset before calc
          const scrollHeight = e.target.scrollHeight;
          e.target.style.height = `${Math.min(scrollHeight, 120)}px`;
        }} onKeyDown={handleKeyDown} placeholder={isListening ? t("g_162218") || "🎤 말씀하세요..." : t("g_df366c") || "질문을 입력하세요..."} rows={1} style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          resize: 'none',
          height: '1.5em',
          minHeight: '1.5em',
          maxHeight: '120px',
          lineHeight: '1.5',
          fontFamily: 'inherit',
          padding: '0',
          margin: '4px 0',
          overflowY: 'auto',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }} />

                    {/* 전송 버튼 */}
                    <button onClick={handleSend} disabled={!input.trim() || loading} style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: input.trim() ? 'linear-gradient(135deg, var(--primary-gold), #8B5CF6)' : 'rgba(255,255,255,0.05)',
          color: input.trim() ? 'white' : 'var(--text-tertiary)',
          transition: 'all 0.2s',
          flexShrink: 0,
          opacity: loading ? 0.5 : 1,
          boxShadow: input.trim() ? '0 4px 12px rgba(var(--primary-rgb), 0.3)' : 'none'
        }} title={t("g_4077ce") || "Send"}>
                        <PaperPlaneRight size={18} weight="fill" />
                    </button>
                </div>

                {isListening && <div style={{
        textAlign: 'center',
        marginTop: '8px',
        fontSize: '0.7rem',
        color: '#EF4444',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
                        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#EF4444',
          animation: 'pulse 1s ease-in-out infinite'
        }} />{t("g_06c603") || "음성 입력 중... 말씀이 끝나면 자동으로 입력됩니다"}</div>}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
            `}</style>
        </div>;
};
export default AdminAIAssistant;