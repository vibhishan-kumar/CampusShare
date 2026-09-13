import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  MessageSquare, 
  User, 
  Package, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvoId = searchParams.get('convo');

  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const starterChips = [
    'Hi! Is this item available for borrowing this week?',
    'Can we meet near the campus library for handover?',
    'Are all original accessories and cables included?',
    'I just sent a borrow request, please check when free!',
  ];

  // 1. Fetch Conversations
  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      if (res.success) {
        setConversations(res.conversations);
        // If no active convo in URL and convos exist, select first
        if (!activeConvoId && res.conversations.length > 0) {
          setSearchParams({ convo: res.conversations[0].id });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // 2. Fetch Messages for Active Conversation
  const loadMessages = async (convoId) => {
    if (!convoId) return;
    try {
      const res = await api.getMessages(convoId);
      if (res.success) {
        setActiveConvo(res.conversation);
        setMessages(res.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeConvoId) {
      loadMessages(activeConvoId);
      // Poll every 4 seconds for new incoming messages
      const interval = setInterval(() => loadMessages(activeConvoId), 4000);
      return () => clearInterval(interval);
    }
  }, [activeConvoId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!text || !activeConvoId) return;

    if (user?.is_banned) {
      alert('Your campus account has been suspended by the campus administrator. You cannot send messages.');
      return;
    }

    setSending(true);
    setInputText('');

    try {
      const res = await api.sendMessage(activeConvoId, { message_text: text });
      if (res.success) {
        setMessages(prev => [...prev, res.data]);
        loadConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquare size={28} color="var(--primary)" /> Campus Messages
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Directly coordinate handover times, check item condition, and arrange deposit return with fellow students.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {user && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
              }}
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || '')}`}
                alt={user.name}
                style={{ width: '22px', height: '22px', borderRadius: '50%' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>Active Session:</span>
              <strong style={{ color: 'var(--text-main)' }}>{user.name}</strong>
            </div>
          )}
          <Link to="/browse" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Package size={15} /> Browse Marketplace
          </Link>
        </div>
      </div>

      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          minHeight: '640px',
          height: '70vh',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Left Column: Conversations List */}
        <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Conversations ({conversations.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
              Live
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingConvos ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <MessageSquare size={24} />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>No conversations yet</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  When you click <strong>"Let's Chat"</strong> on any campus item, your active chats will appear here.
                </p>
                <Link to="/browse" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                  Find Items to Chat
                </Link>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = String(c.id) === String(activeConvoId);
                return (
                  <div
                    key={c.id}
                    onClick={() => setSearchParams({ convo: c.id })}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={c.other_user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.other_user_name)}`}
                      alt={c.other_user_name}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.other_user_name}
                        </span>
                        {c.unread_count > 0 && (
                          <span className="badge-counter">{c.unread_count}</span>
                        )}
                      </div>
                      {c.item_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Re: {c.item_name}
                        </div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.last_message || 'Start chatting...'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Box OR Use Case Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa' }}>
          {activeConvo ? (
            <>
              {/* Chat Header with Item Context */}
              <div style={{ padding: '0.85rem 1.25rem', background: '#ffffff', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={activeConvo.other_user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeConvo.other_user_name || '')}`}
                    alt={activeConvo.other_user_name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {activeConvo.other_user_name}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '999px', fontWeight: 700 }}>
                        <ShieldCheck size={11} /> Verified Student
                      </span>
                    </div>
                    {activeConvo.item_name && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Discussing: <strong style={{ color: 'var(--text-main)' }}>{activeConvo.item_name}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {activeConvo.item_id && (
                  <Link
                    to={`/items/${activeConvo.item_id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    View Item <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* Messages Stream */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '420px', padding: '1rem' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <Sparkles size={22} />
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                      Start Chatting with {activeConvo.other_user_name}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      Coordinate handover location, confirm timings, or clarify questions about the item condition.
                    </p>

                    {/* Quick Question Chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Quick Question Suggestions:
                      </span>
                      {starterChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          style={{
                            padding: '0.55rem 0.85rem',
                            background: '#ffffff',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8rem',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = '#ffffff'; }}
                        >
                          "{chip}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = Number(m.sender_id) === Number(user?.id);
                    const senderLabel = isMine ? 'You' : (m.sender_name || activeConvo.other_user_name || 'Counterpart');
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: isMine ? 'var(--primary)' : '#64748b',
                            marginBottom: '0.2rem',
                            padding: '0 0.25rem',
                          }}
                        >
                          {senderLabel}
                        </span>
                        <div
                          style={{
                            padding: '0.65rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.88rem',
                            lineHeight: 1.45,
                            backgroundColor: isMine ? 'var(--primary)' : '#ffffff',
                            color: isMine ? '#ffffff' : 'var(--text-main)',
                            border: isMine ? 'none' : '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {m.message_text}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem', padding: '0 0.25rem' }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleFormSubmit}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: '#ffffff',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder={
                    user?.is_banned
                      ? '⚠️ Account suspended: You cannot write or send messages.'
                      : `Type message to ${activeConvo.other_user_name ? activeConvo.other_user_name.split(' ')[0] : 'user'} (e.g. Can we meet near library at 5 PM?)...`
                  }
                  className="form-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={Boolean(user?.is_banned) || sending}
                  style={{
                    flex: 1,
                    backgroundColor: user?.is_banned ? '#fef2f2' : undefined,
                    color: user?.is_banned ? '#b91c1c' : undefined,
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!inputText.trim() || Boolean(user?.is_banned) || sending}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.65rem 1.1rem' }}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            /* USE CASE & ONBOARDING GUIDE: Shown when no conversation is selected or 0 convos */
            <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1rem' }}>
                  <HelpCircle size={14} /> Campus Messaging System
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  What is the Campus Messages Hub used for?
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                  In a university peer-to-peer rental ecosystem, items aren't shipped via courier—fellow students hand over gadgets, books, and sports gear in person. Campus Messages provides a private, verified channel for all rental interactions:
                </p>

                {/* 4 Use Case Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ background: '#ffffff', padding: '1rem 1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <MapPin size={18} /> 1. Handover Spot & Time
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                      Agree on a convenient meetup location (e.g. Indira Gandhi Memorial Library, MH-J Hostel, LH, or Shopping Complex) and specific pickup time.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', padding: '1rem 1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#0284c7', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Package size={18} /> 2. Item Pre-Check & Specs
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                      Ask the owner questions before sending money: battery health, included cables, SD cards, calculator formulas, or condition notes.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', padding: '1rem 1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>
                      <ShieldCheck size={18} /> 3. Privacy & Safety
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                      No need to expose your personal phone number or personal WhatsApp on the internet. Chat securely with authenticated @uohyd.ac.in peers.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', padding: '1rem 1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#d97706', fontWeight: 700, fontSize: '0.9rem' }}>
                      <CheckCircle2 size={18} /> 4. Safe Return & Deposit
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                      Verify item condition at the end of the rental period and coordinate prompt deposit refunds directly with the owner.
                    </p>
                  </div>
                </div>

                {/* Direct Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Link to="/browse" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', fontWeight: 700 }}>
                    Browse Campus Items to Chat <ArrowRight size={16} />
                  </Link>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Or open any item and click <strong>"Let's Chat"</strong>!
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
