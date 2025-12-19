import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async (q = '') => {
    try {
      const res = await axios.get(`/api/companies?q=${q}`);
      setCompanies(res.data.companies);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCompanies(search);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">顧客一覧</div>
        <form onSubmit={handleSearch} className="search-box">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="会社名を検索..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <button type="submit" className="btn-primary">検索</button>
        </form>
      </div>
      <div className="card-body p-0"> {/* padding 0 for edge-to-edge table */}
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>会社名</th>
                <th style={{ width: '25%' }}>最終メッセージ</th>
                <th style={{ width: '25%' }}>要約生成日時</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colspan="4" className="empty-state">
                    顧客が見つかりません。
                  </td>
                </tr>
              ) : (
                companies.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="company-name">{c.name}</div>
                    </td>
                    <td className="text-muted">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleString('ja-JP') : '-'}
                    </td>
                    <td className="text-muted">
                      {c.summary_generated_at ? new Date(c.summary_generated_at).toLocaleString('ja-JP') : '-'}
                    </td>
                    <td>
                      <Link to={`/companies/${c.id}`} className="link-action">詳細 &rarr;</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
