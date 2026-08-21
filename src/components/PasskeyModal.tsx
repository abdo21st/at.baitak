'use client';

import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { isWebAuthnSupported, bufferToBase64Url, base64UrlToBuffer } from '@/lib/webauthn';

interface PasskeyModalProps {
  userId?: string;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PasskeyModal({ userId, userName, isOpen, onClose }: PasskeyModalProps) {
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deviceName, setDeviceName] = useState('هاتفي الشخصي');

  // Resolve effective user
  let effectiveUserId = userId || '';
  let effectiveUserName = userName || '';
  if (typeof window !== 'undefined' && (!effectiveUserId || !effectiveUserName)) {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        if (!effectiveUserId) effectiveUserId = u.id || 'usr-admin';
        if (!effectiveUserName) effectiveUserName = u.name || 'المستخدم';
      }
    } catch {}
  }
  if (!effectiveUserId) effectiveUserId = 'usr-admin';
  if (!effectiveUserName) effectiveUserName = 'مدير النظام';

  useEffect(() => {
    isWebAuthnSupported().then(setSupported);
  }, []);

  if (!isOpen) return null;

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setMsg(null);

    try {
      // 1. Get options from server
      const optRes = await fetch(`/api/auth/webauthn/register?userId=${effectiveUserId}`);
      const optData = await optRes.json();
      if (!optData.success) {
        throw new Error(optData.error || 'فشل جلب إعدادات البصمة');
      }

      const { options } = optData;
      const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: new TextEncoder().encode(options.challenge),
          rp: options.rp,
          user: {
            id: new TextEncoder().encode(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout
        }
      };

      // 2. Trigger browser platform authenticator (TouchID / FaceID / Windows Hello)
      const credential = (await navigator.credentials.create(publicKeyCredentialCreationOptions)) as PublicKeyCredential;
      if (!credential) {
        throw new Error('تم إلغاء عملية التسجيل');
      }

      const rawIdBase64 = bufferToBase64Url(credential.rawId);
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBase64 = bufferToBase64Url(attestationResponse.clientDataJSON);

      // 3. Save credential to server
      const saveRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          credentialId: rawIdBase64,
          publicKey: publicKeyBase64,
          deviceName
        })
      });

      const saveData = await saveRes.json();
      if (saveData.success) {
        setMsg({ text: '✅ تم تفعيل الدخول ببصمة الإصبع / الوجه لهذا الجهاز بنجاح!', type: 'success' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMsg({ text: saveData.error || 'فشل حفظ البصمة', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'حدث خطأ أثناء تفعيل البصمة', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تفعيل بصمة الدخول (Passkey)</h3>
              <p className="text-xs text-slate-500 font-semibold">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="space-y-4 text-xs font-semibold text-slate-600">
          <p className="leading-relaxed">
            يتيح لك تفعيل ميزة <span className="font-extrabold text-purple-700">Passkey</span> تسجيل الدخول الفوري لمنظومة حضورك عبر <span className="font-bold text-slate-900">بصمة الإصبع (Touch ID)</span> أو <span className="font-bold text-slate-900">بصمة الوجه (Face ID)</span> دون الحاجة لكتابة الرقم السري في كل مرة.
          </p>

          <div>
            <label className="block text-slate-800 font-bold mb-1.5">اسم هذا الجهاز (للتمييز):</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="مثال: آيفون العمل / لابتوب الإدارة"
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={loading || !supported}
            onClick={handleRegisterPasskey}
            className="flex-1 h-12 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Fingerprint className="w-4 h-4" />
            {loading ? 'جاري التحقق من البصمة...' : 'تفعيل البصمة على هذا الجهاز'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            إلغاء
          </button>
        </div>

        {!supported && (
          <p className="text-[11px] text-amber-600 font-bold text-center">
            ⚠️ المتصفح أو الجهاز الحالي لا يدعم ميزة المصادقة البيومترية WebAuthn.
          </p>
        )}
      </div>
    </div>
  );
}
