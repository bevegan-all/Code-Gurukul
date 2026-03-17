import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, User, ShieldCheck } from 'lucide-react';
import api from '../../utils/axios';

const AdminSettings = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setFormData(prev => ({ ...prev, name: parsed.name }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.newPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        return setMessage({ type: 'error', text: 'Current password is required to change password.' });
      }
      if (formData.newPassword.length < 6) {
        return setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      }
      if (formData.newPassword !== formData.confirmPassword) {
        return setMessage({ type: 'error', text: 'New passwords do not match.' });
      }
    }

    setLoading(true);
    try {
      const res = await api.put('/admin/settings', {
        name: formData.name,
        currentPassword: formData.currentPassword || undefined,
        newPassword: formData.newPassword || undefined,
      });

      // Update local storage so the Header updates
      localStorage.setItem('user', JSON.stringify({
        ...user,
        name: res.data.user.name
      }));
      setUser(prev => ({ ...prev, name: res.data.user.name }));

      setMessage({ type: 'success', text: res.data.msg || 'Settings updated successfully!' });
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      
      // Dispatch custom event if we want header to re-render, though React state might need a hard refresh for Header outside context.
      window.dispatchEvent(new Event('storage'));
      
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update settings.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="animate-slide-in space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            System Settings
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage your administrator account preferences and security.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Administrator Profile
          </h3>
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">Admin Access</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {message.text}
            </div>
          )}

          {/* Profile Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> General Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                  title="System emails cannot be changed directly."
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Security Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-400" /> Security & Password
            </h4>
            <p className="text-xs text-gray-500 mb-4">Leave fields blank if you do not wish to change your password.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password to authorize changes"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Retype new password"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
