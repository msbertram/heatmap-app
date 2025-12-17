'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-screen w-full bg-slate-900 text-white flex items-center justify-center">Loading Application...</div>
});

export default function Home() {
  return (
    <main>
      <Map />
    </main>
  );
}
