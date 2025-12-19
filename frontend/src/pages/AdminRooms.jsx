import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminRooms() {
  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [chatworkRooms, setChatworkRooms] = useState([]);
  const [chatworkLoading, setChatworkLoading] = useState(false);
  const [syncingRoomId, setSyncingRoomId] = useState(null);
  const [companyForm, setCompanyForm] = useState({ name: '' });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [form, setForm] = useState({ name: '', chatwork_room_id: '', company_id: '' });
  const [messageInputs, setMessageInputs] = useState({});
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
      setError(err.response?.data?.error || 'Failed to load Chatwork rooms');
    } finally {
      setChatworkLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchChatworkRooms();
  }, []);

  const handleCompanyCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCompanyLoading(true);
    try {
      const name = companyForm.name.trim();
      if (!name) {
        setError('顧客名を入力してください');
        return;
      }
      await axios.post('/api/admin/companies', { name });
      setCompanyForm({ name: '' });
      setSuccess('顧客を追加しました');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || '顧客追加に失敗しました');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/admin/rooms', {
        name: form.name,
        chatwork_room_id: form.chatwork_room_id || null,
        company_id: form.company_id || null
      });
      setForm({ name: '', chatwork_room_id: '', company_id: '' });
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
      await axios.post(`/api/admin/rooms/${roomId}/chatwork`, {
        chatwork_room_id: chatworkRoomId || null
      });
      setSuccess('Chatwork room updated');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update Chatwork room');
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
      const skipped = res.data?.skipped ?? 0;
      setSuccess(`Synced ${imported} messages (fetched ${fetched}, skipped ${skipped})`);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync messages');
    } finally {
      setSyncingRoomId(null);
    }
  };

  const handleImport = async (roomId) => {
    setError('');
    setSuccess('');
    const raw = messageInputs[roomId] || '[]';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      setError('メッセージJSONのパースに失敗しました');
      return;
    }

    try {
      await axios.post(`/api/admin/rooms/${roomId}/messages`, { messages: parsed });
      setSuccess('メッセージを取り込みました');
      setMessageInputs((prev) => ({ ...prev, [roomId]: '' }));
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'メッセージ取り込みに失敗しました');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">ルーム管理</div>
      </div>
      <div className="card-body">
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <h3 className="topic-title">顧客追加</h3>
        <form className="admin-form" onSubmit={handleCompanyCreate}>
          <div className="form-row">
            <label>顧客名</label>
            <input
              type="text"
              required
              value={companyForm.name}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={companyLoading || loading}>
            顧客を追加
          </button>
        </form>

        <h3 className="topic-title" style={{ marginTop: '24px' }}>ルーム追加</h3>
        <form className="admin-form" onSubmit={handleCreate}>
          <div className="form-row">
            <label>ルーム名</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Chatwork Room ID</label>
            <input
              type="text"
              value={form.chatwork_room_id}
              onChange={(e) => setForm((prev) => ({ ...prev, chatwork_room_id: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Chatwork Room (API)</label>
            <select
              value={form.chatwork_room_id}
              onChange={(e) => setForm((prev) => ({ ...prev, chatwork_room_id: e.target.value }))}
              disabled={chatworkLoading}
            >
              <option value="">Select a room</option>
              {chatworkRooms.map((room) => (
                <option key={room.room_id} value={room.room_id}>
                  {room.name} ({room.room_id})
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>紐づけ顧客</label>
            <select
              value={form.company_id}
              onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
            >
              <option value="">未設定</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            ルームを追加
          </button>
        </form>

        <div style={{ marginTop: '24px' }}>
          <h3 className="topic-title">既存ルーム</h3>
          {loading && <div>読み込み中...</div>}
          {!loading && rooms.length === 0 && <div className="text-muted">ルームがありません。</div>}

          <div className="room-list">
            {rooms.map((room) => (
              <div className="room-card" key={room.id}>
                <div className="room-header">
                  <div>
                    <div className="room-name">{room.name}</div>
                    <div className="text-muted">Room ID: {room.chatwork_room_id || '-'}</div>
                  </div>
                  <div>
                    <label className="label-sm">紐づけ顧客</label>
                    <select
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
                  </div>
                  <div>
                    <label className="label-sm">Chatwork Room</label>
                    <select
                      value={room.chatwork_room_id || ''}
                      onChange={(e) => handleChatworkRoom(room.id, e.target.value || null)}
                      disabled={chatworkLoading}
                    >
                      <option value="">Not set</option>
                      {chatworkRooms.map((cwRoom) => (
                        <option key={cwRoom.room_id} value={cwRoom.room_id}>
                          {cwRoom.name} ({cwRoom.room_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-sm-outline"
                      onClick={() => handleSync(room.id)}
                      disabled={!room.chatwork_room_id || syncingRoomId === room.id}
                    >
                      {syncingRoomId === room.id ? 'Syncing...' : 'Sync Chatwork'}
                    </button>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '12px' }}>
                  <label>メッセージJSONを貼り付け</label>
                  <textarea
                    rows="4"
                    value={messageInputs[room.id] || ''}
                    onChange={(e) => setMessageInputs((prev) => ({ ...prev, [room.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn-sm-outline"
                    style={{ marginTop: '8px', alignSelf: 'flex-start' }}
                    onClick={() => handleImport(room.id)}
                  >
                    取り込み
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
