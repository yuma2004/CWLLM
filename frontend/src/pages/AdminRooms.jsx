import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, RefreshCw, MessageSquare, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminRooms() {
  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [chatworkRooms, setChatworkRooms] = useState([]);
  const [chatworkLoading, setChatworkLoading] = useState(false);
  const [syncingRoomId, setSyncingRoomId] = useState(null);

  // ルーム追加フォーム（nameは自動取得のため削除）
  const [roomForm, setRoomForm] = useState({ chatwork_room_id: '', company_id: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/rooms');
      setCompanies(res.data.companies || []);
      setRooms(res.data.rooms || []);
    } catch (err) {
      setError('ルーム情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatworkRooms = async () => {
    setChatworkLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/chatwork/rooms');
      setChatworkRooms(res.data.rooms || []);
    } catch (err) {
      // Chatwork連携が未設定の場合などエラーになる可能性があるので、静かにログ出力
      console.warn('Chatwork rooms fetch failed:', err);
    } finally {
      setChatworkLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchChatworkRooms();
  }, []);

  const handleRoomCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!roomForm.chatwork_room_id) {
      setError('Chatworkルームを選択してください');
      return;
    }

    // Chatworkルーム名を取得して設定
    const selectedCwRoom = chatworkRooms.find(r => String(r.room_id) === String(roomForm.chatwork_room_id));
    const roomName = selectedCwRoom ? selectedCwRoom.name : 'Unknown Room';

    try {
      await axios.post('/api/admin/rooms', {
        name: roomName,
        chatwork_room_id: roomForm.chatwork_room_id,
        company_id: roomForm.company_id || null
      });
      setRoomForm({ chatwork_room_id: '', company_id: '' });
      setSuccess('ルームを追加しました');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'ルーム追加に失敗しました');
    }
  };

  const handleLink = async (roomId, companyId) => {
    setError('');
    setSuccess('');
    try {
      await axios.post(`/api/admin/rooms/${roomId}/link`, { company_id: companyId || null });
      setSuccess('紐づけを更新しました');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || '紐づけ更新に失敗しました');
    }
  };

  const handleChatworkRoom = async (roomId, chatworkRoomId) => {
    setError('');
    setSuccess('');
    try {
      // Update room link in DB
      await axios.post(`/api/admin/rooms/${roomId}/chatwork`, {
        chatwork_room_id: chatworkRoomId || null
      });
      
      // If linked to a new chatwork room, maybe we should update the name too?
      // For now, keep the name as is, or maybe the user wants to rename manually?
      // Current requirement: "Room name and CW room name can be same".
      // But this function is for existing rooms. Let's just link it.
      
      setSuccess('Chatwork連携を更新しました');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Chatwork連携の更新に失敗しました');
    }
  };

  const handleSync = async (roomId) => {
    setError('');
    setSuccess('');
    setSyncingRoomId(roomId);
    try {
      const res = await axios.post(`/api/admin/rooms/${roomId}/sync`, { force: true });
      const imported = res.data?.imported ?? 0;
      const fetched = res.data?.fetched ?? 0;
      setSuccess(`同期完了: ${fetched}件取得, ${imported}件保存しました`);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'メッセージ同期に失敗しました');
    } finally {
      setSyncingRoomId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Settings className="icon-mr" size={20} />
          管理設定
        </div>
      </div>
      
      <div className="card-body">
        {/* Alerts */}
        {error && (
          <div className="alert error mb-4">
            <AlertCircle size={16} className="icon-mr" />
            {error}
          </div>
        )}
        {success && (
          <div className="alert success mb-4">
            <CheckCircle size={16} className="icon-mr" />
            {success}
          </div>
        )}

        {/* Room Add Form */}
        <div className="panel mb-4" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '8px' }}>
          <h3 className="topic-title flex-center mb-4">
            <MessageSquare size={18} className="icon-mr" />
            Chatworkルームから追加
          </h3>
          <form onSubmit={handleRoomCreate} className="admin-form" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="label-sm mb-2">Chatwork Room (API)</label>
              <select
                className="input-field"
                value={roomForm.chatwork_room_id}
                onChange={(e) => setRoomForm(prev => ({ ...prev, chatwork_room_id: e.target.value }))}
                disabled={chatworkLoading}
                required
              >
                <option value="">選択してください</option>
                {chatworkRooms.map(room => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.name} ({room.room_id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label className="label-sm mb-2">紐づけ顧客（任意）</label>
              <select
                className="input-field"
                value={roomForm.company_id}
                onChange={(e) => setRoomForm(prev => ({ ...prev, company_id: e.target.value }))}
              >
                <option value="">未設定</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: '0 0 150px' }}>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                <Plus size={16} className="icon-mr" />
                追加
              </button>
            </div>
          </form>
        </div>

        {/* Room List Table */}
        <div>
          <h3 className="topic-title mb-4">登録済みルーム一覧</h3>
          
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>ルーム名</th>
                  <th style={{ width: '15%' }}>Chatwork ID</th>
                  <th style={{ width: '25%' }}>Chatwork連携 (API)</th>
                  <th style={{ width: '20%' }}>紐づけ顧客</th>
                  <th style={{ width: '10%' }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">ルームが登録されていません</td>
                  </tr>
                ) : (
                  rooms.map(room => (
                    <tr key={room.id}>
                      <td className="font-medium">{room.name}</td>
                      <td className="text-muted text-sm">{room.chatwork_room_id || '-'}</td>
                      <td>
                        <select
                          className="input-field-sm"
                          value={room.chatwork_room_id || ''}
                          onChange={(e) => handleChatworkRoom(room.id, e.target.value || null)}
                          disabled={chatworkLoading}
                        >
                          <option value="">未連携</option>
                          {chatworkRooms.map((cwRoom) => (
                            <option key={cwRoom.room_id} value={cwRoom.room_id}>
                              {cwRoom.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="input-field-sm"
                          value={room.company_id || ''}
                          onChange={(e) => handleLink(room.id, e.target.value || null)}
                        >
                          <option value="">未設定</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-sm-outline flex-center gap-1"
                          onClick={() => handleSync(room.id)}
                          disabled={!room.chatwork_room_id || syncingRoomId === room.id}
                          title="Chatworkからメッセージを同期"
                        >
                          <RefreshCw size={14} className={syncingRoomId === room.id ? 'spin' : ''} />
                          {syncingRoomId === room.id ? '同期中' : '同期'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
