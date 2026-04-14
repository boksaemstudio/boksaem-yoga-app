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
      alert(t("g_d2d64f") || t("g_d2d64f") || t("g_d2d64f") || t("g_d2d64f") || t("g_d2d64f") || "\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB294 \uC74C\uC131 \uC785\uB825\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
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
      const errMsg = error?.message || t("g_8de26e") || t("g_8de26e") || t("g_8de26e") || t("g_8de26e") || t("g_8de26e") || "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.";
      const isQuotaError = errMsg.includes(t("g_a3d293") || t("g_a3d293") || t("g_a3d293") || t("g_a3d293") || t("g_a3d293") || "\uD55C\uB3C4") || errMsg.includes('resource-exhausted');
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
    const t = useLanguageStore(s => s.t);
    const map = {
      member: {
        label: t("g_6745df") || t("g_6745df") || t("g_6745df") || t("g_6745df") || t("g_6745df") || "\uD68C\uC6D0",
        color: '#3B82F6'
      },
      attendance: {
        label: t("g_b31acb") || t("g_b31acb") || t("g_b31acb") || t("g_b31acb") || t("g_b31acb") || "\uCD9C\uC11D",
        color: '#10B981'
      },
      revenue: {
        label: t("g_69735f") || t("g_69735f") || t("g_69735f") || t("g_69735f") || t("g_69735f") || "\uB9E4\uCD9C",
        color: '#F59E0B'
      },
      schedule: {
        label: t("g_b3a59d") || t("g_b3a59d") || t("g_b3a59d") || t("g_b3a59d") || t("g_b3a59d") || "\uC2A4\uCF00\uC904",
        color: '#8B5CF6'
      },
      strategy: {
        label: t("g_d8de88") || t("g_d8de88") || t("g_d8de88") || t("g_d8de88") || t("g_d8de88") || "\uC804\uB7B5",
        color: '#EC4899'
      },
      general: {
        label: t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || "\uC77C\uBC18",
        color: '#6B7280'
      },
      error: {
        label: t("g_08ffab") || t("g_08ffab") || t("g_08ffab") || t("g_08ffab") || t("g_08ffab") || "\uC624\uB958",
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
          }}>{t("g_604976") || t("g_604976") || t("g_604976") || t("g_604976") || t("g_604976") || "AI \uBE44\uC11C"}</div>
                        <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-tertiary)'
          }}>{t("g_e1e8a7") || t("g_e1e8a7") || t("g_e1e8a7") || t("g_e1e8a7") || t("g_e1e8a7") || "\uC624\uB298"}{quota.used}/{quota.limit}{t("g_ef75c9") || t("g_ef75c9") || t("g_ef75c9") || t("g_ef75c9") || t("g_ef75c9") || "\uD68C \uC0AC\uC6A9"}</div>
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
                        <Clock size={14} />{t("g_dc3ab9") || t("g_dc3ab9") || t("g_dc3ab9") || t("g_dc3ab9") || t("g_dc3ab9") || "\uB300\uD654\uAE30\uB85D"}</button>
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
                        <ArrowClockwise size={14} />{t("g_558a0c") || t("g_558a0c") || t("g_558a0c") || t("g_558a0c") || t("g_558a0c") || "\uC0C8 \uB300\uD654"}</button>
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
        }}>{t("g_e6fbc5") || t("g_e6fbc5") || t("g_e6fbc5") || t("g_e6fbc5") || t("g_e6fbc5") || "\uD83D\uDCCB \uACFC\uAC70 \uB300\uD654 \uAE30\uB85D"}</span>
                        <button onClick={() => setShowHistory(false)} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: '0.75rem'
        }}>{t("g_972cfb") || t("g_972cfb") || t("g_972cfb") || t("g_972cfb") || t("g_972cfb") || "\uB2EB\uAE30 \u2715"}</button>
                    </div>
                    {history.length === 0 ? <div style={{
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.8rem',
        padding: '20px 0'
      }}>{t("g_1d78a0") || t("g_1d78a0") || t("g_1d78a0") || t("g_1d78a0") || t("g_1d78a0") || "\uC544\uC9C1 \uB300\uD654 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"}</div> : history.map((item, idx) => <div key={item.id || idx} style={{
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
          }}>{t("g_41896d") || t("g_41896d") || t("g_41896d") || t("g_41896d") || t("g_41896d") || "\uBB34\uC5C7\uC774\uB4E0 \uBB3C\uC5B4\uBCF4\uC138\uC694"}</div>
                            <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)',
            lineHeight: '1.6'
          }}>{t("g_e63137") || t("g_e63137") || t("g_e63137") || t("g_e63137") || t("g_e63137") || "\uC774\uB984\xB7\uC804\uD654\uBC88\uD638\xB7\uC885\uBAA9\uC73C\uB85C \uD68C\uC6D0 \uAC80\uC0C9, \uCD9C\uC11D\xB7\uB9E4\uCD9C \uBD84\uC11D\uAE4C\uC9C0"}<br />{t("g_d0e817") || t("g_d0e817") || t("g_d0e817") || t("g_d0e817") || t("g_d0e817") || "\uC2A4\uD29C\uB514\uC624\uC758"}<span style={{
              color: 'var(--primary-gold)',
              fontWeight: 'bold'
            }}>{t("g_1b17a5") || t("g_1b17a5") || t("g_1b17a5") || t("g_1b17a5") || t("g_1b17a5") || "\uBAA8\uB4E0 \uB370\uC774\uD130"}</span>{t("g_cdc40d") || t("g_cdc40d") || t("g_cdc40d") || t("g_cdc40d") || t("g_cdc40d") || "\uB97C \uAE30\uBC18\uC73C\uB85C \uB2F5\uBCC0\uD569\uB2C8\uB2E4."}<br />
                                <span style={{
              color: '#10B981',
              fontWeight: 'bold',
              display: 'inline-block',
              marginTop: '4px'
            }}>{t("g_78b1ac") || t("g_78b1ac") || t("g_78b1ac") || t("g_78b1ac") || t("g_78b1ac") || "\u2728 \uC6B4\uC601\uC744 \uD560\uC218\uB85D \uB370\uC774\uD130\uAC00 \uC313\uC5EC \uB9DE\uCDA4\uD615 \uC870\uC5B8\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4."}</span>
                            </div>
                        </div>
                        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '420px'
        }}>
                            {[t("g_b14583") || t("g_b14583") || t("g_b14583") || t("g_b14583") || t("g_b14583") || "\uD64D\uAE38\uB3D9 \uD68C\uC6D0 \uC815\uBCF4 \uC54C\uB824\uC918", t("g_29fd1d") || t("g_29fd1d") || t("g_29fd1d") || t("g_29fd1d") || t("g_29fd1d") || "\uC624\uB298 \uCD9C\uC11D \uD604\uD669", t("g_3763b1") || t("g_3763b1") || t("g_3763b1") || t("g_3763b1") || t("g_3763b1") || "\uC774\uBC88 \uB2EC \uB9E4\uCD9C \uBD84\uC11D", t("g_67dd37") || t("g_67dd37") || t("g_67dd37") || t("g_67dd37") || t("g_67dd37") || "\uB9CC\uB8CC \uC784\uBC15 \uD68C\uC6D0 \uB204\uAD6C\uC57C", t("g_18b533") || t("g_18b533") || t("g_18b533") || t("g_18b533") || t("g_18b533") || "\uD69F\uC218 \uBD80\uC871\uD55C \uD68C\uC6D0 \uC54C\uB824\uC918", t("g_566ead") || t("g_566ead") || t("g_566ead") || t("g_566ead") || t("g_566ead") || "\uB9C8\uCF00\uD305 \uC544\uC774\uB514\uC5B4 \uC918"].map(q => <button key={q} onClick={() => {
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
          }}>{t("g_1a7678") || t("g_1a7678") || t("g_1a7678") || t("g_1a7678") || t("g_1a7678") || "\uB370\uC774\uD130 \uBD84\uC11D \uC911..."}</span>
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
        }} title={isListening ? t("g_07ded6") || t("g_07ded6") || t("g_07ded6") || t("g_07ded6") || t("g_07ded6") || "\uC74C\uC131 \uC785\uB825 \uC911\uC9C0" : t("g_2ff919") || t("g_2ff919") || t("g_2ff919") || t("g_2ff919") || t("g_2ff919") || "\uC74C\uC131\uC73C\uB85C \uC9C8\uBB38\uD558\uAE30"}>
                        <Microphone size={20} weight={isListening ? 'fill' : 'regular'} />
                    </button>

                    {/* 텍스트 입력 */}
                    <textarea ref={inputRef} value={input} onChange={e => {
          setInput(e.target.value);
          e.target.style.height = '1.5em'; // reset before calc
          const scrollHeight = e.target.scrollHeight;
          e.target.style.height = `${Math.min(scrollHeight, 120)}px`;
        }} onKeyDown={handleKeyDown} placeholder={isListening ? t("g_a591df") || t("g_a591df") || t("g_a591df") || t("g_a591df") || t("g_a591df") || "\uD83C\uDFA4 \uB9D0\uC500\uD558\uC138\uC694..." : t("g_cf8bc0") || t("g_cf8bc0") || t("g_cf8bc0") || t("g_cf8bc0") || t("g_cf8bc0") || "\uC9C8\uBB38\uC744 \uC785\uB825\uD558\uC138\uC694..."} rows={1} style={{
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
        }} title={t("g_f235c8") || t("g_f235c8") || t("g_f235c8") || t("g_f235c8") || t("g_f235c8") || "\uC804\uC1A1"}>
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
        }} />{t("g_fba54b") || t("g_fba54b") || t("g_fba54b") || t("g_fba54b") || t("g_fba54b") || "\uC74C\uC131 \uC785\uB825 \uC911... \uB9D0\uC500\uC774 \uB05D\uB098\uBA74 \uC790\uB3D9\uC73C\uB85C \uC785\uB825\uB429\uB2C8\uB2E4"}</div>}
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