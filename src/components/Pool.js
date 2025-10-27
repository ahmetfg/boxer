import * as THREE from 'three';

/**
 * Three.js Nesne Havuzu (Object Pool) Sınıfı
 * Performans için nesne oluşturmayı ve yok etmeyi en aza indirir.
 * max boyuta ulaşıldığında Ring Buffer (Dairesel Tampon) mantığı ile yeniden kullanım yapar.
 */
export class Pool {
    // Tüm objeleri tutan ana dizi (Oluşturulma sırasına göre)
    allObjects = [];

    // Kullanımda olmayan (boşta bekleyen) objelerin indekslerini tutan dizi
    availableIndices = [];

    // Yeni objeler oluşturmak için kullanılan şablon nesne
    prefab;

    // Objelerin ekleneceği Three.js sahnesi
    scene;

    // Ring Buffer (Dairesel Tampon) için sıradaki kurban nesnenin indeksi
    nextRecycleIndex = 0;

    // Havuzun izin verilen maksimum büyüklüğü
    maxSize;

    // Şu anda oluşturulmuş toplam nesne sayısı (Sadece okunur)
    get currentSize() {
        return this.allObjects.length;
    }

    /**
     * @param scene Objelerin ekleneceği THREE.Scene.
     * @param prefab Havuzdaki objeler için şablon olarak kullanılacak THREE.Object3D.
     * @param maxSize Havuzun ulaşabileceği maksimum nesne sayısı.
     */
    constructor(scene, prefab, maxSize = 100) {
        this.scene = scene;
        this.prefab = prefab;
        this.maxSize = maxSize;

        // Prefab'ı görünmez yapıyoruz, sadece klonlama amaçlı
        this.prefab.visible = false;
    }

    /**
     * Havuzdan kullanılabilir bir nesne alır.
     * Öncelik sırası: Boşta olanlar > Yeni Oluştur > Ring Buffer'dan Kurban Seç
     *
     * @returns Kullanıma hazır THREE.Object3D nesnesi.
     */
    push(cellPool) {
        let object;
        let objectIndex;

        // 1. Boşta bekleyen (Available) nesne var mı?
        if (this.availableIndices.length > 0) {
            objectIndex = this.availableIndices.pop();
            object = this.allObjects[objectIndex];

        }
        // 2. Max boyuta ulaşıldı mı? -> Ulaşılmadıysa yeni nesne oluştur
        else if (this.currentSize < this.maxSize) {

            // Yeni nesne oluştur (klonla)
            object = this.prefab.clone();

            // **KRİTİK DÜZELTME:** // Nesneyi havuza eklemeden önce DİZİ UZUNLUĞUNU KULLANMAK YERİNE,
            // nesneyi ekle, sonra uzunluğu kontrol et.

            this.allObjects.push(object);
            cellPool.push(object)

            // Yeni eklenen nesnenin indeksi her zaman (dizi uzunluğu - 1)'dir.
            objectIndex = this.allObjects.length - 1;

            // Sahneye ekle
            this.scene.add(object);
        }
        // 3. Max boyuta ulaşıldı ve boşta nesne yok -> Ring Buffer'dan sıradaki "kurbanı" kullan
        else {
            // Ring Buffer mantığı (Burada bir sorun yok)
            objectIndex = this.nextRecycleIndex;
            object = this.allObjects[objectIndex];
            this.nextRecycleIndex = (this.nextRecycleIndex + 1) % this.maxSize;
            console.warn(`[Pool] Max boyuta (${this.maxSize}) ulaşıldı...`);
        }

        // Nesneyi kullanıma hazırla
        object.visible = true;

        // İndeksi ata
        (object).poolIndex = objectIndex;

        return object;
    }

    /**
     * Kullanımı biten bir nesneyi havuza geri iade eder.
     * Nesneyi görünmez yapar ve boşta bekleyenler listesine ekler.
     * @param object Havuza iade edilecek THREE.Object3D nesnesi.
     */
    release(object) {
        // Nesneyi görünmez yap
        object.visible = false;

        // Nesnenin indeksini al
        const index = (object).poolIndex;

        if (index === undefined || index < 0 || index >= this.allObjects.length) {
            console.error("[Pool] Geçersiz nesne veya bu havuzdaki bir nesne değil.", object);
            return;
        }

        // İndeksin zaten boşta listesinde olup olmadığını kontrol et (tekrar iade hatasını önler)
        if (!this.availableIndices.includes(index)) {
            this.availableIndices.push(index);
        }

        // İPUCU: release'de nesnenin hızını, kuvvetini vb. sıfırlamak iyi bir uygulamadır.
        // object.position.set(0, 0, 0); 
        // object.userData = {}; // Kullanıcı verilerini temizle
    }

    /**
     * Belirtilen indeksteki nesneyi döndürür (Hata ayıklama/kontrol için).
     */
    getObject(index) {
        if (index < 0 || index >= this.allObjects.length) {
            throw new Error(`[Pool] Geçersiz index: ${index}. Maksimum: ${this.allObjects.length - 1}`);
        }
        return this.allObjects[index];
    }

    Reset() {
        for (let index = 0; index < this.allObjects.length; index++) {
            const element = this.allObjects[index];
            if (element) {
                this.release(element)
                this.scene.remove(element)
            }
        }

        this.nextRecycleIndex = 0
        this.allObjects = []
        this.availableIndices = []
    }
}