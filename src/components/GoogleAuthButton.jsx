import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../config/env';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleScriptPromise;

const isConfiguredClientId = (clientId) => (
    Boolean(clientId)
    && clientId.endsWith('.apps.googleusercontent.com')
    && !clientId.startsWith('xxxxx.')
    && !clientId.startsWith('your_')
);

const loadGoogleScript = () => {
    if (window.google?.accounts?.id) return Promise.resolve();

    if (!googleScriptPromise) {
        googleScriptPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
            if (existingScript) {
                existingScript.addEventListener('load', resolve, { once: true });
                existingScript.addEventListener('error', reject, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = GOOGLE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    return googleScriptPromise;
};

export default function GoogleAuthButton({ label = 'Tiếp tục với Google', onSuccess, onError }) {
    const buttonRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isConfiguredClientId(GOOGLE_CLIENT_ID)) {
            setError('Chưa cấu hình Google Client ID.');
            return undefined;
        }

        let cancelled = false;

        loadGoogleScript()
            .then(() => {
                if (cancelled || !buttonRef.current) return;

                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response) => {
                        if (response?.credential) {
                            onSuccess(response.credential);
                        } else {
                            onError?.('Google không trả về mã xác thực.');
                        }
                    }
                });

                buttonRef.current.innerHTML = '';
                window.google.accounts.id.renderButton(buttonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    width: buttonRef.current.offsetWidth || 360,
                    text: 'continue_with'
                });
                setReady(true);
            })
            .catch(() => {
                if (!cancelled) setError('Không thể tải đăng nhập Google.');
            });

        return () => {
            cancelled = true;
        };
    }, [onError, onSuccess]);

    if (!isConfiguredClientId(GOOGLE_CLIENT_ID)) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-4 px-4 py-3.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-lg font-black text-blue-700">G</span>
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{label}</p>
                        <p className="text-sm text-slate-500">Cần cấu hình Google Client ID để bật chức năng này.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div ref={buttonRef} className="flex min-h-11 w-full justify-center" aria-label={label} />
            {!ready && !error && (
                <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-center text-sm font-bold text-slate-500">
                    Đang tải Google...
                </div>
            )}
            {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-600">
                    {error}
                </div>
            )}
        </div>
    );
}
