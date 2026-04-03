'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase';
import { ref, set } from 'firebase/database';

const STAKE_OPTIONS = ['Free', '$1', '$3', '$5', '$10', 'Custom'];

export default function CreateRoom() {
  const router = useRouter();
  const [selectedStake, setSelectedStake] = useState('$1');
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleStakeSelect(option) {
    if (option === 'Custom') {
      setShowCustom(true);
      setSelectedStake('Custom');
    } else {
      setShowCustom(false);
      setSelectedStake(option);
    }
  }

  async function handleCreate() {
    const stake = selectedStake === 'Custom' ? `$${customAmount}` : selectedStake;
    if (selectedStake === 'Custom' && !customAmount) {
      alert('Please enter a custom amount');
      return;
    }

    setLoading(true);

    // Generate 6-digit room code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save room to Firebase
    await set(ref(db, `rooms/${code}`), {
      code,
      stake,
      status: 'waiting',
      createdAt: Date.now(),
      player1: 'Player 1',
      player2: null,
    });

    setLoading(false);
    router.push(`/play/waiting?code=${code}&stake=${stake}`);
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/play')} className="text-gray-400 text-sm">← </button>
        <div>
          <h2 className="text-xl font-black text-white">Create Room</h2>
          <p className="text-gray-400 text-xs">Set your stake and invite a friend</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-white font-bold text-sm mb-3">Select Stake Amount</p>
        <div className="grid grid-cols-3 gap-3">
          {STAKE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleStakeSelect(option)}
              className={`py-4 rounded-xl font-black text-sm transition-all active:scale-95 ${
                selectedStake === option
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black scale-105 shadow-lg'
                  : 'bg-[#ffffff10] border border-white/10 text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="mt-4">
            <div className="flex items-center gap-2 bg-[#ffffff10] border border-white/20 rounded-xl px-4 py-3">
              <span className="text-yellow-400 font-black text-lg">$</span>
              <input
                type="number"
                placeholder="Enter amount in USDC"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-transparent text-white flex-1 outline-none text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#ffffff08] border border-white/10 rounded-xl p-4 mb-8">
        <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wider">Game Info</p>
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-300 text-sm">Stake Amount</p>
          <p className="text-yellow-400 font-black text-sm">
            {selectedStake === 'Custom' ? (customAmount ? `$${customAmount}` : '—') : selectedStake} USDC
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-300 text-sm">Treasury Fee</p>
          <p className="text-gray-400 text-sm">3%</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-gray-300 text-sm">Winner Gets</p>
          <p className="text-green-400 font-black text-sm">
            {selectedStake === 'Free' ? 'Bragging Rights 😄' : '97% of total pot'}
          </p>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-lg active:scale-95 transition-transform shadow-lg disabled:opacity-60"
      >
        {loading ? '⏳ Creating Room...' : '🎲 Create Room'}
      </button>
    </div>
  );
}