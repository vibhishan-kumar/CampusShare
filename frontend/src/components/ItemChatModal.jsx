import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles,
  MapPin,
  Clock
} from 'lucide-react';

export default function ItemChatModal({ item, isOpen, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Quick suggestion chips to start conversation easily
  const suggestionChips = [
    `Hi ${item?.owner_name?.split(' ')[0] || 'there'}, is this available to borrow?`,
    `Can we meet near ${item?.owner_hostel?.split('-')[0]?.trim() || 'campus'} for handover?`,
    `Are all original accessories / chargers included?`,
    `I've requested to borrow this, please check when free!`,
  ];

  // 1. Initialize or fetch conversation
  useEffect(() => {
    if (!isOpen || !item?.owner_id) return;

    let active = true;

    async function initChat() {
      setLoading(true);
      setError('');
      try {
        const res = await api.startConversation({
          target_user_id: item.owner_id,
          item_id: item.id,
        });

        if (!active) return;

        if (res.success && res.conversation) {
          setConvo(res.conversation);
          // Fetch existing messages
          try {
            const msgRes = await api.getMessages(res.conversation.id);
            if (active && msgRes.success) {
              setMessages(msgRes.messages || []);
            }
          } catch (msgErr) {
            console.error('Failed to load existing messages:', msgErr);
          }
        } else {
          setError(res.message || 'Unable to open conversation.');
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to open conversation.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initChat();

    return () => {
      active = false;
    };
  }, [isOpen, item?.id, item?.owner_id]);

  // 2. Poll for new messages every 3 seconds while modal is open and conversation is active
  useEffect(() => {
    if (!isOpen || !convo?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const msgRes = await api.getMessages(convo.id);
        if (msgRes.success) {
          setMessages(msgRes.messages || []);
        }
      } catch (err) {
        // silent background poll failure
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isOpen, convo?.id]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !item) return null;

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !convo?.id) return;

    if (user?.is_banned) {
      setError('Your campus account has been suspended by the administrator. You cannot send messages.');
      return;
    }

    setSending(true);
    setInputText('');

    try {
      const res = await api.sendMessage(convo.id, { message_text: text });
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleOpenFullChat = () => {
    onClose();
    if (convo?.id) {
      navigate(`/messages?convo=${convo.id}`);
    } else {
      navigate('/messages');
    }
  };

  const ownerFirstName = item.owner_name ? item.owner_name.split(' ')[0] : 'Owner';

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '520px', 
          height: '640px', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '0', 
          overflow: 'hidden', 
          borderRadius: 'var(--radius-lg)' 
        }}
      >
        {/* Chat Header */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', 
            color: '#ffffff', 
            padding: '1rem 1.25rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src={item.owner_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.owner_name || '')}`}
              alt={item.owner_name}
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.owner_name}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '999px', fontWeight: 700 }}>
                  <ShieldCheck size={12} /> Verified
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                {item.owner_hostel || 'UoH Campus'} • {item.owner_department || 'Student'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={handleOpenFullChat}
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                border: 'none', 
                color: '#ffffff', 
                borderRadius: 'var(--radius-sm)', 
                padding: '0.35rem 0.6rem', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.3rem', 
                cursor: 'pointer' 
              }}
              title="Open full-screen messages hub"
            >
              <ExternalLink size={13} /> Full Screen
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                border: 'none', 
                color: '#ffffff', 
                borderRadius: '50%', 
                width: '30px', 
                height: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer' 
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Item Context Strip */}
        <div 
          style={{ 
            background: '#f8fafc', 
            padding: '0.6rem 1.25rem', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            fontSize: '0.78rem' 
          }}
        >
          <img
            src={item.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
            alt={item.name}
            style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span style={{ color: 'var(--text-muted)' }}>Discussing: </span>
            <strong style={{ color: 'var(--text-main)' }}>{item.name}</strong>
          </div>
          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
            ₹{item.price_per_day}/day
          </span>
        </div>

        {/* Messages Body */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1rem 1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem', 
            background: '#fafafa' 
          }}
        >
          {error ? (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '1.5rem', maxWidth: '360px' }}>
              <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setError('');
                  setLoading(true);
                  api.startConversation({ target_user_id: item.owner_id, item_id: item.id })
                    .then(res => {
                      if (res.success && res.conversation) {
                        setConvo(res.conversation);
                        return api.getMessages(res.conversation.id);
                      }
                      throw new Error(res.message || 'Failed to start conversation');
                    })
                    .then(msgRes => {
                      if (msgRes?.success) setMessages(msgRes.messages || []);
                    })
                    .catch(err => setError(err.message || 'Failed to connect.'))
                    .finally(() => setLoading(false));
                }}
              >
                Retry Connection
              </button>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div>Connecting to {ownerFirstName}...</div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '340px' }}>
              <div 
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '50%', 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '0.75rem' 
                }}
              >
                <MessageSquare size={22} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                Start a Conversation with {ownerFirstName}
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '1rem' }}>
                Coordinate handover time, check item availability, or ask about condition before borrowing.
              </p>

              {/* Suggestion Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} /> Quick Questions:
                </span>
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: 'var(--shadow-sm)',
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
              const senderLabel = isMine ? 'You' : (m.sender_name || item?.owner_name || 'Owner');
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: isMine ? 'var(--primary)' : '#64748b',
                      marginBottom: '0.15rem',
                      padding: '0 0.2rem',
                    }}
                  >
                    {senderLabel}
                  </span>
                  <div
                    style={{
                      padding: '0.6rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                      backgroundColor: isMine ? 'var(--primary)' : '#ffffff',
                      color: isMine ? '#ffffff' : 'var(--text-main)',
                      border: isMine ? 'none' : '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {m.message_text}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem', padding: '0 0.2rem' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={handleFormSubmit}
          style={{
            padding: '0.75rem 1rem',
            background: '#ffffff',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder={`Message ${ownerFirstName}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading || sending}
            style={{ fontSize: '0.85rem' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputText.trim() || sending}
            style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
