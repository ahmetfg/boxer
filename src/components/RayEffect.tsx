import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

// ===============================================
// SABİT PARAMETRELER
// ===============================================

// Genel Stil ve Geçiş Sabitleri
const GLOBAL_CONSTANTS = {
    // Ana Kapsayıcı Stilleri
    // Bileşeni yerleştireceğiniz parent elementine tam yükseklik vermelisiniz.
    MAIN_MIN_HEIGHT: '100%',
    BACKGROUND_COLOR: 'transparent',
    // Opaklık Geçiş Süresi (ms)
    FADE_TRANSITION_MS: 400,
    // Işınların Sabit Yüksekliği (rem)
    RAY_HEIGHT_REM: 250,
    // Ortaya Çıkma Animasyon Süresi
    REVEAL_DURATION: '0.8s',
    REVEAL_DELAY: '0.8s',
};

// 16 Işının Benzersiz Parametreleri
const RAY_CONFIG = [
    // { HUE, GENİŞLİK(rem), AÇI(deg), ROTASYON SÜRESİ(s), NABIZ SÜRESİ(s), GECİKME(s), YÖN }
    { hue: 0, widthRem: 0.9, angle: 0, rotateSec: 9, pulseSec: 1.8, delaySec: -1.5, direction: 'normal' },
    { hue: 30, widthRem: 2.8, angle: 25, rotateSec: 12.5, pulseSec: 1.6, delaySec: -0.5, direction: 'reverse' },
    { hue: 60, widthRem: 1.25, angle: 48, rotateSec: 15, pulseSec: 2.0, delaySec: -2.0, direction: 'normal' },
    { hue: 90, widthRem: 2.2, angle: 72, rotateSec: 10, pulseSec: 1.7, delaySec: -0.8, direction: 'reverse' },
    { hue: 120, widthRem: 1.75, angle: 98, rotateSec: 14, pulseSec: 1.9, delaySec: -3.5, direction: 'normal' },
    { hue: 150, widthRem: 2.5, angle: 123, rotateSec: 11, pulseSec: 1.5, delaySec: -1.2, direction: 'reverse' },
    { hue: 180, widthRem: 1.1, angle: 147, rotateSec: 16.5, pulseSec: 2.1, delaySec: -2.5, direction: 'normal' },
    { hue: 210, widthRem: 2.0, angle: 172, rotateSec: 13.5, pulseSec: 1.4, delaySec: -3.0, direction: 'reverse' },
    { hue: 240, widthRem: 1.5, angle: 196, rotateSec: 14.5, pulseSec: 1.7, delaySec: -1.0, direction: 'normal' },
    { hue: 270, widthRem: 2.4, angle: 220, rotateSec: 12, pulseSec: 1.5, delaySec: -2.8, direction: 'reverse' },
    { hue: 300, widthRem: 1.05, angle: 245, rotateSec: 15.5, pulseSec: 1.9, delaySec: -0.3, direction: 'normal' },
    { hue: 330, widthRem: 2.6, angle: 269, rotateSec: 13, pulseSec: 1.6, delaySec: -2.2, direction: 'reverse' },
    { hue: 15, widthRem: 1.35, angle: 294, rotateSec: 17, pulseSec: 2.0, delaySec: -1.7, direction: 'normal' },
    { hue: 45, widthRem: 1.9, angle: 317, rotateSec: 9.5, pulseSec: 1.8, delaySec: -0.7, direction: 'reverse' },
    { hue: 75, widthRem: 1.15, angle: 340, rotateSec: 18, pulseSec: 1.6, delaySec: -2.4, direction: 'normal' },
    { hue: 105, widthRem: 3.0, angle: 358, rotateSec: 11.5, pulseSec: 1.7, delaySec: -0.2, direction: 'reverse' },
];

// Tüm Işın Stillerini Sabitlere Göre Oluşturan Fonksiyon
const generateRayStyles = () => {
    return RAY_CONFIG.map((ray, index) => {
        const rayIndex = index + 1;
        const rotateAnim = ray.direction === 'normal' ? 'individualRotate' : 'individualRotateReverse';

        return `
            .ray-${rayIndex} { 
                background-color: hsla(${ray.hue}, 100%, 70%, 1); 
                width: ${ray.widthRem}rem; 
                transform: translate(-50%, -50%) rotate(${ray.angle}deg); 
                animation: 
                    revealRay ${GLOBAL_CONSTANTS.REVEAL_DURATION} forwards, 
                    rayPulse ${ray.pulseSec}s cubic-bezier(0.4, 0, 0.2, 1) ${GLOBAL_CONSTANTS.REVEAL_DELAY} infinite alternate, 
                    ${rotateAnim} ${ray.rotateSec}s ease-in-out ${GLOBAL_CONSTANTS.REVEAL_DELAY} infinite; 
                animation-delay: ${ray.delaySec}s, 0s, ${ray.delaySec}s; 
            }
        `;
    }).join('\n');
};

// Ana bileşen (forwardRef ile sarıldı)
const GlowEffectPure = forwardRef((props, ref) => {
    // 1. Efektin opaklığını yönetmek için state
    const [opacity, setOpacity] = useState(0);

    // 2. Işıma elemanlarının DOM'da olup olmadığını kontrol eden state. Başlangıçta render edilmiyor.
    const [isRendered, setIsRendered] = useState(false);

    // Fade In fonksiyonu
    const fadeIn = () => {
        // A. Animasyonu hemen başlatmak için elementleri DOM'a ekle
        setIsRendered(true);

        // B. Elementler eklendikten kısa süre sonra opaklığı artır (geçişi başlat) 
        setTimeout(() => {
            setOpacity(1);
        }, 50);
    };

    useEffect(() => {
        fadeIn()
    })

    // Fade Out fonksiyonu
    const fadeOut = () => {
        setOpacity(0); // 1. Önce opaklığı 0 yap (CSS geçişi başlar)

        // 2. CSS geçişi (sabitlerden alınıyor) bittikten sonra, DOM'dan tamamen kaldır (maliyeti sıfırla)
        setTimeout(() => {
            setIsRendered(false);
        }, GLOBAL_CONSTANTS.FADE_TRANSITION_MS);
    };

    // useImperativeHandle ile dışarıya açılacak fonksiyonları tanımla
    useImperativeHandle(ref, () => ({
        fadeIn,
        fadeOut
    }));

    // Butonlar kaldırıldığı için, bileşen yüklendiğinde otomatik başlatma kodu da kaldırıldı.
    // Bileşen artık harici bir ref.current.fadeIn() çağrısı bekliyor.

    return (
        // Ana konteynere dinamik opaklık ve geçiş (transition) için CSS sınıfı eklendi
        <div className="main-container fade-transition" style={{ opacity: opacity }}>

            {/* KONTROL BUTONLARI KALDIRILDI */}

            {/* Sadece isRendered true ise animasyonları içeren kapsayıcıyı render et */}
            {isRendered && (
                <div className="glow-wrapper">
                    <div className="glow-container">
                        {/* Işıma Efekti: Ray Konfigürasyonuna göre dinamik olarak raylar oluşturuluyor */}
                        <div className="glow-ray ray-1"></div>
                        <div className="glow-ray ray-2"></div>
                        <div className="glow-ray ray-3"></div>
                        <div className="glow-ray ray-4"></div>
                        <div className="glow-ray ray-5"></div>
                        <div className="glow-ray ray-6"></div>
                        <div className="glow-ray ray-7"></div>
                        <div className="glow-ray ray-8"></div>
                        <div className="glow-ray ray-9"></div>
                        <div className="glow-ray ray-10"></div>
                        <div className="glow-ray ray-11"></div>
                        <div className="glow-ray ray-12"></div>
                        <div className="glow-ray ray-13"></div>
                        <div className="glow-ray ray-14"></div>
                        <div className="glow-ray ray-15"></div>
                        <div className="glow-ray ray-16"></div>
                    </div>
                </div>
            )}

            {/* Saf CSS Stilleri */}
            <style jsx="true">{`
        /* * Temel Kapsayıcı Stilleri */
        .main-container {
          min-height: ${GLOBAL_CONSTANTS.MAIN_MIN_HEIGHT}; 
          width: 100%;
          background-color: ${GLOBAL_CONSTANTS.BACKGROUND_COLOR};
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute; /* Kapsayıcıya tam oturması için */
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          font-family: sans-serif;
          
          /* Opaklık geçişi - Süre sabitlerden alınıyor */
          transition: opacity ${GLOBAL_CONSTANTS.FADE_TRANSITION_MS / 1000}s ease-in-out; 
        }

        /* * KONTROL BUTONU STİLLERİ KALDIRILDI */

        /* * Işıma Konteynerleri */
        .glow-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }

        .glow-container {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
        
        /* Işınların Bağımsız Rotasyon Animasyonu */
        @keyframes individualRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        /* Işınların Bağımsız Ters Rotasyon Animasyonu */
        @keyframes individualRotateReverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }

        /* Işınların Merkezden Patlayarak Ortaya Çıkması */
        @keyframes revealRay {
            0% { 
                height: 0rem; 
                opacity: 0; 
                transform: translate(-50%, -50%) scaleY(0.1); 
            }
            30% { 
                opacity: 0.2;
            }
            100% {
                height: ${GLOBAL_CONSTANTS.RAY_HEIGHT_REM}rem; 
                opacity: 0.7;
                transform: translate(-50%, -50%) scaleY(1);
            }
        }
        

        /* * IŞINLARIN TEMEL TANIMLARI */
        .glow-ray {
          content: '';
          position: absolute;
          
          height: ${GLOBAL_CONSTANTS.RAY_HEIGHT_REM}rem; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          transform-origin: 50% 50%; 
          pointer-events: none;
          
          mix-blend-mode: screen; 
          
          will-change: transform, opacity, height; 
        }

        /* Güncellenmiş Ray Pulse Animasyonu */
        @keyframes rayPulse {
            from { opacity: 0.5; transform: translate(-50%, -50%) scaleY(0.8); } 
            to { opacity: 0.9; transform: translate(-50%, -50%) scaleY(1.2); } 
        }

        /* Işınların Açıları, Kalınlıkları ve Bağımsız Animasyonları DİNAMİK OLARAK OLUŞTURULUYOR */
        ${generateRayStyles()}

      `}</style>
        </div>
    );
});

// Component adını dışa aktarırken de GlowEffectPure olarak kullanıyoruz.
export default GlowEffectPure;
