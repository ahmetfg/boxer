import React, { useState, useEffect, useRef } from 'react';
//import ThreeScene from './components/ThreeScene';
//import ThreeScene from './components/ThreeAim.tsx';
import ThreeScene from './components/ThreeMatch.tsx';
// import "./components/TEST.js"
// import { Auth } from './components/Auth.js';
// import { Reader } from './components/Reader.tsx';
// import RagdollScene from './components/ThreeDoll';

function useLockScroll() {
  useEffect(() => {
    const stop = (e) => e.preventDefault();

    window.addEventListener("wheel", stop, { passive: false });
    window.addEventListener("touchmove", stop, { passive: false });

    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
    };
  }, []);

  useEffect(() => {
    const style = document.documentElement.style;
    style.webkitUserSelect = 'none';
    style.mozUserSelect = 'none';
    style.msUserSelect = 'none';
    style.userSelect = 'none';

    // cleanup isterseniz dönüşte boşaltabilirsiniz
    return () => {
      style.webkitUserSelect = '';
      style.mozUserSelect = '';
      style.msUserSelect = '';
      style.userSelect = '';
    };
  }, []);
}

function App() {
  const [keyState, setKeyState] = useState(0);

  const getInitialOrientation = () => {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    return !isLandscape; 
  };

  // const [forceRotate, setForceToRotate] = useState(getInitialOrientation)
  const didRotate = useRef({})

  // useEffect ile component yüklendiğinde (mount) ve kaldırıldığında (unmount) çalışacak kodu belirliyoruz.
  // useEffect(() => {
  //   // 1. Media Query oluşturuluyor: 'orientation: landscape'
  //   const landscapeQuery = window.matchMedia("(orientation: landscape)");
  //   // 2. Handler (olay yöneticisi) fonksiyonu tanımlanıyor.
  //   const handleOrientationChange = (e) => {
  //     if (e.matches) {
  //       // alert("orientation change:", e)
  //       setForceToRotate(false);
  //       updateViewportVars();
  //       didRotate.current();
  //       setKeyState(prev => prev + 1)
  //     }
  //   };

  //   // 3. Component yüklendiğinde: 
  //   // a. Mevcut durumu kontrol et (Initial check)
  //   handleOrientationChange(landscapeQuery);

  //   // b. Olay dinleyiciyi ekle
  //   // addEventListener kullanmak addListener'dan daha modern ve tavsiye edilir.
  //   landscapeQuery.addEventListener("change", handleOrientationChange);

  //   // 4. Cleanup (Temizleme) Fonksiyonu: Component kaldırıldığında çalışır.
  //   return () => {
  //     // Hafıza sızıntısını önlemek için olay dinleyiciyi kaldır.
  //     landscapeQuery.removeEventListener("change", handleOrientationChange);
  //   };
  // }, []); 

  useLockScroll();

  // function updateViewportVars() {
  //   const vvw = window.visualViewport?.width ?? window.innerWidth;
  //   const vvh = window.visualViewport?.height ?? window.innerHeight;
  //   document.documentElement.style.setProperty(forceRotate ? '--vvh' : '--vvw', `${vvw}px`);
  //   document.documentElement.style.setProperty(forceRotate ? '--vvw' : '--vvh', `${vvh}px`);
  // }

  // useEffect(() => {
  //   // 1) İlk yüklemede bir kere çalıştırıyoruz
  //   updateViewportVars();

  //   // 2) Sonra resize/scroll değişikliklerini dinliyoruz
  //   const vv = window.visualViewport;
  //   vv?.addEventListener('resize', updateViewportVars);
  //   vv?.addEventListener('scroll', updateViewportVars);

  //   // 3) Cleanup
  //   return () => {
  //     vv?.removeEventListener('resize', updateViewportVars);
  //     vv?.removeEventListener('scroll', updateViewportVars);
  //   };
  // }, [])

  return (
    <div className="App"
      // onClick={(e) => {
      //   alert("c")
      //   console.log("c")
      //   setForceToRotate(true);
      // }}
      style={{
        margin: 0,
        padding: 0,

      }}>
      {/* <Video360 
      src="/videos/a3.mp4"
      glbPath="/models/track.glb"
      glbPath2="/models/track2.glb"
      animationName="CubeAction.001"
      /> */}
{/* 
      {forceRotate ? null : <div id="rotate-lock" className="rotate-lock" aria-hidden>
        <div className="card">
          <h2>Please rotate your phone</h2>
          <p>It works in landscape mode.</p>
          <button
            style={{
              position: 'fixed',
              //left: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left))`,
              right: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left) * .1)`,
              bottom: 10,
              width: `calc(var(--vvh) * 0.08)`,
              height: `calc(var(--vvh) * 0.08)`,
              padding: 0,
              fontSize: 'calc(var(--vvh) * 0.04)',
              borderRadius: '50%',
              backgroundColor: 'grey',
              color: 'white',
              border: 'none',
              userSelect: 'none',
              touchAction: 'none',
              transform: `translateZ(0px)`,
              zIndex: 10
            }}
            onPointerUp={() => {
              setForceToRotate(true)
              setTimeout(() => {
                setForceToRotate(true)
                updateViewportVars();
                didRotate.current();
              }, 1000);
            }}
          >
            ⚙
          </button>
        </div>
      </div>} */}
      {/* refresh */}
      {/* <Reader
        onResult={(text) => {
          console.log("QR:", text);
          // alert(`Bulundu: ${text}`);
        }}
        onError={(e) => console.error(e)}
        facingMode="environment"
        continuous={true}
      /> */}
      <ThreeScene key={keyState} didRotate={didRotate} />
    </div>
  );
}

export default App; 
