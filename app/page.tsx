"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Zoom ve pan state'leri
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  const [params, setParams] = useState({
    n_facilities: 10,
    n_customers: 60,
    fuel_price: 25.0,
    trip_frequency: 20,
  });

  const handleSolve = async () => {
    setLoading(true);
    // Reset zoom/pan on new solve
    setZoom(1);
    setPan({ x: 0, y: 0 });
    try {
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
      alert("Hata: Backend çalışmıyor olabilir.");
    } finally {
      setLoading(false);
    }
  };

  // Zoom kontrolleri
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(Math.max(z * delta, 0.5), 5));
  };

  // Pan (sürükleme) kontrolleri
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

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
              <label className="block font-medium text-gray-600 mb-1">Kilometre Başına Gider (TL)</label>
              <input type="number" min="1" max="100" className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={params.fuel_price} onChange={(e) => setParams({ ...params, fuel_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block font-medium text-gray-600 mb-1">Aylık Sefer Sayısı (1-30)</label>
              <input type="number" min="1" max="30" className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={params.trip_frequency} onChange={(e) => setParams({ ...params, trip_frequency: Number(e.target.value) })} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSolve}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
              >
                {loading ? "Hesaplanıyor..." : "SİMÜLASYONU BAŞLAT"}
              </button>
              <button
                onClick={() => setParams({
                  n_facilities: 10,
                  n_customers: 60,
                  fuel_price: 25.0,
                  trip_frequency: 20,
                })}
                className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center"
                title="Varsayılan Değerlere Dön"
              >
                ↺
              </button>
            </div>
          </div>
        </div>

        {/* ORTA PANEL: HARİTA (6 Sütun Genişlik) */}
        <div className="lg:col-span-6 bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          {/* Harita Kontrolleri */}
          <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded-t-lg border-b border-gray-200">
            <span className="text-xs text-gray-500">Zoom: {Math.round(zoom * 100)}%</span>
            <div className="flex gap-1">
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-sm font-medium transition-colors"
                title="Yakınlaştır"
              >
                ➕
              </button>
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-sm font-medium transition-colors"
                title="Uzaklaştır"
              >
                ➖
              </button>
              <button
                onClick={handleResetView}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                title="Sıfırla"
              >
                ↺
              </button>
            </div>
          </div>

          <div
            ref={mapRef}
            className="flex-1 bg-slate-50 rounded-b-lg relative min-h-[500px] border border-dashed border-gray-300 overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {!result ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Harita verisi bekleniyor...
              </div>
            ) : (() => {
              // Dinamik viewBox hesaplama - verilere tam oturacak şekilde
              const allX = [
                ...result.all_customers.map((c: any) => c.x),
                ...result.facility_report.map((f: any) => f.x)
              ];
              const allY = [
                ...result.all_customers.map((c: any) => c.y),
                ...result.facility_report.map((f: any) => f.y)
              ];

              const minX = Math.min(...allX);
              const maxX = Math.max(...allX);
              const minY = Math.min(...allY);
              const maxY = Math.max(...allY);

              // Padding ekle (kenarlardan biraz boşluk)
              const padding = 8;
              const viewWidth = (maxX - minX) + padding * 2;
              const viewHeight = (maxY - minY) + padding * 2;

              // Kare viewBox için en büyük boyutu kullan
              const viewSize = Math.max(viewWidth, viewHeight);
              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;
              const finalViewBox = `${centerX - viewSize / 2} ${centerY - viewSize / 2} ${viewSize} ${viewSize}`;

              return (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <svg viewBox={finalViewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    {/* Müşteriler */}
                    {result.all_customers.map((c: any, i: number) => (
                      <circle key={`c-${i}`} cx={c.x} cy={c.y} r="1.2" fill="#93c5fd" />
                    ))}

                    {/* Bağlantılar */}
                    {result.assignments.map((a: any, i: number) => {
                      const fac = result.facility_report.find((f: any) => f.id === a.facility_id);
                      const color = ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6'][a.facility_id % 5];
                      return <line key={`l-${i}`} x1={fac.x} y1={fac.y} x2={a.cust_x} y2={a.cust_y} stroke={color} strokeWidth="0.25" opacity="0.5" />
                    })}

                    {/* Tesisler (Hepsi) */}
                    {result.facility_report.map((f: any) => {
                      const isOpen = f.status === "AÇILDI";
                      const color = isOpen ? ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6'][f.id % 5] : '#fee2e2';
                      const stroke = isOpen ? 'white' : '#ef4444';

                      return (
                        <g key={`f-${f.id}`}>
                          <rect x={f.x - 2.5} y={f.y - 2.5} width="5" height="5" fill={color} stroke={stroke} strokeWidth="0.4" rx="0.8" />
                          {!isOpen && <text x={f.x} y={f.y} textAnchor="middle" dy=".35em" fontSize="2.5" fill="#ef4444" style={{ pointerEvents: 'none' }}>x</text>}
                          {isOpen && <text x={f.x} y={f.y} textAnchor="middle" dy=".35em" fontSize="2" fill="white" fontWeight="bold">{f.id}</text>}
                        </g>
                      )
                    })}
                  </svg>
                </div>
              );
            })()}
            <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 px-1 rounded">100x100 Koordinat Düzlemi</div>
            <div className="absolute bottom-2 left-2 text-[10px] text-gray-400 bg-white/80 px-1 rounded">🖱️ Scroll: Zoom | Sürükle: Kaydır</div>
          </div>
        </div>

        {/* SAĞ PANEL: SONUÇ TABLOSU (3 Sütun Genişlik) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-fit max-h-[600px] overflow-auto">
          <h2 className="font-bold text-gray-800 mb-3 border-b pb-2">Sonuç Özeti</h2>

          {result ? (
            <div className="space-y-4">
              {/* Toplam Maliyet */}
              <div className="bg-green-50 p-3 rounded border border-green-100">
                <p className="text-xs text-green-600 font-bold uppercase">Toplam Maliyet</p>
                <p className="text-2xl font-bold text-green-800">
                  {result.total_cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs mt-1 text-green-700">
                  {result.opened_count} Tesis Aktif
                </p>
              </div>

              {/* Maliyet Kırılımı */}
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase mb-2">📊 Maliyet Kırılımı</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 flex items-center gap-1">
                      <span className="text-base">🏠</span> Tesis Kiraları
                    </span>
                    <span className="font-semibold text-blue-800">
                      {(result.total_fixed_cost || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 flex items-center gap-1">
                      <span className="text-base">🚚</span> Nakliye Gideri
                    </span>
                    <span className="font-semibold text-blue-800">
                      {(result.total_transport_cost || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>Kira Oranı</span>
                      <span>{result.total_cost > 0 ? Math.round((result.total_fixed_cost / result.total_cost) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${result.total_cost > 0 ? (result.total_fixed_cost / result.total_cost) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detay Bilgi */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                <p>💡 <strong>Formül:</strong></p>
                <p className="mt-1">Nakliye = Mesafe × {params.fuel_price} TL/km × {params.trip_frequency} sefer/ay</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Tesis Detayları</h3>
                <div className="space-y-2">
                  {result.facility_report.map((f: any) => (
                    <div key={f.id} className={`text-xs p-2 rounded border flex justify-between items-center ${f.status === 'AÇILDI' ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                      <div>
                        <span className={`font-bold mr-2 ${f.status === 'AÇILDI' ? 'text-indigo-600' : 'text-gray-500'}`}>Tesis {f.id}</span>
                        <span className="text-gray-500 block">{f.fixed_cost.toLocaleString()} TL Kira</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full font-bold ${f.status === 'AÇILDI' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
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