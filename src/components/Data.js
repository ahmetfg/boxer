// "./Utils.tsx" dosyasından import edildiği varsayılıyor:
// export function getRandomInt(min, max); 

import { getRandomInt } from "./Utils.js";

export class UpdateType {
    static magnetTreshold="magnetTreshold" 
    static ammoCapacity="ammoCapacity" 
    static donut="donut" 
    static cap="cap" 
    static headset="headset" 
    static vest="vest" 
    static alien="alien"
};

export class UpdateRarity {
    static common = "common"
    static uncommon = "uncommon"
    static rare = "rare"
    static epic = "epic"
    static legendary = "legendary"
    static mythic = "mythic"
};

export const menuData= [
    {
        rarity: UpdateRarity.common,
        image: "menuMagnetLvlOne.jpg",
        title: "Lvl 1 Magnet",
        desc: "Gains rewards from locations 5% farther away.",
        type: UpdateType.magnetTreshold
    },
    {
        rarity: UpdateRarity.common,
        image: "menuAmmoLvlOne.jpeg",
        title: "Lvl 1 Ammo",
        desc: "Increases ammo capacity by an additional 5%.",
        type: UpdateType.ammoCapacity
    },
    {
        rarity: UpdateRarity.epic,
        image: "menuDonutLvlOne.jpeg",
        title: "Lvl 1 Donut",
        desc: "Gains a protective shield area for safety.",
        type: UpdateType.donut
    },
    {
        rarity: UpdateRarity.uncommon,
        image: "menuCapLvlOne.jpeg",
        title: "Lvl 1 Cap",
        desc: "Gains a protective shield area for safety.",
        type: UpdateType.cap
    },
    {
        rarity: UpdateRarity.uncommon,
        image: "menuHeadsetLvlOne.jpeg",
        title: "Lvl 1 Headset",
        desc: "Gains a protective shield area for safety.",
        type: UpdateType.headset
    },
    {
        rarity: UpdateRarity.rare,
        image: "menuVestLvlOne.jpeg",
        title: "Lvl 1 Vest",
        desc: "Gains a protective shield area for safety.",
        type: UpdateType.vest
    },
    {
        rarity: UpdateRarity.legendary,
        image: "menuAlienLvlOne.jpeg",
        title: "Lvl 1 Alien",
        desc: "Gains a protective shield area for safety.",
        type: UpdateType.alien
    },
];

// Nadirlik (Rarity) seviyelerinin seçilme ağırlıkları.
// Yüksek ağırlık = Daha sık seçilme olasılığı.
const BASE_RARITY_WEIGHTS = {
    [UpdateRarity.common]: 45,    // Yaygın, en yüksek olasılık
    [UpdateRarity.uncommon]: 30,  // Yaygın olmayan
    [UpdateRarity.rare]: 7,      // Nadir
    [UpdateRarity.epic]: 3,       // Destansı
    [UpdateRarity.legendary]: 2,  // Efsanevi (Listenizde yok ama tanımlandı)
    [UpdateRarity.mythic]: 1,     // Efsunlu (Listenizde yok ama tanımlandı)
};

// Seviyeye göre ağırlık çarpanlarını (modifier) belirleyen bir harita.
// Seviye arttıkça:
// 1. Nadir olmayan (Common/Uncommon) eşyaların ağırlığı azalır.
// 2. Nadir (Rare+) eşyaların ağırlığı artar.
const LEVEL_WEIGHT_MODIFIER = {
    // Yaygın (Common) ve Yaygın Olmayan (Uncommon) için negatif çarpanlar
    [UpdateRarity.common]: (level) => Math.max(0, 1 - (level * 0.03)), // Seviye 10'da ~%70, Seviye 33'te %0
    [UpdateRarity.uncommon]: (level) => Math.max(0, 1 - (level * 0.015)), // Daha yavaş düşüş
    
    // Nadir ve daha üstü için pozitif çarpanlar
    [UpdateRarity.rare]: (level) => 1 + (level * 0.05), // Seviye 10'da %50 artış
    [UpdateRarity.epic]: (level) => 1 + (level * 0.10), // Seviye 10'da %100 artış (2 kat)
    [UpdateRarity.legendary]: (level) => 1 + (level * 0.15),
    [UpdateRarity.mythic]: (level) => 1 + (level * 0.20),
};

/**
 * Oyuncunun seviyesine göre dinamik olarak nadirlik ağırlıklarını hesaplar.
 * @param level Oyuncunun mevcut seviyesi (1 veya üzeri olmalı).
 * @returns Dinamik ağırlık haritası.
 */
function getDynamicRarityWeights(level) {
    const dynamicWeights = {};
    const safeLevel = Math.max(1, level); // Seviyenin en az 1 olmasını sağla

    for (const rarity in BASE_RARITY_WEIGHTS) {
        const key = rarity;
        const baseWeight = BASE_RARITY_WEIGHTS[key];
        const modifierFn = LEVEL_WEIGHT_MODIFIER[key];

        if (modifierFn) {
            // Temel ağırlığı, seviye çarpanı ile çarp
            const newWeight = baseWeight * modifierFn(safeLevel);
            dynamicWeights[key] = Math.round(newWeight);
        } else {
             // Çarpan yoksa temel ağırlığı kullan (güvenlik için)
            dynamicWeights[key] = baseWeight;
        }
    }
    
    // Tüm ağırlıkları döndür
    return dynamicWeights;
}

/**
 * Nadirlik ağırlıklarını (level'a göre dinamik) kullanarak menuData listesinden 3 farklı yeteneği seçer.
 * @param currentLevel Oyuncunun mevcut seviyesi.
 * @returns {MenuData[]} Seviye atlama menüsünde gösterilecek 3 yeteneğin listesi.
 */
export function fetchLevelUpMenuData(currentLevel){
    const dynamicWeights = getDynamicRarityWeights(currentLevel);
    
    // Toplam ağırlığı hesapla
    const totalWeight = Object.values(dynamicWeights).reduce((sum, weight) => sum + weight, 0);

    const availableItems = [...menuData]; 
    const selectedItems= [];
    
    if (availableItems.length < 3) {
        return availableItems;
    }

    // Seçim mekanizması aynı kalır, sadece dynamicWeights ve totalWeight kullanılır.
    while (selectedItems.length < 3) {
        // Toplam ağırlık 0 ise, kalanı rastgele seç (hata önleme)
        if (totalWeight <= 0) {
             const randomIndex = getRandomInt(0, availableItems.length - 1);
             const item = availableItems[randomIndex];
             selectedItems.push(item);
             availableItems.splice(randomIndex, 1);
             continue; 
        }

        const randomWeightTarget = getRandomInt(0, totalWeight); 
        let currentWeightSum = 0;
        let selectedItem;

        for (const item of availableItems) {
            // Dinamik ağırlığı kullan
            const weight = dynamicWeights[item.rarity] || 0; 
            currentWeightSum += weight;

            if (randomWeightTarget < currentWeightSum) {
                selectedItem = item;
                break;
            }
        }

        if (selectedItem) {
            selectedItems.push(selectedItem);
            
            // Seçilen yeteneği listeden çıkar
            const indexToRemove = availableItems.findIndex(item => item.type === selectedItem.type);
            if (indexToRemove !== -1) {
                availableItems.splice(indexToRemove, 1);
            }
        } else {
             // Eğer random seçim başarısız olursa (örneğin kayan nokta hatası nedeniyle), 
             // kalanlardan rastgele birini seçerek döngüden çıkmayı garanti et.
             if (availableItems.length > 0) {
                 const fallbackIndex = getRandomInt(0, availableItems.length - 1);
                 selectedItems.push(availableItems[fallbackIndex]);
                 availableItems.splice(fallbackIndex, 1);
             }
        }
    }

    return selectedItems;
}