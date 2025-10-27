import { SceneManager } from "./SceneManager.js";
import { autoInitialize } from './LevelUpMenu.js';
import { fetchLevelUpMenuData } from "./Data.js";

export class UI {
    static root;
    static crosshairDiv;
    static crossSize = 0.01;
    static damage;
    static damageText;
    static runBtn;
    static ammoBarBtn;
    static ammoPercent = 100;
    static dashboardDiv;
    static drawcalls;
    static menuOverlay;
    static fireBtn;
    static crouchBtn;
    static resetBtn;
    static healthBarBtn;
    static balance = 0;
    static onLevelUpdateSelected = (data) => { };
    static onShootClickedDown = (e) => { };
    static onRunClickedDown = (e) => { };
    static onRunClickedUp = (e) => { };
    static onCrouchClicked = (e) => { };
    static level = 1;
    static nextLevelPercent = 0;
    static levelUpController;
    // ---------------------------------------------------------------------------
    // Basit DOM helper
    static el(tag, style = {}, attrs = {}) {
        const d = document.createElement(tag);
        Object.assign(d.style, style);
        for (const k in attrs) {
            if (k === 'text') d.textContent = attrs[k];
            else if (k.startsWith('on')) d[k] = attrs[k];
            else d.setAttribute(k, attrs[k]);
        }
        return d;
    }
    // ---------------------------------------------------------------------------
    // yardımcı UI setter’lar (orijinaliyle aynı etki)
    static setNextLevelPercent(v) {
        UI.nextLevelPercent = v;
        const rightBar = UI.healthBarBtn?.nextSibling;
        if (rightBar?.firstChild) rightBar.firstChild.style.width = `${UI.nextLevelPercent}%`;
    }
    static setAmmoPercent(v) {
        UI.ammoPercent = v;
        if (UI.ammoBarBtn?.firstChild) UI.ammoBarBtn.firstChild.style.width = UI.ammoPercent > 0 ? `${UI.ammoPercent}%` : '0px';
    }
    static setLevel(v) {
        UI.level = v;
        const rightText = UI.healthBarBtn?.nextSibling?.lastChild;
        if (rightText) rightText.textContent = `LvL ${UI.level}`;
    }
    static setDashboardBalance() {
        UI.dashboardDiv.textContent = '';
        const icon = UI.el('i');
        icon.className = 'fa-solid fa-coins';
        icon.style.color = 'limegreen';
        icon.style.marginRight = '6px';
        UI.dashboardDiv.appendChild(icon);
        UI.dashboardDiv.appendChild(document.createTextNode(String(UI.balance)));
    }
    static setCrossSize(v) {
        UI.crossSize = v;
        UI.crosshairDiv.style.width = `calc(var(--vvh) * ${UI.crossSize})`;
        UI.crosshairDiv.style.height = `calc(var(--vvh) * ${UI.crossSize})`;
    }
    static redrawButtons() {
        UI.runBtn.style.background = SceneManager.playerInstance?.isRunning ? 'blue' : 'grey';
        UI.fireBtn.style.background = SceneManager.playerInstance?.isFiring ? 'red' : 'grey';
        UI.crouchBtn.style.background = SceneManager.playerInstance?.isChrouching ? 'orange' : 'grey';
    }
    static setIsChrouching(v) {
        if (SceneManager.playerInstance.isChrouching != v) {
            SceneManager.playerInstance.isChrouching = v;
            UI.redrawButtons();
        }
    }
    static setIsRunning(v) {
        if (SceneManager.playerInstance.isRunning != v) {
            SceneManager.playerInstance.isRunning = v;
            UI.redrawButtons();
        }
    }
    static showNewLevelUpMenu(){
        UI.levelUpController.setMenu(fetchLevelUpMenuData(this.level))
        UI.menuOverlay.style.display = 'block'; 
    }
    static hideNewLevelUpMenu(){
        UI.menuOverlay.style.display = 'none'; 
    }

    static buildHUD() {
        SceneManager.UI = UI
        UI.root = UI.el('div', {
            position: 'fixed',
            width: 'var(--vvw)',
            height: 'var(--vvh)',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            inset: '0'
        });

        const iconMaker = (path, size = 80, style = {}) => {
            return UI.el('div', {
                width: size + "%",
                height: size + "%",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundImage: `url(${SceneManager.PUBLIC_URL + path})`,
                ...style
            })
        }

        // crosshair
        UI.crosshairDiv = UI.el('div', {
            position: 'absolute', top: '50%', left: '50%',
            width: `calc(var(--vvh) * ${UI.crossSize})`,
            height: `calc(var(--vvh) * ${UI.crossSize})`,
            transform: 'translate(-50%, -50%) translateZ(0px)',
            border: '2px solid black', borderRadius: '50%',
            pointerEvents: 'none', userSelect: 'none', zIndex: '10',
            transition: 'width 0.05s ease, height 0.05s ease'
        });
        UI.root.appendChild(UI.crosshairDiv);
        UI.damage = UI.el('div', {
            position: 'absolute',
            top: '-30px',
            left: '10px',
        }, { text: UI.damageText });
        UI.crosshairDiv.appendChild(UI.damage)

        // Run
        UI.runBtn = UI.el('button', {
            position: 'fixed',
            bottom: 'calc(var(--vvw) * 0.05)',
            right: 'calc(var(--vvw) * 0.13 + env(safe-area-inset-right))',
            width: 'calc(var(--vvh) * 0.12)',
            height: 'calc(var(--vvh) * 0.12)',
            padding: '0', fontSize: 'calc(var(--vvh) * 0.08)',
            borderRadius: '50%',
            background: SceneManager.playerInstance?.isRunning ? 'blue' : 'grey',
            color: '#fff', border: 'none',
            userSelect: 'none', touchAction: 'none', zIndex: '10',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: 'translateZ(0px)'
        }, {
            // text: '💨',
            onpointerdown: (e) => { UI.setIsRunning(true); UI.onRunClickedDown(e); },
            onpointerup: (e) => { UI.setIsRunning(false); UI.onRunClickedUp(e); },
        });
        UI.root.appendChild(UI.runBtn);
        UI.runBtn.appendChild(iconMaker("/textures/runButton.png", 70));

        // Fire
        UI.fireBtn = UI.el('button', {
            position: 'fixed',
            bottom: 'calc(var(--vvh) * 0.25)',
            right: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-right))',
            width: 'calc(var(--vvh) * 0.20)',
            height: 'calc(var(--vvh) * 0.20)',
            padding: '0',
            fontSize: 'calc(var(--vvh) * 0.08)',
            borderRadius: '50%',
            background: SceneManager.playerInstance?.isFiring ? 'red' : 'grey',
            color: '#fff', border: 'none',
            userSelect: 'none', touchAction: 'none', zIndex: '10',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: 'translateZ(0px)'
        }, {
            onpointerdown: (e) => {
                SceneManager.playerInstance.isFiring = true;
                UI.redrawButtons();
                if (UI.ammoPercent > 0) {
                    console.log(UI.ammoPercent)
                    UI.setCrossSize(0.03);
                    UI.onShootClickedDown(e);
                    SceneManager.playerInstance.fireTarget = 1;
                    SceneManager.playerInstance.muzzle?.play?.();
                }
            },
            onpointerup: () => {
                UI.setCrossSize(0.01);
                SceneManager.playerInstance.fireTarget = 0;
                SceneManager.playerInstance.isFiring = false;
                SceneManager.playerInstance?.muzzle?.stop?.(); UI.redrawButtons();
            }
        });
        UI.root.appendChild(UI.fireBtn);
        UI.fireBtn.appendChild(iconMaker("/textures/fireButton.png"));

        // Crouch
        UI.crouchBtn = UI.el('button', {
            position: 'fixed',
            bottom: 'calc(var(--vvh) * 0.39)',
            left: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-left))',
            width: 'calc(var(--vvh) * 0.12)',
            height: 'calc(var(--vvh) * 0.12)',
            padding: '0', fontSize: 'calc(var(--vvh) * 0.08)',
            borderRadius: '50%',
            background: SceneManager.playerInstance?.isChrouching ? 'orange' : 'grey',
            color: '#fff', border: 'none',
            userSelect: 'none', touchAction: 'none', zIndex: '10',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: 'translateZ(0px)'
        }, {
            onpointerdown: () => { UI.setIsChrouching(true); },
            onpointerup: () => { UI.setIsChrouching(false); }
        });
        UI.root.appendChild(UI.crouchBtn);
        UI.crouchBtn.appendChild(iconMaker('/textures/crouchButton.png', 60))

        // Reset
        UI.resetBtn = UI.el('button', {
            position: 'fixed',
            left: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left) * .1)`,
            top: `calc(var(--vvh) * 0.05 )`,
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
        }, { text: '⚙', onpointerup: () => window.location.reload() });
        UI.root.appendChild(UI.resetBtn);

        const coverMax = (input, max) => {
            return input
            // return  input.replace("var(--vvh)",`min(var(--vvh), ${max}px)`)
        }
        const healthBarMax = 400

        // HealthBar (left)
        UI.healthBarBtn = UI.el('button', {
            position: 'fixed',
            left: 'calc(var(--vvw) * 0.05 + var(--vvh) * 0.08 + 10px + env(safe-area-inset-left) * .1)',
            top: 'calc(var(--vvh) * 0.05 )',
            width: coverMax(`calc(var(--vvh) * 0.38)`, healthBarMax),
            height: coverMax(`calc(var(--vvh) * 0.08)`, healthBarMax),
            borderRadius: coverMax(`calc(var(--vvh) * 0.02 + 2px)`, healthBarMax),
            background: 'color-mix(in srgb, black 50%, transparent)',
            color: '#fff', border: 'none',
            userSelect: 'none', touchAction: 'none', padding: '2px',
            transform: 'translateZ(0px)'
        });
        const healthFill = UI.el('div', {
            background: 'limegreen', display: 'flex',
            width: `${SceneManager.healthPercent}%`,
            height: '100%',
            // borderRadius: 'calc(var(--vvh) * 0.02)', 
            borderRadius: coverMax(`calc(var(--vvh) * 0.02)`, healthBarMax),
            boxSizing: 'border-box',
            paddingLeft: SceneManager.healthPercent > 0 ? '7%' : ''
        });
        const healthText = UI.el('div', {
            position: 'absolute',
            fontFamily: 'monospace',
            // fontSize: 'calc(var(--vvh) * 0.05)', 
            fontSize: coverMax(`calc(var(--vvh) * 0.05)`, healthBarMax),
            paddingLeft: '7%',
            top: '50%', transform: 'translateY(-50%)'
        }, { text: '+' });
        UI.healthBarBtn.appendChild(healthFill);
        UI.healthBarBtn.appendChild(healthText);
        UI.root.appendChild(UI.healthBarBtn);

        // Next Level (right)
        const rightBar = UI.el('button', {
            position: 'fixed',
            right: 'calc(var(--vvw) * 0.05 + var(--vvh) * 0.08 + 10px + env(safe-area-inset-left) * .1)',
            top: 'calc(var(--vvh) * 0.05 )',
            width: 'calc(var(--vvh) * 0.38)',
            height: 'calc(var(--vvh) * 0.08)',
            borderRadius: 'calc(var(--vvh) * 0.02 + 2px)',
            background: 'color-mix(in srgb, black 50%, transparent)',
            color: '#fff', border: 'none',
            userSelect: 'none', touchAction: 'none', padding: '2px',
            transform: 'translateZ(0px)'
        });
        const rightFill = UI.el('div', {
            background: '#d07c0dff', display: 'flex',
            width: `${UI.nextLevelPercent}%`, height: '100%',
            borderRadius: 'calc(var(--vvh) * 0.02)', boxSizing: 'border-box',
            paddingLeft: UI.nextLevelPercent > 0 ? '7%' : ''
        });
        const rightText = UI.el('div', {
            position: 'absolute', fontFamily: 'monospace', fontWeight: 900,
            fontSize: 'calc(var(--vvh) * 0.03)', paddingLeft: '7%',
            top: '50%', transform: 'translateY(-50%)'
        }, { text: `LvL ${UI.level}` });
        rightBar.appendChild(rightFill);
        rightBar.appendChild(rightText);
        UI.root.appendChild(rightBar);

        // Ammo bar
        UI.ammoBarBtn = UI.el('button', {
            position: 'fixed',
            left: 'calc(var(--vvw) * 0.05 + var(--vvh) * 0.08 + 10px + env(safe-area-inset-left) * .1)',
            top: coverMax('calc(var(--vvh) * 0.135)', healthBarMax),
            width: coverMax('calc(var(--vvh) * 0.38)', healthBarMax),
            // width: 'calc(var(--vvh) * 0.38)',
            height: coverMax('calc(var(--vvh) * 0.03)', healthBarMax),
            borderRadius: coverMax('calc(var(--vvh) * 0.02 + 2px)', healthBarMax),
            background: 'color-mix(in srgb, black 50%, transparent)',
            color: '#fff', border: 'none',
            userSelect: 'none', touchAction: 'none', padding: '2px',
            transform: 'translateZ(0px)'
        });
        const ammoFill = UI.el('div', {
            background: 'royalblue', display: 'flex',
            width: UI.ammoPercent > 0 ? `${UI.ammoPercent}%` : '0px',
            height: '100%', borderRadius: coverMax('calc(var(--vvh) * 0.02)', healthBarMax), boxSizing: 'border-box'
        });
        UI.ammoBarBtn.appendChild(ammoFill);
        UI.root.appendChild(UI.ammoBarBtn);

        // Dashboard
        UI.dashboardDiv = UI.el('div', {
            position: 'fixed',
            top: 'calc(var(--vvh) * 0.05)',
            left: '50%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: 'translateX(-50%) translateZ(0px)',
            height: 'calc(var(--vvh) * 0.08)', fontSize: 'calc(var(--vvh) * 0.05)',
            borderRadius: 'calc(var(--vvh) * 0.02 + 2px)',
            background: 'color-mix(in srgb, black 10%, transparent)',
            color: 'limegreen', border: 'none', userSelect: 'none', touchAction: 'none',
            padding: '2px', fontFamily: 'Impact', gap: '5px',
            paddingLeft: '15px', paddingRight: '15px'
        });

        UI.setDashboardBalance();
        UI.root.appendChild(UI.dashboardDiv);

        const statParent = UI.el('div', {
            position: 'fixed',
            top: 'calc(var(--vvh) * 0.135 )',
            right: 'calc(var(--vvw) * 0.05 + var(--vvh) * 0.08 + 10px + env(safe-area-inset-right) * .1)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: 'calc(var(--vvh) * 0.05)', fontSize: 'calc(var(--vvh) * 0.03)',
            borderRadius: 'calc(var(--vvh) * 0.02 + 2px)',
            background: 'color-mix(in srgb, black 10%, transparent)',
            color: 'limegreen', border: 'none', userSelect: 'none', touchAction: 'none',
            padding: '2px', fontFamily: 'Impact', gap: '5px',
            paddingLeft: '15px', paddingRight: '15px'
        });

        UI.root.appendChild(statParent);
        UI.drawcalls = document.createTextNode(String(UI.balance))
        statParent.appendChild(UI.drawcalls)

        UI.menuOverlay = UI.el("lev", {
            position: "fixed",
            width: "100%",
            height: "100%",
            top: '0%',
            left: '0%',
            backgroundColor: "#2900b152",
            transform: `translateZ(0px)`,
            zIndex: 11,
            display: 'none'
        });
        
        UI.levelUpController = autoInitialize(UI.menuOverlay, UI.onLevelUpdateSelected)
        UI.root.appendChild(UI.menuOverlay);

        // Three mount
        const canvasMount = UI.el('div', { width: '100%', height: '100%' });
        UI.root.appendChild(canvasMount);

        return { canvasMount };
    }
}