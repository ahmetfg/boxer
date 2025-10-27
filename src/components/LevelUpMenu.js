import { UpdateRarity } from "./Data.js";
import { SceneManager } from "./SceneManager.js";

// --- 2. Controller Class (Combines React's Controller and SelectionMenu logic) ---
const componentCSS = `
            /* 1. Main Container Style - Body'den taşınan stilleri içerir */
            .selection-levelUp-container {
                font-family: 'Inter', sans-serif; /* Body'den taşındı */
                /* font-size: 16px; REM tabanı için Body'den taşındı */
                font-size: calc(var(--vvw) * 0.03); /* REM tabanı için Body'den taşındı */
                overflow: hidden; /* Body'den taşındı */
                
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                height: 100%;
                width: 100%;
                background-color: #000000;
                display: flex;
                flex-direction: row;
                gap: 5px;
                margin: 0;
                box-sizing: border-box;
            }

            /* 2. Item Style (The main flex child) */
            .levelUp-item {
                flex: 1;
                display: flex;
                height: 100%;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                position: relative;
                cursor: pointer;
                transition: transform 0.3s ease;
            }

            .levelUp-item:hover {
                // transform: scale(1.01);
            }
            
            .item-tag {
                position: absolute;
                /*
                top: 30px;
                right: 30px;
                */
                top: -5px;
                right: -5px;

                font-family: 'IMPACT', sans-serif;
                font-size: min(max(calc(var(--vvh) * 0.04), 12px), 30px); /* 18px */
                
                font-weight: 900;
                background-color: #D9D9D9;
                /*
                border-radius: 8px;
                */
                border: 5px solid;
                border-color: black;

                padding-left: 5px;
                padding-right: 5px;
                padding-top: 2px;
                padding-bottom: 2px;
                transform-origin: bottom right;
                transform: translateY(-100%)  rotateZ(-90deg);
            }

            /* 3. Right Bottom Corner Box (Parent) - BÜYÜK KÖŞE KUTUSU */
            .sub-item-box {
                position: absolute;
                bottom: -5px;
                right: -5px;

                min-width: 55%;
                max-width: 85%;
                z-index: 10; 

                background-color: #ffffff;
                border: 5px solid #000000;
                border-radius: 4px;

                display: flex;
                flex-direction: row;

                align-items: stretch;
                gap: 0px;
            }

            /* 4. New Box (1. KUTU / Arrow box) */
            .new-box { 
                width: 22%;
                margin-left: -5px;
                margin-top: -5px;
                margin-bottom: -5px;
                font-size: 1.625rem; /* 26px */
                font-weight: 900;
                background-color: #00e42aff; /* Example Green */
                border: 5px solid #000000;
                flex-shrink: 0;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000000;
            }

            /* 5. Text Container */
            .text-container {
                color: #000000;
                flex-grow: 2;
                text-align: right;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                padding: 10px 15px 10px 10px;
            }

            /* 6. Text Styles (REM birimi ile garantilendi) */
            .single-text {
                font-size: min(max(calc(var(--vvh) * 0.03), 12px), 30px); /* REM tabanı için Body'den taşındı */
                line-height: 1.2;
            }

            .upper-text {
                font-size: min(max(calc(var(--vvh) * 0.06), 20px), 40px); /* REM tabanı için Body'den taşındı */
                
                font-weight: 900;
                font-family: 'Satoshi', sans-serif;
                flex-shrink: 0;
                line-height: 1;
                margin-bottom: 5px;
            }

            .icon {
                height: min(max(calc(var(--vvh) * 0.09), 30px), 60px);
                width: 100%;
                /* 2. Görselin tekrar etmesini engelleyin (isteğe bağlı, önerilir) */
                background-repeat: no-repeat;

                /* 3. Görselin elementin boyutuna uyacak şekilde ayarlanmasını sağlayın */
                /* Genellikle tam oturması için 'cover' veya 'contain' kullanılır */
                background-size: contain; 

                /* 4. Görseli merkeze hizalayın (isteğe bağlı, önerilir) */
                background-position: left;
                
                background-image: url('https://lcdn-eu.icons8.com/c/rG_GdK24cEO7FR76-F92Gw/6756358a6aeb3c1e08ca1883863647c7fa7b6059.webp');
            }

            /* Responsive adjustments for smaller screens */
            @media (max-width: 768px) {
                .sub-item-box {
                    min-width: 90%;
                    max-width: 95%;
                }

                .new-box {
                    font-size: 1.125rem; /* 18px */
                }

                .upper-text {
                    font-size: 1.5rem; /* 24px */
                }

                .single-text {
                    font-size: 1rem; /* 16px */
                }
            }
        `;

/**
 * A vanilla JavaScript class to render a responsive selection levelUp
 * and handle user interaction.
 */
export class SelectionController {
    menuData = []
    container;
    onSelectCallback;
    rootElement;

    /**
     * @param {HTMLElement} container - The DOM element to append the levelUp to.
     * @param {function({type: string, index})} onSelectCallback - The function to call when an item is selected.
     */
    constructor(_container, onSelectCallback) {
        if (!_container) {
            console.error("SelectionController requires a valid container element.");
            return;
        }

        this.container = _container;
        this.onSelectCallback = onSelectCallback;

        // Style'ı dinamik olarak HEAD'e enjekte et
        this._injectStyles();

        // 1. Create the root levelUp element
        this.rootElement = document.createElement('div');
        this.rootElement.classList.add('selection-levelUp-container');
    }


    setMenu(menuData) {
        this.rootElement.innerHTML = ''

        this.menuData = menuData;
        // 2. Render all levelUp items
        this.menuData.forEach((data, index) => {
            const item = this._createItemWithCornerBox(data, index);
            this.rootElement.appendChild(item);
        });

        // 3. Append to the target container, replacing its content
        this.container.appendChild(this.rootElement);
    }

    /** Inject the CSS string into a style tag in the document head. */
    _injectStyles() {
        // Mevcut stilin daha önce eklenip eklenmediğini kontrol et
        if (!document.getElementById('selection-levelUp-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'selection-levelUp-styles';
            styleTag.textContent = componentCSS;
            document.head.appendChild(styleTag);
        }
    }

    /**
     * Handles the selection logic, mirroring the handleSelection logic from React.
     * @param {number} selectedIndex - The index of the selected item.
     */
    _handleSelection(selectedIndex) {
        const selectedData = this.menuData[selectedIndex];
        const updateData = {
            type: selectedData.type,
            index: selectedIndex
        };

        // Log and call the user's callback (this is the original interaction point)
        console.log("Item Selected:", selectedData.title, updateData);
        if (this.onSelectCallback) {
            this.onSelectCallback(updateData);
        }
    }

    /**
     * Creates a single levelUp item with its complex corner box structure.
     * @param {Object} data - The data for the item (image, title, desc).
     * @param {number} index - The index of the item in menuData.
     * @returns {HTMLElement} The fully constructed item element.
     */
    _createItemWithCornerBox(data, index) {
        const item = document.createElement('div');
        item.classList.add('levelUp-item');
        // Use placeholder image URL 
        // item.style.backgroundImage = `url(${imageMap[data.image]})`;
        item.style.backgroundImage = `url(${SceneManager.PUBLIC_URL + '/textures/' + data.image})`;
        item.setAttribute('data-index', index);

        // --- Event Listener ---
        const clickHandler = (e) => {
            // Prevent touch interactions from triggering mouse clicks as well
            if (e.type === 'touchend') e.preventDefault();
            this._handleSelection(index);
        };

        item.addEventListener('click', clickHandler);
        item.addEventListener('touchend', clickHandler); // For touch devices

        // --- Sub Item Box (Corner Box) ---
        const subItem = document.createElement('div');
        subItem.classList.add('sub-item-box');

        // 1. Arrow Box
        const newBox = document.createElement('div');
        newBox.classList.add('new-box');
        // newBox.textContent = '➔';


        const icon = document.createElement('div');
        icon.classList.add('icon');

        newBox.appendChild(icon)

        const tag = document.createElement('div');
        tag.classList.add('item-tag');

        switch (data.rarity) {
            case UpdateRarity.uncommon:
                tag.style.backgroundColor = "white"
                break;
            case UpdateRarity.rare:
                tag.style.backgroundColor = "green"
                tag.style.color = "white"
                break;
            case UpdateRarity.epic:
                tag.style.backgroundColor = "purple"
                tag.style.color = "white"
                break;

            default:
                break;
        }
        console.log(data);
        
        tag.textContent = data.rarity.toUpperCase();

        // 2. Text Container
        const textContainer = document.createElement('div');
        textContainer.classList.add('text-container');

        const upperText = document.createElement('div');
        upperText.classList.add('upper-text');
        upperText.textContent = data.title;

        const singleText = document.createElement('div');
        singleText.classList.add('single-text');
        singleText.textContent = data.desc;

        textContainer.appendChild(upperText);
        textContainer.appendChild(singleText);

        // Assemble the Corner Box
        subItem.appendChild(newBox);
        subItem.appendChild(textContainer);

        // Assemble the main Item
        item.appendChild(subItem);
        item.appendChild(tag)

        return item;
    }

    /** Removes the levelUp and cleans up listeners. */
    destroy() {
        if (this.rootElement && this.rootElement.parentNode) {
            this.rootElement.parentNode.removeChild(this.rootElement);
        }
    }
}

// --- 3. Otomatik Başlatma Mantığı (Self-Initializing Logic) ---
export function autoInitialize(rootElement, onSelect) {
    // Hedef ID
    const TARGET_ID = 'levelUp';
    // Kullanıcının dışarıdan sağlayabileceği geri çağırma (callback) fonksiyonu
    // Basitlik için varsayılan olarak konsola yazan bir fonksiyon tanımlanmıştır.
    const defaultOnSelectionMade = (data) => {
        console.log(`[EXTERNAL CALLBACK]: Selection received - Type: ${data.type}, Index: ${data.index}`);
    };
    return new SelectionController(rootElement, onSelect ?? defaultOnSelectionMade);

    // const initialize = () => {
    //     if (rootElement) {
    //         // Controller'ı başlatma
    //         controller = new SelectionController(rootElement, onSelect ?? defaultOnSelectionMade);
    //         console.log(`SelectionController initialized in #${TARGET_ID}.`);
    //     } else {
    //         console.warn(`Target element with ID='${TARGET_ID}' not found.`);
    //     }
    // };

    // // DOM tamamen yüklendiğinde başlat
    // if (document.readyState === 'loading') {
    //     document.addEventListener('DOMContentLoaded', initialize);
    // } else {
    //     initialize();
    // }
};

