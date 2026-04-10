'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { useGeolocation } from '@/lib/hooks/use-geolocation';

type Step = 'phone' | 'otp' | 'voice-intro' | 'voice-name' | 'voice-location' | 'scan-doc' | 'confirm';

interface ExtractedFields {
  full_name_en?: string | null;
  full_name_ne?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  permanent_district?: string | null;
  permanent_municipality?: string | null;
  permanent_ward?: string | null;
  temporary_district?: string | null;
  temporary_municipality?: string | null;
  temporary_ward?: string | null;
  citizenship_no?: string | null;
  mobile?: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signInWithOtp, verifyOtp, _initialized: authReady } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+977');
  const [otp, setOtp] = useState('');
  const [fields, setFields] = useState<ExtractedFields>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const geo = useGeolocation();

  // Auto-skip to voice intro if already logged in
  useEffect(() => {
    if (authReady && user && step === 'phone') {
      setStep('voice-intro');
    }
  }, [authReady, user, step]);

  // Auto-fill location from geolocation result
  useEffect(() => {
    if (geo.geoResult?.district) {
      setFields((prev) => ({
        ...prev,
        temporary_district: prev.temporary_district || geo.geoResult!.district || null,
        temporary_municipality: prev.temporary_municipality || geo.geoResult!.municipality || null,
        permanent_district: prev.permanent_district || geo.geoResult!.district || null,
        permanent_municipality: prev.permanent_municipality || geo.geoResult!.municipality || null,
      }));
    }
  }, [geo.geoResult]);

  // Auto-fill mobile from phone input
  useEffect(() => {
    if (phone && phone.length > 4) {
      setFields((prev) => ({ ...prev, mobile: prev.mobile || phone }));
    }
  }, [phone]);

  // Voice input for name
  const nameVoice = useVoiceInput({
    onResult: (text) => {
      if (text.trim()) extractFieldsFromVoice(text);
    },
  });

  // Voice input for location
  const locationVoice = useVoiceInput({
    onResult: (text) => {
      if (text.trim()) extractFieldsFromVoice(text);
    },
  });

  const extractFieldsFromVoice = useCallback(async (transcript: string) => {
    setExtracting(true);
    try {
      const res = await fetch('/api/onboarding/extract-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (res.ok) {
        const { fields: extracted } = await res.json();
        setFields((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(extracted || {}).filter(([, v]) => v !== null),
          ),
        }));
      }
    } catch {
      // Non-blocking
    } finally {
      setExtracting(false);
    }
  }, []);

  // Apply geolocation result
  useEffect(() => {
    if (geo.geoResult) {
      setFields((prev) => ({
        ...prev,
        temporary_district: geo.geoResult!.district || prev.temporary_district,
        temporary_municipality: geo.geoResult!.municipality || prev.temporary_municipality,
        permanent_district: prev.permanent_district || geo.geoResult!.district || null,
        permanent_municipality: prev.permanent_municipality || geo.geoResult!.municipality || null,
      }));
    }
  }, [geo.geoResult]);

  const handleSendOtp = async () => {
    setError(null);
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    try {
      await signInWithOtp(cleaned);
      setFields((prev) => ({ ...prev, mobile: cleaned }));
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (otp.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    try {
      await verifyOtp(phone.replace(/\s+/g, ''), otp);
      setStep('voice-intro');
    } catch (err: any) {
      setError(err?.message || 'Invalid code');
    }
  };

  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/vault/scan', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        // Map scan result to fields
        if (data.holderName) {
          setFields((prev) => ({ ...prev, full_name_en: data.holderName }));
        }
        if (data.number) {
          setFields((prev) => ({ ...prev, citizenship_no: data.number }));
        }
      } else {
        setError('Could not read document. Try again or skip.');
      }
    } catch {
      setError('Scan failed. You can skip this step.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save identity profile
      const identityPayload: Record<string, string | null> = {};
      const fieldMap: Record<string, string> = {
        full_name_en: 'full_name_en',
        full_name_ne: 'full_name_ne',
        date_of_birth: 'date_of_birth',
        gender: 'gender',
        permanent_district: 'permanent_district',
        permanent_municipality: 'permanent_municipality',
        permanent_ward: 'permanent_ward',
        temporary_district: 'temporary_district',
        temporary_municipality: 'temporary_municipality',
        temporary_ward: 'temporary_ward',
        citizenship_no: 'citizenship_no',
        mobile: 'mobile',
      };
      for (const [key, apiKey] of Object.entries(fieldMap)) {
        const val = (fields as any)[key];
        if (val) identityPayload[apiKey] = val;
      }

      // Set verification level based on what info was collected
      const verLevel = scanResult ? 'document' : fields.full_name_en ? 'voice' : 'phone';
      identityPayload.verification_level = verLevel;
      identityPayload.onboarding_completed_at = new Date().toISOString();

      await fetch('/api/me/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identityPayload),
      });

      // Also update basic profile
      await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: fields.full_name_en || undefined,
          district: fields.permanent_district || fields.temporary_district || undefined,
          province: undefined,
        }),
      });

      // Navigate to home
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ne-NP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nepal Republic</h1>
          <p className="text-sm text-gray-500 mt-1">नेपाल रिपब्लिक</p>
        </div>

        {/* Phone Step */}
        {step === 'phone' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">📱</div>
              <h2 className="text-xl font-semibold">Enter your phone number</h2>
              <p className="text-gray-500 text-sm mt-1">फोन नम्बर हाल्नुहोस्</p>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-center text-2xl tracking-wider border-2 border-gray-200 rounded-xl p-4 focus:border-blue-500 focus:outline-none"
              placeholder="+977 98..."
              inputMode="tel"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={authLoading}
              className="w-full bg-[#DC143C] text-white text-lg font-semibold py-4 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
            >
              {authLoading ? 'Sending...' : 'Send Code / कोड पठाउनुहोस्'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              A verification code will be sent to your phone via SMS.
            </p>
          </div>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-xl font-semibold">Enter the code</h2>
              <p className="text-gray-500 text-sm mt-1">SMS मा आएको कोड हाल्नुहोस्</p>
            </div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-3xl tracking-[0.5em] border-2 border-gray-200 rounded-xl p-4 focus:border-blue-500 focus:outline-none font-mono"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={authLoading}
              className="w-full bg-[#DC143C] text-white text-lg font-semibold py-4 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
            >
              {authLoading ? 'Verifying...' : 'Verify / प्रमाणित गर्नुहोस्'}
            </button>
            <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-500 py-2">
              ← Change number
            </button>
          </div>
        )}

        {/* Voice Intro */}
        {step === 'voice-intro' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🎙️</div>
              <h2 className="text-xl font-semibold">Let&apos;s set up your account</h2>
              <p className="text-gray-500 mt-2">
                तपाईंको खाता बनाउन केही प्रश्न सोध्छौं।<br/>
                तपाईं बोलेर जवाफ दिन सक्नुहुन्छ।
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setStep('voice-name'); speak('तपाईंको नाम के हो?'); }}
                className="w-full bg-[#003893] text-white text-lg font-semibold py-4 rounded-xl hover:bg-blue-800 transition"
              >
                🎤 Start with voice / बोलेर सुरु गर्नुहोस्
              </button>
              <button
                onClick={() => setStep('scan-doc')}
                className="w-full border-2 border-gray-200 text-gray-700 text-lg font-semibold py-4 rounded-xl hover:bg-gray-50 transition"
              >
                📷 Scan citizenship card / नागरिकता स्क्यान गर्नुहोस्
              </button>
            </div>
          </div>
        )}

        {/* Voice Name */}
        {step === 'voice-name' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">👤</div>
              <h2 className="text-xl font-semibold">What is your name?</h2>
              <p className="text-gray-500 text-sm">तपाईंको नाम के हो?</p>
            </div>

            {/* Mic button */}
            <div className="flex justify-center">
              <button
                onMouseDown={() => nameVoice.startListening()}
                onMouseUp={() => nameVoice.stopListening()}
                onTouchStart={() => nameVoice.startListening()}
                onTouchEnd={() => nameVoice.stopListening()}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all ${
                  nameVoice.isListening
                    ? 'bg-red-500 text-white animate-pulse scale-110'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎤
              </button>
            </div>

            {nameVoice.isListening && (
              <p className="text-center text-sm text-red-500 animate-pulse">Listening... / सुनिरहेको छ...</p>
            )}

            {(nameVoice.transcript || nameVoice.interimTranscript) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">I heard:</p>
                <p className="text-lg font-medium">{nameVoice.transcript || nameVoice.interimTranscript}</p>
              </div>
            )}

            {extracting && <p className="text-center text-sm text-blue-500">Extracting info...</p>}

            {fields.full_name_en && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-600 mb-1">Name detected:</p>
                <p className="text-lg font-semibold text-green-800">{fields.full_name_en}</p>
              </div>
            )}

            {/* Manual input fallback */}
            <input
              type="text"
              value={fields.full_name_en || ''}
              onChange={(e) => setFields((p) => ({ ...p, full_name_en: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none"
              placeholder="Or type your name here / वा यहाँ नाम टाइप गर्नुहोस्"
            />

            <button
              onClick={() => { setStep('voice-location'); speak('तपाईं कहाँ बस्नुहुन्छ?'); geo.requestLocation(); }}
              disabled={!fields.full_name_en}
              className="w-full bg-[#003893] text-white text-lg font-semibold py-4 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition"
            >
              Next / अर्को →
            </button>
          </div>
        )}

        {/* Voice Location */}
        {step === 'voice-location' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">📍</div>
              <h2 className="text-xl font-semibold">Where do you live?</h2>
              <p className="text-gray-500 text-sm">तपाईं कहाँ बस्नुहुन्छ?</p>
            </div>

            {/* Auto-detect button */}
            <button
              onClick={() => geo.requestLocation()}
              disabled={geo.loading}
              className="w-full border-2 border-blue-200 text-blue-700 font-semibold py-3 rounded-xl hover:bg-blue-50 transition"
            >
              {geo.loading ? '📡 Detecting...' : '📡 Auto-detect my location / मेरो ठाउँ पत्ता लगाउनुहोस्'}
            </button>

            {geo.geoResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-600 mb-1">Location detected:</p>
                <p className="text-lg font-semibold text-green-800">
                  {[geo.geoResult.municipality, geo.geoResult.district].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {geo.error && <p className="text-amber-600 text-sm text-center">{geo.error}</p>}

            {/* Voice alternative */}
            <div className="flex justify-center">
              <button
                onMouseDown={() => locationVoice.startListening()}
                onMouseUp={() => locationVoice.stopListening()}
                onTouchStart={() => locationVoice.startListening()}
                onTouchEnd={() => locationVoice.stopListening()}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
                  locationVoice.isListening
                    ? 'bg-red-500 text-white animate-pulse scale-110'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎤
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">Or hold the mic and say where you live</p>

            {(locationVoice.transcript || locationVoice.interimTranscript) && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm">{locationVoice.transcript || locationVoice.interimTranscript}</p>
              </div>
            )}

            {/* Manual input */}
            <input
              type="text"
              value={fields.temporary_district || fields.permanent_district || ''}
              onChange={(e) => setFields((p) => ({ ...p, temporary_district: e.target.value, permanent_district: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none"
              placeholder="District / जिल्ला"
            />

            <div className="flex gap-3">
              <button onClick={() => setStep('voice-name')} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl">
                ← Back
              </button>
              <button
                onClick={() => setStep('scan-doc')}
                className="flex-1 bg-[#003893] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Document Scan */}
        {step === 'scan-doc' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">📷</div>
              <h2 className="text-xl font-semibold">Scan your ID (optional)</h2>
              <p className="text-gray-500 text-sm">नागरिकता वा ID को फोटो खिच्नुहोस्</p>
            </div>

            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition">
                <div className="text-4xl mb-2">📸</div>
                <p className="text-gray-600 font-medium">Tap to take photo or choose file</p>
                <p className="text-gray-400 text-sm mt-1">फोटो खिच्नुहोस् वा फाइल छान्नुहोस्</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScanUpload}
                className="hidden"
              />
            </label>

            {extracting && <p className="text-center text-sm text-blue-500 animate-pulse">Reading document... / कागजात पढिरहेको छ...</p>}

            {scanResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <p className="text-sm text-green-600 font-medium">Document read successfully!</p>
                {scanResult.holderName && <p><span className="text-gray-500">Name:</span> {scanResult.holderName}</p>}
                {scanResult.number && <p><span className="text-gray-500">Number:</span> {scanResult.number}</p>}
                {scanResult.docType && <p><span className="text-gray-500">Type:</span> {scanResult.docType}</p>}
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep('voice-location')} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl">
                ← Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-[#003893] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition"
              >
                {scanResult ? 'Next →' : 'Skip / छोड्नुहोस् →'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirm' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold">Confirm your details</h2>
              <p className="text-gray-500 text-sm">तपाईंको विवरण जाँच गर्नुहोस्</p>
            </div>

            <div className="space-y-3">
              {fields.full_name_en && (
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500 text-sm">Name</span>
                  <span className="font-medium">{fields.full_name_en}</span>
                </div>
              )}
              {fields.mobile && (
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500 text-sm">Phone</span>
                  <span className="font-medium">{fields.mobile}</span>
                </div>
              )}
              {(fields.temporary_district || fields.permanent_district) && (
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500 text-sm">Location</span>
                  <span className="font-medium">
                    {[fields.temporary_municipality || fields.permanent_municipality, fields.temporary_district || fields.permanent_district]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {fields.citizenship_no && (
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500 text-sm">Citizenship No.</span>
                  <span className="font-medium">{fields.citizenship_no}</span>
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep('voice-name')} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl">
                ← Edit
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#DC143C] text-white text-lg font-semibold py-4 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save / सेभ गर्नुहोस् ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {(['phone', 'otp', 'voice-intro', 'voice-name', 'voice-location', 'scan-doc', 'confirm'] as Step[]).map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition ${
                s === step ? 'bg-[#DC143C] w-6' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
