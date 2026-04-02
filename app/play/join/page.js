'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleJoin() {
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    // For now navigate to game — Firebase will validate later
    router.push(`/game?code=${code}&player=2`);
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/play')}
          className="text-gray-400 text-sm"
        >
          ← Back
        </button>
        <div>
          <h2 className="text-xl font-black text-white">Join Room</h2>
          <p className="text-gray-400 text-xs">Enter the code your friend shared</p>
        </div>
      </div>

      {/* Code input */}
      <div className="mb-8">
        <p className="text-white font-bold text-sm mb-4">Enter 6-Digit Room Code</p>

        <div className="flex justify-center gap-2 mb-4">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className={`w-12 h-14 rounded-xl border flex items-center justify-center ${
              code[i] ? 'bg-yellow-400/20 border-yellow-400' : 'bg-[#ffffff10] border-white/20'
            }`}>
              <span className="text-2xl font-black text-yellow-400">
                {code[i] || ''}
              </span>
            </div>
          ))}
        </div>

        {/* Hidden input trick for mobile keyboard */}
        <input
          type="number"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const val = e.target.value.slice(0, 6);
            setCode(val);
            setError('');
          }}
          placeholder="Tap here to enter code"
          className="w-full bg-[#ffffff10] border border-white/20 rounded-xl px-4 py-4 text-white text-center text-lg font-bold outline-none focus:border-yellow-400 transition-colors"
        />

        {error && (
          <p className="text-red-400 text-xs text-center mt-2">{error}</p>
        )}
      </div>

      {/* Room preview — shows when code is 6 digits */}
      {code.length === 6 && (
        <div className="bg-[#ffffff08] border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Room Details</p>
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-300 text-sm">Room Code</p>
            <p className="text-yellow-400 font-black text-sm">{code}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-300 text-sm">Status</p>
            <p className="text-green-400 font-black text-sm">✓ Ready to join</p>
          </div>
        </div>
      )}

      {/* Join button */}
      <button
        onClick={handleJoin}
        disabled={code.length !== 6}
        className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${
          code.length === 6
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg'
            : 'bg-[#ffffff10] text-gray-500 cursor-not-allowed'
        }`}
      >
        🎯 Join Game
      </button>
    </div>
  );
}
