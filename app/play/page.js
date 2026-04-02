'use client';
import { useRouter } from 'next/navigation';

export default function Play() {
  const router = useRouter();
  const activeLobbies = [];

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/menu')}
          className="text-gray-400 text-sm"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-black text-white">Play AfriDice</h2>
          <p className="text-gray-400 text-xs">Find or create a game</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => router.push('/play/create')}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-sm active:scale-95 transition-transform"
        >
          🎲 Create Room
        </button>
        <button
          onClick={() => router.push('/play/join')}
          className="flex-1 py-3 rounded-xl bg-[#ffffff15] border border-white/20 text-white font-bold text-sm active:scale-95 transition-transform"
        >
          🔑 Join Room
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base">Players in Lobby</h3>
          <button className="text-yellow-400 text-xs font-semibold">
            Refresh ↻
          </button>
        </div>

        {activeLobbies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="text-4xl">🎯</div>
            <p className="text-gray-400 text-sm text-center">
              No active lobbies right now.
            </p>
            <p className="text-gray-500 text-xs text-center">
              Create a room and invite a friend to start playing.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeLobbies.map((lobby, i) => (
              <div key={i} className="w-full p-4 rounded-xl bg-[#ffffff10] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{lobby.creator}</p>
                  <p className="text-gray-400 text-xs">Stake: ${lobby.stake} USDC</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-black text-xs">
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
