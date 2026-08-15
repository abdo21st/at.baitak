'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Phone,
  ShoppingCart,
  RefreshCw
} from 'lucide-react';

export default function PharmacySuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSuppliers = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/pharmacy/suppliers?${params.toString()}`);
      const data = await res.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            دليل الشركات وموردي الأدوية
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            سجل كامل بشركات الأدوية والموزعين مع أرقام التواصل
          </p>
        </div>

        <button onClick={fetchSuppliers} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الشركة أو رقم الهاتف..."
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400 font-bold">جاري تحميل دليل الموردين...</div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-500 font-bold">لم يتم العثور على شركات مطابقة!</div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                  {s.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 leading-tight">{s.name}</h3>
                  {s.code && <p className="text-[10px] text-slate-400 font-mono">كود: {s.code}</p>}
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-500">
                {s.phone && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3 h-3 text-purple-600" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.address && <div>{s.address}</div>}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/pharmacy/shortages?search=${encodeURIComponent(s.name)}`}
                  className="w-full h-8 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>نواقص المورد</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
