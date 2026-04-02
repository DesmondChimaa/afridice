'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function WaitingRoom() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get('code');
  const stake = params.get('stake');
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (timeLeft <= 0) {
      router.push('/play');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, router]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  function handleShare() {
    const message = `Join my AfriDice game! 🎲\nRoom Code: ${code}\nStake: ${stake} USDC\nOpen AfriDice and click "Join Room"`;
    if (navigator.share) {
      navigator.share({ text: message });
    } else {
      navigator.clipboard.writeText(message);
      alert('Copied to clipboard! Share with your friend.');
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/play')}
          className="text-gray-400 text-sm"
        >
          ← Cancel
        </button>
        <h2 className="text-xl font-black text-white">Waiting for opponent</h2>
      </div>

      {/* Room Code */}
      <div className="bg-[#ffffff08] border border-white/10 rounded-2xl p-6 mb-6 text-center">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Your Room Code</p>
        <div className="flex justify-center gap-2 mb-4">
          {code && code.split('').map((digit, i) => (
            <div key={i} className="w-12 h-14 rounded-xl bg-[#ffffff15] border border-white/20 flex items-center justify-center">
              <span className="text-2xl font-black text-yellow-400">{digit}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-xs">Share this code with your friend</p>
      </div>

      {/* Stake info */}
      <div className="bg-[#ffffff08] border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-300 text-sm">Stake Amount</p>
          <p className="text-yellow-400 font-black text-sm">{stake} USDC</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-gray-300 text-sm">Winner Gets</p>
          <p className="text-green-400 font-black text-sm">
            {stake === 'Free' ? 'Bragging Rights 😄' : '97% of total pot'}
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="text-center mb-6">
        <p className="text-gray-400 text-xs mb-1">Room expires in</p>
        <p className={`text-3xl font-black ${timeLeft <= 30 ? 'text-red-400' : 'text-white'}`}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <div className="w-full bg-[#ffffff10] rounded-full h-2 mt-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000"
            style={{ width: `${(timeLeft / 300) * 100}%` }}
          />
        </div>
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{animationDelay:'0ms'}}/>
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{animationDelay:'150ms'}}/>
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{animationDelay:'300ms'}}/>
        <p className="text-gray-400 text-sm ml-1">Waiting for friend to join...</p>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-lg active:scale-95 transition-transform"
      >
        📤 Share Room Code
      </button>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center"><p className="text-white">Loading...</p></div>}>
      <WaitingRoom />
    </Suspense>
  );
}
