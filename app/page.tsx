"use client";
import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [params, setParams] = useState({
    n_facilities: 10,
    n_customers: 60,
    fuel_price: 25.0,
    trip_frequency: 20,
  });

  const handleSolve = async () => {
    setLoading(true);
    try {
      // LOCALDE TEST EDERKEN BURAYI: "http://127.0.0.1:8000/api/solve" YAP
      // VERCEL'DE: "/api/solve" OLARAK KALSIN
      const apiUrl = process.env.NODE_ENV === 'development'
        ? "http://127.0.0.1:8000/api/solve"
        : "/api/solve";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) throw new Error("API Bağlantı Hatası");
      const data = await res.json();
      setResult(data);
    } catch (error) {
      alert("Hata: Backend çalışmıyor olabilir. Localde 'uvicorn' çalıştırdın mı?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* SOL PANEL: AYARLAR (3 Sütun Genişlik) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h1 className="text-xl font-bold mb-4 text-indigo-900">Lojistik Simülasyonu</h1>

          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 mb-4 border border-blue-100">
            <p>ℹ️ <strong>Bilgi:</strong> Simülasyon 100x100 birimlik koordinat düzlemi üzerinde çalışır.</p>
            <p className="mt-1">🏠 <strong>Depo Kiraları:</strong> 100k - 250k TL arasında rastgele atanır.</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block font-medium text-gray-600 mb-1">Tesis Sayısı (Max 50)</label>
              <input type="number" min="2" max="50" className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={params.n_facilities} onChange={(e) => setParams({ ...params, n_facilities: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block font-medium text-gray-600 mb-1">Müşteri Sayısı (Max 200)</label>
              <input type="number" min="10" max="200" className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={params.n_customers} onChange={(e) => setParams({ ...params, n_customers: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block font-medium text-gray-600 mb-1">Yakıt (TL/km)</label>
              <input type="number" min="1" max="100" className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={params.fuel_price} onChange={(e) => setParams({ ...params, fuel_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block font-medium text-gray-600 mb-1">Aylık Sefer (1-30)</label>
              <input type="number" min="1" max="30" className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={params.trip_frequency} onChange={(e) => setParams({ ...params, trip_frequency: Number(e.target.value) })} />
            </div>

            <button
              onClick={handleSolve}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
            >
              {loading ? "Hesaplanıyor..." : "SİMÜLASYONU BAŞLAT"}
            </button>
          </div>
        </div>

        {/* ORTA PANEL: HARİTA (6 Sütun Genişlik) */}
        <div className="lg:col-span-6 bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex-1 bg-slate-50 rounded-lg relative min-h-[500px] border border-dashed border-gray-300">
            {!result ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Harita verisi bekleniyor...
              </div>
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Müşteriler */}
                {result.all_customers.map((c: any, i: number) => (
                  <circle key={`c-${i}`} cx={c.x} cy={c.y} r="1.5" fill="#93c5fd" />
                ))}

                {/* Bağlantılar */}
                {result.assignments.map((a: any, i: number) => {
                  const fac = result.facility_report.find((f: any) => f.id === a.facility_id);
                  const color = ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6'][a.facility_id % 5];
                  return <line key={`l-${i}`} x1={fac.x} y1={fac.y} x2={a.cust_x} y2={a.cust_y} stroke={color} strokeWidth="0.3" opacity="0.4" />
                })}

                {/* Tesisler (Hepsi) */}
                {result.facility_report.map((f: any) => {
                  const isOpen = f.status === "ACTIVE";
                  const color = isOpen ? ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6'][f.id % 5] : '#fee2e2';
                  const stroke = isOpen ? 'white' : '#ef4444';

                  return (
                    <g key={`f-${f.id}`}>
                      <rect x={f.x - 3} y={f.y - 3} width="6" height="6" fill={color} stroke={stroke} strokeWidth="0.5" rx="1" />
                      {!isOpen && <text x={f.x} y={f.y} textAnchor="middle" dy=".3em" fontSize="3" fill="#ef4444" style={{ pointerEvents: 'none' }}>x</text>}
                      {isOpen && <text x={f.x} y={f.y} textAnchor="middle" dy=".3em" fontSize="2.5" fill="white" fontWeight="bold">{f.id}</text>}
                    </g>
                  )
                })}
              </svg>
            )}
            <div className="absolute bottom-2 right-2 text-[10px] text-gray-400">100x100 Koordinat Düzlemi</div>
          </div>
        </div>

        {/* SAĞ PANEL: SONUÇ TABLOSU (3 Sütun Genişlik) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-fit max-h-[600px] overflow-auto">
          <h2 className="font-bold text-gray-800 mb-3 border-b pb-2">Sonuç Özeti</h2>

          {result ? (
            <div className="space-y-4">
              <div className="bg-green-50 p-3 rounded border border-green-100">
                <p className="text-xs text-green-600 font-bold uppercase">Toplam Maliyet</p>
                <p className="text-2xl font-bold text-green-800">
                  {result.total_cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs mt-1 text-green-700">
                  {result.opened_count} Tesis Aktif
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Tesis Detayları</h3>
                <div className="space-y-2">
                  {result.facility_report.map((f: any) => (
                    <div key={f.id} className={`text-xs p-2 rounded border flex justify-between items-center ${f.status === 'ACTIVE' ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                      <div>
                        <span className={`font-bold mr-2 ${f.status === 'ACTIVE' ? 'text-indigo-600' : 'text-gray-500'}`}>Tesis {f.id}</span>
                        <span className="text-gray-500 block">{f.fixed_cost.toLocaleString()} TL Kira</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full font-bold ${f.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-10">Sonuçlar burada görünecek...</p>
          )}
        </div>

      </div>
    </div>
  );
}