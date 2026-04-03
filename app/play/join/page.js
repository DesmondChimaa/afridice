'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase';
import { ref, get, update } from 'firebase/database';

export default function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    const snapshot = await get(ref(db, `rooms/${code}`));
    if (!snapshot.exists()) {
      setError('Room not found. Check the code and try again.');
      setRoomData(null);
    } else {
      const data = snapshot.val();
      if (data.status !== 'waiting') {
        setError('This room is no longer available.');
        setRoomData(null);
      } else {
        setRoomData(data);
      }
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!roomData) return;
    setLoading(true);
    await update(ref(db, `rooms/${code}`), {
      player2: 'Player 2',
      status: 'ready',
    });
    setLoading(false);
    router.push(`/game?code=${code}&player=2`);
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/play')} className="text-gray-400 text-sm">← Back</button>
        <div>
          <h2 className="text-xl font-black text-white">Join Room</h2>
          <p className="text-gray-400 text-xs">Enter the code your friend shared</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-white font-bold text-sm mb-4">Enter 6-Digit Room Code</p>
        <div className="flex justify-center gap-2 mb-4">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className={`w-12 h-14 rounded-xl border flex items-center justify-center ${
              code[i] ? 'bg-yellow-400/20 border-yellow-400' : 'bg-[#ffffff10] border-white/20'
            }`}>
              <span className="text-2xl font-black text-yellow-400">{code[i] || ''}</span>
            </div>
          ))}
        </div>

        <input
          type="number"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const val = e.target.value.slice(0, 6);
            setCode(val);
            setError('');
            setRoomData(null);
          }}
          placeholder="Tap here to enter code"
          className="w-full bg-[#ffffff10] border border-white/20 rounded-xl px-4 py-4 text-white text-center text-lg font-bold outline-none focus:border-yellow-400 transition-colors"
        />

        {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
      </div>

      {!roomData && (
        <button
          onClick={handleLookup}
          disabled={code.length !== 6 || loading}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 mb-3 ${
            code.length === 6
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg'
              : 'bg-[#ffffff10] text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? '⏳ Searching...' : '🔍 Find Room'}
        </button>
      )}

      {roomData && (
        <>
          <div className="bg-[#ffffff08] border border-green-500/30 rounded-xl p-4 mb-6">
            <p className="text-green-400 text-xs uppercase tracking-widest mb-3 font-semibold">✓ Room Found!</p>
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-300 text-sm">Room Code</p>
              <p className="text-yellow-400 font-black text-sm">{roomData.code}</p>
            </div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-300 text-sm">Stake Amount</p>
              <p className="text-yellow-400 font-black text-sm">{roomData.stake} USDC</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-300 text-sm">Winner Gets</p>
              <p className="text-green-400 font-black text-sm">
                {roomData.stake === 'Free' ? 'Bragging Rights 😄' : '97% of total pot'}
              </p>
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-400 to-green-600 text-black font-black text-lg active:scale-95 transition-transform shadow-lg"
          >
            {loading ? '⏳ Joining...' : '🎯 Join Game'}
          </button>
        </>
      )}
    </div>
  );
}