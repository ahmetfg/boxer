import React, { useState, useEffect, useRef } from 'react';
import ThreeScene from './components/ThreeHyperCasual.tsx';

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
  const didRotate = useRef({})

  useLockScroll();

  return (
    <div className="App"
      style={{
        margin: 0,
        padding: 0,
      }}>
      <ThreeScene key={keyState} didRotate={didRotate} />
    </div>
  );
}

export default App; 
