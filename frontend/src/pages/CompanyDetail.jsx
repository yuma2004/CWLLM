import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function CompanyDetail({ user }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [maxMessages, setMaxMessages] = useState(120);
  const [timelineLimit, setTimelineLimit] = useState(20); // タイムライン表示件数の制限

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/companies/${id}`);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      // Clear previous summary immediately
      setData(prev => ({ ...prev, summary: null }));
      
      const days = Number.isFinite(lookbackDays) ? lookbackDays : 30;
      const max = Number.isFinite(maxMessages) ? maxMessages : 120;
      const res = await axios.post(`/api/companies/${id}/regenerate`, {
        lookback_days: days,
        max_messages: max
      });
      // Update summary only
      setData(prev => ({ ...prev, summary: res.data.summary }));
    } catch (error) {
      console.error(error);
      alert('生成に失敗しました');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (!data) return <div>データが見つかりません。</div>;

  const { company, rooms, summary, messages } = data;

  // messages sort logic: server returns DESC (newest first).
  // Timeline shows oldest first (top to bottom).
  // So we reverse it and limit the display count.
  const sortedMessages = [...messages].reverse().slice(0, timelineLimit);

  return (
    <div className="dashboard-grid">
      {/* Left Column: Customer Info & Summary */}
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <div className="card-title">
            <span>📄 顧客概要 & AI要約</span>
          </div>
        </div>
        <div className="card-body">
          <div className="customer-title-block">
            <div className="label-sm">お客様名</div>
            <h2 className="customer-name-lg">{company.name}</h2>
            
            <div className="label-sm">Chatwork リンク</div>
            <div className="link-section">
              {rooms.length > 0 ? (
                rooms.map(room => (
                  <a key={room.id} href={`https://www.chatwork.com/#!rid${room.chatwork_room_id}`} target="_blank" rel="noreferrer">
                    {room.name} (Link) ↗
                  </a>
                ))
              ) : (
                <span className="text-muted">リンク設定なし</span>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="topic-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="topic-title" style={{ marginBottom: 0 }}>AI要約・分析</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Number(e.target.value))}
                  className="input-compact"
                  title="何日遡って要約するか"
                />
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>日分</span>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={maxMessages}
                  onChange={(e) => setMaxMessages(Number(e.target.value))}
                  className="input-compact"
                  title="最大メッセージ件数"
                />
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>件</span>
                <button 
                  onClick={handleRegenerate} 
                  className="btn-sm-outline"
                  disabled={regenerating}
                >
                  {regenerating ? '生成中...' : '再生成'}
                </button>
              </div>
            </div>

            {regenerating ? (
              <p className="text-muted">要約を生成しています...</p>
            ) : summary ? (
              <>
                <div className="label-sm" style={{ marginBottom: '8px' }}>
                  生成日時: {new Date(summary.generated_at).toLocaleString('ja-JP')}
                </div>
                <div className="topic-content">
                  <div style={{ whiteSpace: 'pre-wrap' }}>{summary.content}</div>
                </div>

                </>
            ) : (
              <p className="text-muted">要約データがありません。</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Timeline */}
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <div className="card-title">
            <span>📅 主要チャット履歴 (タイムライン)</span>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              表示中: {sortedMessages.length}件 / 全{messages.length}件
            </span>
            {messages.length > timelineLimit && (
              <button 
                onClick={() => setTimelineLimit(prev => prev + 20)} 
                className="btn-sm-outline"
                style={{ fontSize: '0.8rem' }}
              >
                さらに表示 (+20件)
              </button>
            )}
          </div>
          <div className="timeline-container" style={{ maxHeight: '600px', overflowY: 'auto', padding: '24px' }}>
            <div className="timeline-line"></div>
            
            {messages.length === 0 && (
              <p className="text-muted" style={{ paddingLeft: '40px' }}>メッセージがありません。</p>
            )}

            {sortedMessages.map((m, index) => {
              const isSelf = m.sender_name.includes('自社') || (user && m.sender_name === user.name);
              const bubbleClass = isSelf ? 'bubble-gray' : 'bubble-yellow';
              
              return (
                <div className="timeline-item" key={m.id}>
                  <div className="timeline-badge">{index + 1}</div>
                  <div className="timeline-content">
                    <div className="timeline-meta">
                      <span className="sender-name">{new Date(m.sent_at).toLocaleString('ja-JP')}</span>
                      {m.sender_name && (
                         <span style={{ fontWeight: 'bold' }}>[{m.room_name}] {m.sender_name}</span>
                      )}
                      <span>💬</span>
                    </div>
                    <div className={`timeline-bubble ${bubbleClass}`}>
                      {m.body_text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
