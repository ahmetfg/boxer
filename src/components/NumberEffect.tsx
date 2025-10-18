import React, { useState, useCallback, useEffect } from 'react';

// ARTIK KONTROL BU İKİ DEĞİŞKENDE!
// ----------------------------------------------------------------------
// 1. Efektin toplam ömrü (Hareket süresi ve DOM'dan kaldırılma süresi)
const TOTAL_DURATION_MS = 1500;
// 2. Solmaya başlamadan önce ne kadar süre tam görünür kalacağı
const FADE_DELAY_MS = 700;
// ----------------------------------------------------------------------

// Solma süresi otomatik olarak hesaplanıyor
const FADE_TIME_MS = TOTAL_DURATION_MS - FADE_DELAY_MS;

// Maksimum aktif efekt sayısı
const MAX_EFFECT_COUNT = 10;

// Bileşenlerin kullanacağı CSS stillerini tek bir yerde tanımlıyoruz.
const styles = `
.app-container {
  min-height: 100vh;
  background-color: #111827; /* Koyu Arka Plan */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
}

.score-value {
  font-size: 1.875rem; /* text-3xl */
  font-weight: 800; /* font-extrabold */
  font-family: monospace;
}

/* Floating Reward Styles */
.reward-base {
  background: transparent;
  position: absolute;
  font-size: 1.5rem; 
  font-weight: 900;
  color: #ff3c00ff;
  user-select: none;
  pointer-events: none;
  z-index: 10;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 1));
  /* GPU kullanımını optimize etmek için tarayıcı ipucu */
  will-change: transform, opacity;

  /* CSS Değişkenlerini kullanıyoruz */
  transition: 
    transform var(--total-duration) cubic-bezier(0.2, 1, 0.3, 1), 
    opacity var(--fade-time) var(--fade-delay) ease-out;
}

/* Bu sınıflar sadece başlangıç/bitiş opaklık değerlerini yönetir. */
.reward-start {
  opacity: 1;
}

.reward-end {
  opacity: 0;
}

/* Responsive adjustment for reward text size */
@media (min-width: 640px) {
  .reward-base {
    font-size: 1.875rem; /* sm:text-3xl */
      background: transparent;

  }
}
`;

// Tek bir +1 ödülünü temsil eden ve animasyonunu yöneten yardımcı bileşen
const FloatingReward = React.memo(({ id, left, offsetX, rotation }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Bileşen DOM'a eklendikten hemen sonra animasyonu tetiklemek için true yapıyoruz.
        setIsVisible(true);
    }, []);

    // Animasyon durumu sınıfı
    const animationClass = isVisible ? 'reward-end' : 'reward-start';

    // Hareket bittiğinde uygulanacak transform (rotate, scale ve translate birleştirildi)
    const endTransform = isVisible
        ? `translate(${offsetX}px, -200px) rotate(${rotation}deg) scale(1.2)` // -200px daha uzun süzülme
        : `translate(0px, 0px) rotate(0deg) scale(1)`; // Başlangıç konumu

    return (
        <div
            key={id}
            className={`reward-base ${animationClass}`}
            style={{
                left: `${left}%`,
                bottom: '0%', // Butonun hemen üstünden başlamasını sağlamak için
                transform: endTransform, // Dinamik transform stili
                // Merkezi JS sabitlerini CSS değişkeni olarak enjekte ediyoruz
                '--total-duration': `${TOTAL_DURATION_MS}ms`,
                '--fade-delay': `${FADE_DELAY_MS}ms`,
                '--fade-time': `${FADE_TIME_MS}ms`,
            }}
        >
            +1
        </div>
    );
});


export class Controller {
    Flash: () => void;
    constructor() {

    }
    // Ana uygulama bileşeni
    Frame = ({ style, }) => {
        const [rewards, setRewards] = useState([]);

        // Buton tıklama işlevi
        const handleClick = useCallback(() => {

            // MAX_EFFECT_COUNT Kontrolü 
            if (rewards.length >= MAX_EFFECT_COUNT) {
                console.log('Maksimum efekt sayısına ulaşıldı, yeni efekt engellendi.');
                return;
            }

            const newId = Date.now() + Math.random();

            // Yatay konum (30% ile 70% arası)
            const randomLeft = Math.floor(Math.random() * (70 - 30 + 1)) + 30;

            // Yatay sürüklenme (-50px ile +50px arası)
            const randomOffsetX = Math.floor(Math.random() * 101) - 50;

            // Dönme açısı (-30deg ile +30deg arası)
            const randomRotation = Math.floor(Math.random() * 61) - 30;

            // Yeni ödülü state'e ekle
            setRewards(prevRewards => [
                ...prevRewards,
                {
                    id: newId,
                    left: randomLeft,
                    offsetX: randomOffsetX,
                    rotation: randomRotation
                }
            ]);

            // Animasyon bittikten sonra (TOTAL_DURATION_MS) ödülü DOM'dan kaldır
            setTimeout(() => {
                setRewards(prevRewards =>
                    prevRewards.filter(reward => reward.id !== newId)
                );
            }, TOTAL_DURATION_MS);

        }, [rewards.length]); // rewards.length dependency'si eklendi

        this.Flash = handleClick

        return (
            <div style={style}>
                {/* CSS Stillerini sayfanın başına ekle */}
                <style>{styles}</style>

                <div className="app-container">
                    {/* Mevcut tüm ödül animasyonlarını render et */}
                    {rewards.map(reward => (
                        <FloatingReward
                            key={reward.id}
                            id={reward.id}
                            left={reward.left}
                            offsetX={reward.offsetX}
                            rotation={reward.rotation}
                        />
                    ))}
                    {/* Ana Buton Alanı */}
                    <div className="button-area">


                    </div>
                </div>
            </div>
        );
    };

}