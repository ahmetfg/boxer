import React, { useMemo, useRef, useState, useEffect } from 'react';

// ===================================================================
// TEMEL YAPILANDIRMA PARAMETRELERİ (AÇILIŞ BÖLGESİ)
// ===================================================================

// ÇOKLU EMOJİ DESTEĞİ EKLENDİ. Artık düşüş için bir emoji dizisi kullanılıyor.
const EMOJI_LIST = ['🚨'];
const PARTICLE_COUNT = 100;

// Düşüş Süresi (Saniye)
const MIN_FALL_DURATION = 3;
const MAX_FALL_DURATION = 12;

// Gecikme Süresi (Saniye) - Yağmurun başlama yayılımı
const MAX_DELAY_SECONDS = 5;

// Emoji Boyutu (rem)
const MIN_SIZE_REM = 1.0;
const MAX_SIZE_REM = 5.0;

// Başlangıç ve Bitiş Konum Ayarları
// Emojinin animasyonun 0% anında nerede başladığı. Negatif değer ekranın yukarısıdır.
const START_Y_OFFSET_PX = -80;
// Emojinin ekranın altından tamamen çıktıktan sonra yok olması için eklenen tampon mesafe.
const FALL_BUFFER_PX = 600;

// Rotasyon Ayarı (Derece)
const MAX_ROTATION_DEG = 60;

// ===================================================================
// YARDIMCI FONKSİYONLAR
// ===================================================================

// Rastgele sayı üreteci
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

// Benzersiz ID oluşturma fonksiyonu (Daha geniş uyumluluk için güncellendi)
const generateUniqueId = () => {
    // Math.random ve Date.now() kullanılarak basit bir ID oluşturulur
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// ===================================================================
// ANA KOMPONENT
// ===================================================================

export const EmojiRain = () => {
    const containerRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const [styleTagInjected, setStyleTagInjected] = useState(false);

    // Emojinin özelliklerini oluşturur
    const createParticle = () => {
        // EMOJI_LIST'ten rastgele seçim
        const selectedEmoji = EMOJI_LIST[random(0, EMOJI_LIST.length - 1)];

        return {
            // crypto.randomUUID() yerine uyumlu fonksiyon kullanıldı
            id: generateUniqueId(),
            emoji: selectedEmoji, // Seçilen emoji kullanılıyor
            size: randomFloat(MIN_SIZE_REM, MAX_SIZE_REM),
            left: random(0, 100),
            duration: randomFloat(MIN_FALL_DURATION, MAX_FALL_DURATION),
            delay: randomFloat(0, MAX_DELAY_SECONDS),
        };
    };

    // Emojileri sadece bir kere oluşturmak için useMemo kullanıyoruz
    const particles = useMemo(() => {
        const arr = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            arr.push(createParticle());
        }
        return arr;
    }, []);

    // 1. CSS Keyframes'leri bir kez DOM'a enjekte et
    useEffect(() => {
        // Ana Keyframe tanımı
        const keyframesDefinition = `
            @keyframes rain-fall {
                0% {
                    opacity: 0;
                    /* BAŞLANGIÇ POZİSYONU: Tanımlanan offset kullanıldı */
                    transform: translate3d(0, ${START_Y_OFFSET_PX}px, 0) rotate(0deg);
                }
                1% { opacity: 1; } /* Gözükmeden hızlıca görünür yap */
                99% { opacity: 1; }
                100% {
                    opacity: 0;
                    /* BİTİŞ POZİSYONU: Tampon mesafe kullanıldı */
                    transform: translate3d(0, var(--fall-distance), 0) rotate(${MAX_ROTATION_DEG}deg);
                }
            }
        `;

        if (!styleTagInjected) {
            const style = document.createElement('style');
            style.id = 'rain-fall-keyframes';
            style.innerHTML = keyframesDefinition;
            document.head.appendChild(style);
            setStyleTagInjected(true);
        } else {
            const styleElement = document.getElementById('rain-fall-keyframes');
            if (styleElement) {
                styleElement.innerHTML = keyframesDefinition;
            }
        }

    }, [styleTagInjected]);


    // 2. Konteyner boyutunu ölçme ve resize dinleyicisi
    useEffect(() => {
        const measureHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.offsetHeight);
            }
        };

        measureHeight(); // Başlangıçta ölç
        window.addEventListener('resize', measureHeight);

        return () => window.removeEventListener('resize', measureHeight);
    }, []);

    // Ana konteyner stilleri
    const containerStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex:-1,
        // Düşme mesafesi (Parent yüksekliği + Tampon)
        '--fall-distance': `${containerHeight + FALL_BUFFER_PX}px`,
    };

    return (
        <div ref={containerRef} style={containerStyle}>
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'fixed',
                        left: `${p.left}%`,
                        fontSize: `${p.size}rem`,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        // KRİTİK: Parçacık, animasyon başlamadan önce, offset pozisyonunda bekliyor.
                        transform: `translate3d(0, ${START_Y_OFFSET_PX}px, 0)`,
                        opacity: 0,

                        // Animasyon stilleri
                        animation: 'rain-fall linear infinite',
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        animationName: 'rain-fall',
                        animationIterationCount: 'infinite',
                        willChange: 'transform, opacity',
                    }}
                    aria-hidden="true"
                >
                    {p.emoji}
                </div>
            ))}
        </div>
    );
};

// Wrapper Komponent: Efekti çalışır durumda göstermek için parent (kapsayıcı) görevi görür
const App = () => {
    // Bu div, EmojiRain'in kapsayacağı parent'tır ve 'relative' olmalıdır.
    const wrapperStyle = {
        position: 'relative', // EmojiRain'in absolute çalışması için şart
        minHeight: '400px', // Efektin görülebilmesi için minimum yükseklik
        height: '80vh', // Sadece bu demo için vh kullanıldı (Parent'ın yüksekliğini belirlemek için)
        width: '100%',
        backgroundColor: '#1f2937', // Koyu arka plan
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '12px',
        margin: '20px 0',
        boxShadow: '0 0 40px rgba(79, 70, 229, 0.5)',
        overflow: 'hidden',
    };

    return (
        <div style={wrapperStyle}>
            {/* EmojiRain komponenti, wrapperStyle ile tanımlanan parent'ı kaplar */}
            <EmojiRain />
            <h1 style={{ zIndex: 12, fontSize: '3rem', margin: 0, textAlign: 'center' }}>Optimize Edilmiş Yağmur Efekti</h1>
            <p style={{ zIndex: 12, marginTop: '0.5rem', textAlign: 'center' }}>Efekt, parent'ının yüksekliğini ölçer ve sabit birimler kullanmadan tam kapsama sağlar.</p>
            <p style={{ zIndex: 12, fontSize: '0.8rem', opacity: 0.7 }}>Pencereyi yeniden boyutlandırarak tepkiselliği test edin.</p>
        </div>
    );
}

