import React from "react";
import { SceneManager } from "./SceneManager.tsx";

// Reusable SelectionMenu bileşeninin tanımı, App içinde yer alıyor
const SelectionMenu = ({ allData, onSelect, style }) => {
    // --- 1. Ana Stiller ---
    const containerStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100vh',
        width: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'row',
        gap: '5px',
        margin: 0,
        boxSizing: 'border-box',
        ...style
    };

    // --- 2. Yeni Eleman Stilleri ---

    // Sağ Alt Köşe Kutucuk Stili (Parent) - BÜYÜK KÖŞE KUTUSU
    const subItemStyle = {
        position: 'absolute',
        bottom: '-5px',
        right: '-5px',

        minWidth: '85%',
        maxWidth: '95%',
        minHeight: '110px',

        backgroundColor: '#ffffff',
        border: '5px solid #000000',

        display: 'flex',
        flexDirection: 'row',

        alignItems: 'stretch',
        gap: '0px',
    };

    const newBoxStyle = { // 1. KUTU (SOLDAN İLK KUTUCUK)
        width: '32%',

        // Top, Left ve Bottom'dan -5px taşırma
        marginLeft: '-5px',
        marginTop: '-5px',
        marginBottom: '-5px',

        backgroundColor: 'green',
        border: '5px solid #000000',
        flexShrink: 0,
        boxSizing: 'border-box',
    };

    const textContainerStyle = {
        color: '#000000',
        flexGrow: 2,
        textAlign: 'right',

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        paddingLeft: '10px',
        paddingRight: '15px',
        paddingTop: '10px',
    };

    const singleTextStyle = {
        fontSize: '16px',
    };

    const upperTextStyle = {
        ...singleTextStyle,
        fontSize: '24px',
        fontWeight: 900,
        flexShrink: 0,
    };

    // Elemanı içeren yardımcı bileşen
    const ItemWithCornerBox = ({ data, index }) => {

        const itemStyle = React.useMemo(() => ({
            flex: 1,
            display: "flex",
            height: '100%',
            backgroundImage: `url(${SceneManager.PUBLIC_URL + '/textures/' + data.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",

            position: 'relative',
            cursor: 'pointer',
        }), [data.image])

        const handleClick = () => {

            console.log("Seçildi:", data.title, "Index:", index, "url(/" + data.image + ")");
            onSelect(index);
        };

        return (
            <div style={itemStyle}
                onClick={handleClick} onTouchEnd={handleClick}>

                {/* Köşe kutucuğu */}
                <div style={subItemStyle}>

                    {/* 1. Yeni Siyah Kenarlıklı Kutu (Yeşil) */}
                    <div style={newBoxStyle}></div>

                    {/* 2. Yazı Konteyneri */}
                    <div style={textContainerStyle}>
                        <div style={upperTextStyle}>{data.title}</div>
                        <div style={singleTextStyle}>{data.desc}</div>
                    </div>

                </div>
            </div>
        );
    };

    return (
        <div style={containerStyle}>
            {/* Veriyi haritalayarak elemanlar oluşturuldu */}
            {allData.map((itemData, index) => (
                <ItemWithCornerBox
                    key={index}
                    data={itemData}
                    index={index}
                />
            ))}
        </div>
    );
};

// Menü için kullanılacak veri
const menuData = [
    { image: "menuMagnetLvlOne.jpg", title: "Lvl 1 Magnet", desc: "Gains rewards from locations 5% farther away." },
    { image: "menuAmmoLvlOne.jpeg", title: "Lvl 1 Ammo", desc: "Increases ammo capacity by an additional 5%." },
    { image: "menuDonutLvlOne.jpeg", title: "Lvl 1 Donut", desc: "Gains a protective shield area for safety." }
];

// Ana bileşen (App) - Uygulamanın ana sayfasını simgeler
const Controller = ({ onSelect, style }) => {

    // Seçim yapıldığında SelectionMenu tarafından çağrılacak callback fonksiyonu
    const handleSelection = (selectedIndex) => {

        onSelect({ data: menuData[selectedIndex], index: selectedIndex })
    };

    return (
        <SelectionMenu
            allData={menuData}
            onSelect={handleSelection} // Seçim callback'i (seçilen index'i alır)
            style={style}
        />
    )
};

export default Controller;
