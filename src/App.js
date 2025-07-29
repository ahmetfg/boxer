import React from 'react';
import { useEffect } from "react";
//import ThreeScene from './components/ThreeScene';
import ThreeScene from './components/ThreeAim.tsx';
import Test from './components/Test.jsx';
import RagdollScene from './components/ThreeDoll';
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

function viewPortListen() {
  function updateViewportVars() {
    const vvw = window.visualViewport?.width ?? window.innerWidth;
    const vvh = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--vvw', `${vvw}px`);
    document.documentElement.style.setProperty('--vvh', `${vvh}px`);
  }
  // 1) İlk yüklemede bir kere çalıştırıyoruz
  updateViewportVars();

  // 2) Sonra resize/scroll değişikliklerini dinliyoruz
  const vv = window.visualViewport;
  vv?.addEventListener('resize', updateViewportVars);
  vv?.addEventListener('scroll', updateViewportVars);

  // 3) Cleanup
  return () => {
    vv?.removeEventListener('resize', updateViewportVars);
    vv?.removeEventListener('scroll', updateViewportVars);
  };
}

function App() {
  useLockScroll();
  
  useEffect(()=>{
    viewPortListen();
  },[])

  return (
    <div className="App" style={{
      margin: 0,
      padding: 0
    }}>
      {/* <Video360 
      src="/videos/a3.mp4"
      glbPath="/models/track.glb"
      glbPath2="/models/track2.glb"
      animationName="CubeAction.001"
      /> */}
      <ThreeScene />
    </div>
  );
}

export default App; 
