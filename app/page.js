'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/menu');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
          <span className="text-5xl">🎲</span>
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-wider">
            Afri<span className="text-yellow-400">Dice</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase">
            Roll. Win. Earn.
          </p>
        </div>
      </div>
    </div>
  );
}