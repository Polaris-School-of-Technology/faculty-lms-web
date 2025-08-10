import { useState } from 'react';

const LoginPage = ({ onLogin, error, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full bg-black shadow-lg rounded-lg p-8 border border-gray-800">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Faculty Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">Email Address</label>
            <input
              id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-[#FFC540] focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">Password</label>
            <input
              id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-[#FFC540] focus:border-transparent"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 border-0 rounded-md shadow-sm text-sm font-medium text-black bg-[#FFC540] hover:bg-[#e6b138] disabled:bg-[#b38a2a] transition-colors"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
