'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown, RotateCcw, Sparkles, Loader2, WifiOff, ChevronDown } from 'lucide-react';

// ── Types ───────────────────────────────────────────────

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  feedback?: -1 | 1 | null;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Où est parti mon argent ce mois-ci ?",
  "Suis-je dans mon budget ?",
  "Comment améliorer ma discipline ?",
  "Où en sont mes objectifs ?",
];

const TOOL_STATUS_LABELS: Record<string, string> = {
  get_cash_summary: 'Je regarde tes finances…',
  get_transactions: 'Je consulte tes transactions…',
  get_budget_status: 'Je vérifie ton budget…',
  get_objectives: 'Je regarde tes objectifs…',
  get_habits_stats: 'Je consulte tes habitudes…',
  get_tasks_summary: 'Je regarde tes tâches…',
  get_discipline_score: 'Je calcule ton score…',
  get_user_setup: 'Je regarde ta configuration…',
};

// ── Component ───────────────────────────────────────────

export default function CoachWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Get user's first name from localStorage
  const firstName = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const user = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      return (user.full_name || '').split(' ')[0] || '';
    } catch { return ''; }
  })();

  // ── Send Message ──────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setLoadingStatus('Coach Abraham réfléchit…');
    setNetworkError(false);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '' }));

        if (response.status === 429) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: errorData.error || "Tu as atteint ta limite de messages. Reviens un peu plus tard !",
            timestamp: new Date(),
          }]);
        } else if (response.status === 401) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: "Tu dois être connecté pour me parler. Connecte-toi et reviens me voir !",
            timestamp: new Date(),
          }]);
        } else {
          throw new Error(errorData.error || 'Erreur serveur');
        }
        return;
      }

      const data = await response.json();

      const assistantMsg: CoachMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        toolsUsed: data.toolsUsed,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (data.conversationId) setConversationId(data.conversationId);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);

    } catch (err) {
      console.error('[Coach Widget] Error:', err);
      setNetworkError(true);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "Problème de connexion. Vérifie ta connexion internet et réessaie.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // ── Feedback ──────────────────────────────────────────

  const sendFeedback = async (messageId: string, feedback: -1 | 1) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback } : m
    ));

    try {
      await fetch('/api/coach/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, feedback }),
      });
    } catch { /* silently fail */ }
  };

  // ── New Conversation ──────────────────────────────────

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
    setNetworkError(false);
  };

  // ── Handle Key Press ──────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Render ────────────────────────────────────────────

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="coach-fab"
          aria-label="Ouvrir Coach Abraham"
          title="Coach Abraham"
        >
          <Sparkles size={20} strokeWidth={1.8} />
          <span className="coach-fab-label">Coach</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="coach-overlay" onClick={() => setIsOpen(false)}>
          <div
            ref={panelRef}
            className="coach-panel"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Coach Abraham"
          >
            {/* Header */}
            <div className="coach-header">
              <div className="coach-header-info">
                <div className="coach-avatar">
                  <Sparkles size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="coach-title">Coach Abraham</h2>
                  <p className="coach-subtitle">Coach IA · Cash Save</p>
                </div>
              </div>
              <div className="coach-header-actions">
                <button
                  onClick={newConversation}
                  className="coach-icon-btn"
                  title="Nouvelle conversation"
                  aria-label="Nouvelle conversation"
                >
                  <RotateCcw size={16} strokeWidth={1.8} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="coach-icon-btn"
                  title="Fermer"
                  aria-label="Fermer le coach"
                >
                  <X size={18} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="coach-messages" aria-live="polite">
              {messages.length === 0 && !isLoading && (
                <div className="coach-empty">
                  <div className="coach-empty-avatar">
                    <Sparkles size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="coach-empty-title">
                    {firstName ? `Salut ${firstName} !` : 'Salut !'}
                  </h3>
                  <p className="coach-empty-text">
                    Je suis ton coach financier et discipline. Pose-moi une question sur tes finances, tes habitudes ou tes objectifs.
                  </p>
                  <div className="coach-suggestions">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        className="coach-suggestion"
                        onClick={() => sendMessage(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`coach-msg ${msg.role === 'user' ? 'coach-msg-user' : 'coach-msg-assistant'}`}
                >
                  <div className={`coach-bubble ${msg.role === 'user' ? 'coach-bubble-user' : 'coach-bubble-assistant'}`}>
                    <p className="coach-bubble-text">{msg.content}</p>
                  </div>

                  {/* Feedback buttons for assistant messages */}
                  {msg.role === 'assistant' && !msg.content.startsWith('Problème de connexion') && (
                    <div className="coach-feedback">
                      <button
                        onClick={() => sendFeedback(msg.id, 1)}
                        className={`coach-feedback-btn ${msg.feedback === 1 ? 'coach-feedback-active' : ''}`}
                        aria-label="Utile"
                        title="Utile"
                      >
                        <ThumbsUp size={13} strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => sendFeedback(msg.id, -1)}
                        className={`coach-feedback-btn ${msg.feedback === -1 ? 'coach-feedback-active-neg' : ''}`}
                        aria-label="Pas utile"
                        title="Pas utile"
                      >
                        <ThumbsDown size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="coach-msg coach-msg-assistant">
                  <div className="coach-bubble coach-bubble-assistant coach-bubble-loading">
                    <Loader2 size={16} className="coach-spinner" />
                    <span className="coach-loading-text">{loadingStatus}</span>
                  </div>
                </div>
              )}

              {/* Network error retry */}
              {networkError && (
                <div className="coach-network-error">
                  <WifiOff size={16} strokeWidth={1.8} />
                  <span>Connexion perdue</span>
                  <button
                    onClick={() => {
                      setNetworkError(false);
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) sendMessage(lastUserMsg.content);
                    }}
                    className="coach-retry-btn"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="coach-footer">
              {/* Input area */}
              <div className="coach-input-wrapper">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pose ta question…"
                  className="coach-input"
                  rows={1}
                  maxLength={1000}
                  disabled={isLoading}
                  aria-label="Message pour Coach Abraham"
                />
                <div className="coach-input-actions">
                  {input.length > 800 && (
                    <span className="coach-char-count">{input.length}/1000</span>
                  )}
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="coach-send-btn"
                    aria-label="Envoyer"
                  >
                    <Send size={16} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="coach-disclaimer">
                Coach Abraham est une IA et peut faire des erreurs. Pense à vérifier ses réponses.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
