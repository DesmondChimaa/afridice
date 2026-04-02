'use client';
import { useRouter } from 'next/navigation';

export default function Menu() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl mb-4">
          <span className="text-4xl">🎲</span>
        </div>
        <h1 className="text-4xl font-black text-white">
          Afri<span className="text-yellow-400">Dice</span>
        </h1>
        <p className="text-gray-400 text-xs tracking-widest uppercase mt-1">Roll. Win. Earn.</p>
      </div>

      {/* Menu Buttons */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        <button
          onClick={() => router.push('/play')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-lg shadow-lg active:scale-95 transition-transform"
        >
          🎮 Play
        </button>

        <button
          onClick={() => router.push('/settings')}
          className="w-full py-4 rounded-2xl bg-[#ffffff15] border border-white/20 text-white font-bold text-lg active:scale-95 transition-transform"
        >
          ⚙️ Settings
        </button>

        <button
          className="w-full py-4 rounded-2xl bg-[#ffffff15] border border-white/20 text-white font-bold text-lg active:scale-95 transition-transform"
        >
          📤 Share
        </button>
      </div>

      {/* Version */}
      <p className="text-gray-600 text-xs mt-10">AfriDice v1.0 • Built on Base</p>
    </div>
  );
}