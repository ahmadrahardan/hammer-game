"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── Palet Warna Brand ──────────────────────────────────────────────────────
// Primary  : #330059  (deep purple / brand)
// Secondary: #6600BB  (bright purple)
// Accent   : #FFD700  (gold)
// Surface  : rgba(51,0,89,0.xx)
// Text     : #fff & rgba(255,255,255,0.7)

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  isCircle: boolean;
}
interface FloatNum {
  x: number;
  y: number;
  vy: number;
  value: number;
  emoji: string;
  life: number;
}
interface CrackLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  branches: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}
interface BgParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  swayOffset: number;
  swaySpeed: number;
  swayAmount: number;
}

const MILESTONE_EMOJIS: Record<number, string> = {
  5: "🔥",
  10: "💥",
  20: "🤯",
  30: "👑",
  50: "🏆",
};

const HIT_EMOJIS = [
  "💥",
  "⚡",
  "🔥",
  "💫",
  "✨",
  "🌟",
  "💢",
  "👊",
  "🤯",
  "😵",
  "🎯",
  "💣",
  "🏏",
  "⭐",
];

const RANK_BADGES: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const CONFETTI_COLORS = [
  "#330059",
  "#FFD700",
  "#00E5FF",
  "#6600BB",
  "#9933FF",
  "#FFD700",
  "#F97316",
  "#FFFFFF",
  "#CC99FF",
  "#84CC16",
];

function getOrCreateUUID() {
  let uuid = localStorage.getItem("player_uuid");

  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem("player_uuid", uuid);
  }

  return uuid;
}

function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    hardwareConcurrency?: number;
    deviceMemory?: number;
  };
  return (nav.hardwareConcurrency ?? 4) <= 2 || (nav.deviceMemory ?? 4) <= 2;
}

function getMilestoneEmoji(n: number): string | null {
  return MILESTONE_EMOJIS[n] ?? null;
}

function getBgGradient(count: number): string {
  if (count >= 200) return "linear-gradient(160deg,#0a0015 0%,#1a0035 100%)";
  if (count >= 100) return "linear-gradient(160deg,#1a0035 0%,#280050 100%)";
  if (count >= 50) return "linear-gradient(160deg,#280050 0%,#330059 100%)";
  if (count >= 20) return "linear-gradient(160deg,#330059 0%,#4a0080 100%)";
  if (count >= 10) return "linear-gradient(160deg,#4a0080 0%,#5500a0 100%)";
  if (count >= 5) return "linear-gradient(160deg,#5500a0 0%,#6600BB 100%)";
  return "linear-gradient(160deg,#330059 0%,#6600BB 100%)";
}

function getBaseLogo(count: number): string {
  if (count >= 1000) return "/logo-4.png";
  if (count >= 500) return "/logo-3.png";
  if (count >= 100) return "/logo-2.png";
  if (count >= 10) return "/logo-1.png";
  return "/logo.png";
}

function getCounterColor(count: number): string {
  if (count >= 50) return "linear-gradient(135deg,#FFD700,#FF9900)";
  if (count >= 30) return "linear-gradient(135deg,#CC99FF,#6600BB)";
  if (count >= 20) return "linear-gradient(135deg,#9933FF,#6600BB)";
  if (count >= 10) return "linear-gradient(135deg,#6600BB,#330059)";
  if (count >= 5) return "linear-gradient(135deg,#4a0080,#6600BB)";
  return "linear-gradient(135deg,#330059,#6600BB)";
}

// ── Konstanta performa ─────────────────────────────────────────────────────
const MAX_CONFETTI = 40;
const MAX_CRACKS = 8;
const MAX_FLOAT_NUMS = 4;
const BG_PARTICLES = 28;
const HIT_THROTTLE = 80;

const GLOBAL_STYLES = `
    * { user-select: none !important; -webkit-user-select: none !important; }
  #hammer-cursor.hide-hammer { opacity: 0 !important; visibility: hidden !important; }
  #hammer-cursor { will-change: transform; transform: translate3d(0,0,0); }
  #fx-canvas     { pointer-events: none; }
  .logo-inner    { will-change: transform; transform: translate3d(0,0,0); }

  :root { --blur-intensity: 10px; --shadow-opacity: 0.3; }
  .low-end { --blur-intensity: 0px; --shadow-opacity: 0.1; }
  .low-end .logo-glow, .low-end .logo-glow-rage { display: none !important; }
  /* Low-end: matikan BG canvas sepenuhnya */
  .low-end #bg-canvas { display: none !important; }

  @keyframes popIn {
    0%   { opacity:0; transform:scale(0.3) translate3d(0,0,0); }
    55%  { opacity:1; transform:scale(1.12) translate3d(0,0,0); }
    75%  { transform:scale(0.94) translate3d(0,0,0); }
    90%  { transform:scale(1.04) translate3d(0,0,0); }
    100% { opacity:1; transform:scale(1) translate3d(0,0,0); }
  }

  @keyframes leaderboardScroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  .marquee-wrapper {
    width: 100%;
    overflow: hidden;
    display: flex;
    justify-content: center;
  }

  .marquee-track {
    display: flex;
    gap: 20px;
    white-space: nowrap;
  }

  .player-btn {
    flex-shrink: 0;
  }

  .leaderboard-track {
    display: flex;
    gap: 40px;
    animation: leaderboardScroll 25s linear infinite;
    white-space: nowrap;
  }

  .leaderboard-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 14px;
    color: #FFD700;
  }
    
  @keyframes floatLogo {
    0%,100% { transform:translateY(0px) translate3d(0,0,0); }
    50%     { transform:translateY(-10px) translate3d(0,0,0); }
  }
  @keyframes floatLogoFast {
    0%,100% { transform:translateY(0px) rotate(-1deg) translate3d(0,0,0); }
    25%     { transform:translateY(-14px) rotate(2deg) translate3d(0,0,0); }
    75%     { transform:translateY(-6px) rotate(-2deg) translate3d(0,0,0); }
  }
  @keyframes glowPulse {
    0%,100% { opacity:0.45; transform:scale(1) translate3d(0,0,0); }
    50%     { opacity:0.7; transform:scale(1.08) translate3d(0,0,0); }
  }
  @keyframes glowRage {
    0%,100% { opacity:0.8; transform:scale(1) translate3d(0,0,0); filter:hue-rotate(0deg); }
    50%     { opacity:1; transform:scale(1.15) translate3d(0,0,0); filter:hue-rotate(30deg); }
  }
  @keyframes squish {
    0%   { transform:scale(1,1) translateY(0px) translate3d(0,0,0); }
    15%  { transform:scale(1.45,0.55) translateY(12px) translate3d(0,0,0); }
    35%  { transform:scale(0.85,1.2) translateY(-6px) translate3d(0,0,0); }
    55%  { transform:scale(1.15,0.88) translateY(4px) translate3d(0,0,0); }
    75%  { transform:scale(0.96,1.06) translateY(-2px) translate3d(0,0,0); }
    100% { transform:scale(1,1) translateY(0px) translate3d(0,0,0); }
  }
  @keyframes squishRage {
    0%   { transform:scale(1,1) rotate(0deg) translate3d(0,0,0); }
    10%  { transform:scale(1.6,0.45) rotate(-5deg) translate3d(0,0,0); }
    30%  { transform:scale(0.75,1.35) rotate(4deg) translate3d(0,0,0); }
    50%  { transform:scale(1.25,0.8) rotate(-3deg) translate3d(0,0,0); }
    70%  { transform:scale(0.92,1.12) rotate(2deg) translate3d(0,0,0); }
    100% { transform:scale(1,1) rotate(0deg) translate3d(0,0,0); }
  }
  @keyframes hammerIdle {
    0%,100% { transform:rotate(0deg) translate3d(0,0,0); }
    50%     { transform:rotate(-4deg) translate3d(0,0,0); }
  }
  @keyframes hammerSwing {
    0%   { transform:rotate(0deg) translate3d(0,0,0); }
    20%  { transform:rotate(-40deg) translate3d(0,0,0); }
    55%  { transform:rotate(30deg) translate3d(0,0,0); }
    72%  { transform:rotate(10deg) translate3d(0,0,0); }
    86%  { transform:rotate(22deg) translate3d(0,0,0); }
    100% { transform:rotate(0deg) translate3d(0,0,0); }
  }
  @keyframes hammerSwingRage {
    0%   { transform:rotate(0deg) scale(1.2) translate3d(0,0,0); }
    15%  { transform:rotate(-55deg) scale(1.3) translate3d(0,0,0); }
    45%  { transform:rotate(45deg) scale(1.2) translate3d(0,0,0); }
    65%  { transform:rotate(5deg) scale(1.15) translate3d(0,0,0); }
    100% { transform:rotate(0deg) scale(1.2) translate3d(0,0,0); }
  }
  @keyframes soundBounce {
    0%,100% { transform:scale(1) translate3d(0,0,0); }
    50%     { transform:scale(1.08) translate3d(0,0,0); }
  }

  @keyframes counterPop {
    0%   { transform:scale(1) rotate(-3deg) translate3d(0,0,0); }
    30%  { transform:scale(1.55) rotate(4deg) translate3d(0,0,0); }
    55%  { transform:scale(0.9) rotate(-2deg) translate3d(0,0,0); }
    75%  { transform:scale(1.18) rotate(1deg) translate3d(0,0,0); }
    100% { transform:scale(1) rotate(0deg) translate3d(0,0,0); }
  }
  @keyframes counterFadeOut {
    0%   { opacity:1; transform:scale(1) translateY(0) translate3d(0,0,0); }
    100% { opacity:0; transform:scale(0.6) translateY(16px) translate3d(0,0,0); }
  }
  @keyframes milestoneFlash {
    0%,100% { transform:scale(1) rotate(0deg) translate3d(0,0,0); opacity:1; }
    25%     { transform:scale(1.6) rotate(-8deg) translate3d(0,0,0); opacity:1; }
    50%     { transform:scale(1.3) rotate(6deg) translate3d(0,0,0); opacity:1; }
    75%     { transform:scale(1.5) rotate(-4deg) translate3d(0,0,0); opacity:1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes shake {
    0%,100% { transform:translateX(0) translateY(0) translate3d(0,0,0); }
    10%     { transform:translateX(-8px) translateY(-4px) rotate(-1deg) translate3d(0,0,0); }
    20%     { transform:translateX(8px) translateY(4px) rotate(1deg) translate3d(0,0,0); }
    30%     { transform:translateX(-6px) translateY(3px) rotate(-0.5deg) translate3d(0,0,0); }
    40%     { transform:translateX(6px) translateY(-3px) rotate(0.5deg) translate3d(0,0,0); }
    50%     { transform:translateX(-4px) translateY(2px) translate3d(0,0,0); }
    60%     { transform:translateX(4px) translateY(-2px) translate3d(0,0,0); }
    70%     { transform:translateX(-2px) translateY(1px) translate3d(0,0,0); }
    80%     { transform:translateX(2px) translateY(-1px) translate3d(0,0,0); }
  }
  @keyframes screenShakeAnim {
    0%,100% { transform:translate3d(0,0,0) rotate(0deg); }
    10%     { transform:translate3d(-10px,-6px,0) rotate(-0.5deg); }
    20%     { transform:translate3d(10px,6px,0) rotate(0.5deg); }
    30%     { transform:translate3d(-8px,4px,0) rotate(-0.3deg); }
    40%     { transform:translate3d(8px,-4px,0) rotate(0.3deg); }
    50%     { transform:translate3d(-5px,3px,0); }
    60%     { transform:translate3d(5px,-3px,0); }
    70%     { transform:translate3d(-3px,2px,0); }
    80%     { transform:translate3d(3px,-2px,0); }
    90%     { transform:translate3d(-1px,1px,0); }
  }
  #root-wrapper.screen-shake { animation:screenShakeAnim 0.4s ease; }
  @keyframes rainbowBg {
    0%   { filter:hue-rotate(0deg) saturate(2) brightness(1.1); }
    100% { filter:hue-rotate(360deg) saturate(2) brightness(1.1); }
  }
  @keyframes rageGlow {
    0%,100% { box-shadow:0 0 30px rgba(255,50,50,0.7), 0 0 60px rgba(255,150,0,0.4); }
    50%     { box-shadow:0 0 60px rgba(255,0,0,1), 0 0 100px rgba(255,100,0,0.7); }
  }
  @keyframes comboAnim {
    0%   { transform:scale(0.5) translateY(10px) rotate(-10deg); opacity:0; }
    50%  { transform:scale(1.4) translateY(-8px) rotate(5deg); opacity:1; }
    100% { transform:scale(1) translateY(0) rotate(0deg); opacity:1; }
  }

  @keyframes rainbow-hit {
    0% { color: #ff0000; filter: drop-shadow(0 0 5px #ff0000); }
    20% { color: #ff8000; filter: drop-shadow(0 0 5px #ff8000); }
    40% { color: #ffff00; filter: drop-shadow(0 0 5px #ffff00); }
    60% { color: #00ff00; filter: drop-shadow(0 0 5px #00ff00); }
    80% { color: #0000ff; filter: drop-shadow(0 0 5px #0000ff); }
    100% { color: #ff0000; filter: drop-shadow(0 0 5px #ff0000); }
  }
  @keyframes extremeShake {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-2px, 2px) rotate(-2deg); }
    50% { transform: translate(2px, -2px) rotate(2deg); }
    75% { transform: translate(-2px, -2px) rotate(-1deg); }
  }

  @keyframes ragePulseScale {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  @keyframes rageBgShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .logo-pop { animation:popIn 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
  @keyframes logoFadeIn {
    0%   { opacity:0; transform:scale(1.08); }
    100% { opacity:1; transform:scale(1); }
  }
  @keyframes logoFadeOut {
    0%   { opacity:1; transform:scale(1); }
    100% { opacity:0; transform:scale(0.92); }
  }
  .logo-fade-in  { animation:logoFadeIn  0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .logo-fade-out { animation:logoFadeOut 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .logo-float       { animation:floatLogo 3.5s ease-in-out infinite; }
  .logo-float-fast  { animation:floatLogoFast 0.8s ease-in-out infinite; }
  .logo-glow        { animation:glowPulse 3.5s ease-in-out infinite; }
  .logo-glow-rage   { animation:glowRage 0.5s ease-in-out infinite; }
  .logo-squish      { animation:squish 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
  .logo-squish-rage { animation:squishRage 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
  .hammer-idle      { animation:hammerIdle 2s ease-in-out infinite; }
  .hammer-swing     { animation:hammerSwing 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
  .hammer-swing-rage { animation:hammerSwingRage 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
  .sound-btn-active { animation:soundBounce 1.8s ease-in-out infinite; }
  .combo-badge      { animation: comboAnim 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
  .global-counter   { animation: globalCountAnim 2s ease-in-out infinite; }

  .prov-name {
    max-width:120px;
    overflow:hidden;
    text-overflow:ellipsis;
  }

  .sound-btn {
    position: fixed; bottom: 100px; right: 20px; z-index: 9998;
    width: 48px; height: 48px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.45);
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    backdrop-filter: blur(var(--blur-intensity));
    transition: background 0.2s, border-color 0.2s, transform 0.1s;
    box-shadow: 0 4px 20px rgba(0,0,0,var(--shadow-opacity));
  }
  .sound-btn:hover { transform: scale(1.1) translate3d(0,0,0) !important; }
  .sound-btn.on  { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.6); }
  .sound-btn.off { background: rgba(0,0,0,0.35); border-color: rgba(255,255,255,0.2); }

  .sensor-btn {
    position: fixed; bottom: 160px; right: 20px; z-index: 9998;
    width: 48px; height: 48px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.45);
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    backdrop-filter: blur(var(--blur-intensity));
    transition: background 0.2s, border-color 0.2s, transform 0.1s;
    box-shadow: 0 4px 20px rgba(0,0,0,var(--shadow-opacity));
  }
  .sensor-btn:hover { transform: scale(1.1) translate3d(0,0,0) !important; }
  .sensor-btn.on  { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.6); animation:soundBounce 1.8s ease-in-out infinite; }
  .sensor-btn.off { background: rgba(0,0,0,0.35); border-color: rgba(255,255,255,0.2); }

  .cert-btn {
    position: fixed; bottom: 220px; right: 20px; z-index: 9998;
    width: 48px; height: 48px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.45);
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    backdrop-filter: blur(var(--blur-intensity));
    transition: background 0.2s, border-color 0.2s, transform 0.1s;
    box-shadow: 0 4px 20px rgba(0,0,0,var(--shadow-opacity));
    background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.6);
    animation: soundBounce 1.8s ease-in-out infinite;
  }
  .cert-btn:hover { transform: scale(1.1) translate3d(0,0,0) !important; }
  .cert-btn:disabled { animation: none; opacity: 0.5; filter: grayscale(1); }

  html, body { touch-action: none; overscroll-behavior: none; }
  #root-wrapper { touch-action: manipulation; }

  .modal-overlay {
    position: fixed; inset: 0; z-index: 999999; background: rgba(0,0,0,0.85);
    backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.4s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-content {
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
    border: 1px solid rgba(255,255,255,0.2); border-radius: 24px; padding: 32px;
    width: 100%; max-width: 400px; text-align: center;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    animation: modalPop 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes modalPop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .name-input {
    width: 100%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2);
    border-radius: 12px; padding: 14px; color: #fff; font-size: 18px; text-align: center;
    margin-bottom: 20px; transition: border-color 0.3s; outline: none;
  }
  .name-input:focus { border-color: #FF3E9B; box-shadow: 0 0 15px rgba(255,62,155,0.3); }
  .name-submit-btn {
    width: 100%; background: linear-gradient(135deg, #FF3E9B, #7C3AED); color: #fff;
    border: none; border-radius: 12px; padding: 14px; font-size: 16px; font-weight: 800;
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
  }
  .name-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255,62,155,0.4); }
  .name-submit-btn:active { transform: translateY(0); }
  /* Custom scrollbar matched with HomeOnline */
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:rgba(0,0,0,0.1); }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:3px; }
`;

export default function Home() {
  const isLowEndRef = useRef(false);

  // ── React state ──────────────────────────────────────────────────────────
  const [logoVisible, setLogoVisible] = useState(false);
  const playerIdRef = useRef<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [topPlayers, setTopPlayers] = useState<
    { name: string; total_hits: number }[]
  >([]);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isCertFlow, setIsCertFlow] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const playerNameRef = useRef<string | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const totalHitsRef = useRef(0);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameChecking, setNameChecking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentLogoSrc, setCurrentLogoSrc] = useState("/logo.png");
  const [prevLogoSrc, setPrevLogoSrc] = useState<string | null>(null);
  const [logoTransitioning, setLogoTransitioning] = useState(false);

  const fetchPlayerFromSupabase = useCallback(async (uuid: string) => {
    const resetPlayerState = () => {
      playerIdRef.current = null;
      playerNameRef.current = null;
      setPlayerName(null);
      setTotalHits(0);
      totalHitsRef.current = 0;
    };

    try {
      const { data, error } = await supabase
        .from("simple_players")
        .select("id, name, total_hits")
        .eq("player_uuid", uuid)
        .maybeSingle();

      if (error) {
        console.error("Fetch player error:", error);
        localStorage.removeItem("playerName_v2");
        resetPlayerState();
        setShowNameModal(true);
        return;
      }

      if (data) {
        playerIdRef.current = data.id;
        setPlayerName(data.name);
        playerNameRef.current = data.name;
        setTotalHits(data.total_hits || 0);
        totalHitsRef.current = data.total_hits || 0;
      } else {
        localStorage.removeItem("playerName_v2");
        resetPlayerState();
        setShowNameModal(true);
      }
    } catch (err) {
      console.error("Fetch player exception:", err);
      localStorage.removeItem("playerName_v2");
      resetPlayerState();
      setShowNameModal(true);
    }
  }, []);

  useEffect(() => {
    isLowEndRef.current = isLowEndDevice();

    const initPlayer = async () => {
      const uuid = getOrCreateUUID();

      await fetchPlayerFromSupabase(uuid);
    };

    initPlayer();
  }, [fetchPlayerFromSupabase]);

  const fetchTopPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("simple_players")
      .select("name,total_hits")
      .order("total_hits", { ascending: false })
      .limit(10);

    if (!error && data) {
      setTopPlayers(data);
    }
  }, []);

  useEffect(() => {
    fetchTopPlayers();
    const interval = setInterval(fetchTopPlayers, 15000);
    return () => clearInterval(interval);
  }, [fetchTopPlayers]);

  // ── Canvas & image refs ──────────────────────────────────────────────────
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const crackCanvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const hammerRef = useRef<HTMLDivElement>(null);

  const bgParticlesRef = useRef<BgParticle[]>([]);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const floatNumsRef = useRef<FloatNum[]>([]);
  const cracksRef = useRef<CrackLine[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const hitMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitMaskDataRef = useRef<Uint8ClampedArray | null>(null);

  // ── Audio refs ───────────────────────────────────────────────────────────
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const bgPlayingRef = useRef(false);
  const soundEnabledRef = useRef(true);

  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.15; // Lowered bg music volume
    bgAudioRef.current = audio;
  }, []);

  // ── State refs ───────────────────────────────────────────────────────────
  const rageModeRef = useRef(false);
  const comboCountRef = useRef(0);
  const sessionCountRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const lastHitProcessedRef = useRef(0);
  const lastSwingKeyRef = useRef(0);
  const hammerSizeRef = useRef(150);
  const sensorEnabledRef = useRef(false);
  const hammerPosRef = useRef({ x: -400, y: -400 });
  const lastBaseLogoRef = useRef("/logo.png");
  const [logoHits, setLogoHits] = useState(0);
  const shakeCounterRef = useRef(0);

  // ── Animation refs ───────────────────────────────────────────────────────
  const bgAnimRef = useRef<number>(0);
  const fxAnimRef = useRef<number>(0);
  const fxRunningRef = useRef(false);
  const crackRedrawRafRef = useRef<number>(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [hitContext, setHitContext] = useState({
    swingKey: 0,
    squishKey: 0,
    sessionCount: 0,
    counterBump: 0,
    comboCount: 0,
    showCounter: false,
    rageMode: false,
    randomColor: "#FFD700",
    randomJitter: { x: 0, y: 0, rot: 0 },
  });
  const {
    swingKey,
    squishKey,
    sessionCount,
    counterBump,
    comboCount,
    showCounter,
    rageMode,
    randomColor,
    randomJitter,
  } = hitContext;

  const getRandomColor = useCallback(() => {
    const colors = [
      "#FF3E9B",
      "#7C3AED",
      "#FFD700",
      "#00E5FF",
      "#FF8000",
      "#00FF00",
      "#FF0000",
      "#FF00FF",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // ── Logo transition ──────────────────────────────────────────────────────
  const switchLogo = useCallback((newPath: string) => {
    setCurrentLogoSrc((prev) => {
      if (prev === newPath) return prev;
      setPrevLogoSrc(prev);
      setLogoTransitioning(true);
      if (logoTransitionTimerRef.current)
        clearTimeout(logoTransitionTimerRef.current);
      logoTransitionTimerRef.current = setTimeout(() => {
        setPrevLogoSrc(null);
        setLogoTransitioning(false);
      }, 600);
      return newPath;
    });
  }, []);

  const reloadHitMask = useCallback((logoPath: string) => {
    const img = new Image();
    img.src = logoPath;
    img.onload = () => {
      const scale = 0.2;
      const c = document.createElement("canvas");
      c.width = Math.floor(img.naturalWidth * scale);
      c.height = Math.floor(img.naturalHeight * scale);
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        hitMaskCanvasRef.current = c;
        hitMaskDataRef.current = ctx.getImageData(0, 0, c.width, c.height).data;
      }
    };
  }, []);

  // ── Sensor toggle ────────────────────────────────────────────────────────
  const toggleSensor = useCallback(() => {
    const next = !sensorEnabledRef.current;
    sensorEnabledRef.current = next;
    setSensorEnabled(next);
    const newPath = next ? "/logo-sensor.png" : lastBaseLogoRef.current;
    switchLogo(newPath);
    const img = new Image();
    img.src = newPath;
    img.onload = () => {
      imageRef.current = img;
    };
    reloadHitMask(newPath);
  }, [switchLogo, reloadHitMask]);

  // Auto switch base logo based on hits
  useEffect(() => {
    if (sensorEnabledRef.current) return;
    const count = logoHits;
    const newPath = getBaseLogo(count);
    if (newPath === lastBaseLogoRef.current) return;
    lastBaseLogoRef.current = newPath;
    switchLogo(newPath);
    const img = new Image();
    img.src = newPath;
    img.onload = () => {
      imageRef.current = img;
    };
    reloadHitMask(newPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoHits]);

  // ── Init logo ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setLogoVisible(true);
      setCurrentLogoSrc(getBaseLogo(0));
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // ── Hit mask init ────────────────────────────────────────────────────────
  useEffect(() => {
    reloadHitMask("/logo.png");
  }, [reloadHitMask]);

  useEffect(() => {
    return () => {
      if (logoTransitionTimerRef.current) {
        clearTimeout(logoTransitionTimerRef.current);
      }
    };
  }, []);

  // ── Favicon ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const favicon = document.querySelector(
      "link[rel*='icon']",
    ) as HTMLLinkElement;
    const href = sensorEnabled ? "/favicon-sensor.ico" : "/favicon.ico";
    if (favicon) favicon.href = href;
    else {
      const l = document.createElement("link");
      l.rel = "icon";
      l.href = href;
      document.head.appendChild(l);
    }
  }, [sensorEnabled]);

  // ── Audio ────────────────────────────────────────────────────────────────
  const getAC = () => {
    if (!audioCtxRef.current) {
      const AC =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext: typeof window.AudioContext;
          }
        ).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playPopSound = () => {
    if (!soundEnabledRef.current) return;
    try {
      const ac = getAC();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g);
      g.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);
      g.gain.setValueAtTime(1.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {
      console.warn(e);
    }
  };

  const playHammerSound = useCallback((combo = 1) => {
    if (!soundEnabledRef.current) return;
    try {
      const ac = getAC();
      const t = ac.currentTime;
      const gain = Math.min(2.5 + (combo - 1) * 0.2, 5.0); // Increased hammer sound volume base and scale
      if (
        !noiseBufferRef.current ||
        noiseBufferRef.current.sampleRate !== ac.sampleRate
      ) {
        const sz = Math.floor(ac.sampleRate * 0.15);
        const buf = ac.createBuffer(1, sz, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < sz; i++)
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sz, 4);
        noiseBufferRef.current = buf;
      }
      const noise = ac.createBufferSource();
      noise.buffer = noiseBufferRef.current;
      const nf = ac.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.value = 200;
      const ng = ac.createGain();
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(ac.destination);
      ng.gain.setValueAtTime(0.9 * gain, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.start(t);
      const sub = ac.createOscillator();
      const sg = ac.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(110 + combo * 8, t);
      sub.frequency.exponentialRampToValueAtTime(35, t + 0.18);
      sg.gain.setValueAtTime(0.7 * gain, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      sub.connect(sg);
      sg.connect(ac.destination);
      sub.start(t);
      sub.stop(t + 0.22);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const playCrowdCheer = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ac = getAC();
      const t = ac.currentTime;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t + i * 0.06);
        g.gain.linearRampToValueAtTime(0.5, t + i * 0.06 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.35);
        osc.connect(g);
        g.connect(ac.destination);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.4);
      });
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const startBgMusic = useCallback(() => {
    if (bgPlayingRef.current) return;
    bgPlayingRef.current = true;
    if (bgAudioRef.current) {
      bgAudioRef.current
        .play()
        .catch((e) => console.warn("Failed to play bg audio:", e));
    }
  }, []);

  const stopBgMusic = () => {
    bgPlayingRef.current = false;
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
    }
  };
  const toggleSound = () => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (!next) stopBgMusic();
    else startBgMusic();
  };

  // ── FX canvas ────────────────────────────────────────────────────────────
  const startFxLoop = useCallback(() => {
    if (fxRunningRef.current) return;
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    fxRunningRef.current = true;
    const loop = () => {
      const conf = confettiRef.current;
      const floats = floatNumsRef.current;
      if (conf.length === 0 && floats.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        fxRunningRef.current = false;
        return;
      }
      fxAnimRef.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = conf.length - 1; i >= 0; i--) {
        const c = conf[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.35;
        c.vx *= 0.97;
        c.rotation += c.rotSpeed;
        c.life -= 0.022;
        if (c.life <= 0) {
          conf.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, c.life);
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        if (c.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();
      }
      ctx.textAlign = "center";
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.y += f.vy;
        f.vy *= 0.95;
        f.life -= 0.028;
        if (f.life <= 0) {
          floats.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(f.emoji, f.x, f.y);
        ctx.font = `bold ${f.value >= 10 ? 18 : 15}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(255,200,0,0.8)";
        ctx.shadowBlur = 10;
        ctx.fillText(`+${f.value}`, f.x, f.y + 24);
        ctx.restore();
      }
    };
    fxAnimRef.current = requestAnimationFrame(loop);
  }, []);

  const spawnConfetti = useCallback(
    (x: number, y: number, count = 20) => {
      const arr = confettiRef.current;
      if (arr.length + count > MAX_CONFETTI)
        arr.splice(0, arr.length + count - MAX_CONFETTI);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 4 + Math.random() * 8;
        arr.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          color:
            CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 6 + Math.random() * 8,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 15,
          life: 1,
          isCircle: Math.random() > 0.5,
        });
      }
      startFxLoop();
    },
    [startFxLoop],
  );

  const spawnFloat = useCallback(
    (count: number, x: number, y: number) => {
      const arr = floatNumsRef.current;
      if (arr.length >= MAX_FLOAT_NUMS) arr.splice(0, 1);
      arr.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 30,
        vy: -2.5,
        value: count,
        emoji: HIT_EMOJIS[Math.floor(Math.random() * HIT_EMOJIS.length)],
        life: 1,
      });
      startFxLoop();
    },
    [startFxLoop],
  );

  const addCrack = useCallback(
    (relX: number, relY: number, lW: number, lH: number) => {
      const arr = cracksRef.current;
      if (arr.length >= MAX_CRACKS) arr.splice(0, 1);
      const angle = Math.random() * Math.PI * 2;
      const len = 20 + Math.random() * 40;
      const cx = relX * lW;
      const cy = relY * lH;
      const branches = Array.from(
        { length: 2 + Math.floor(Math.random() * 3) },
        () => {
          const ba = angle + (Math.random() - 0.5) * Math.PI;
          const bl = 8 + Math.random() * 18;
          const mx = cx + Math.cos(angle) * len * 0.5;
          const my = cy + Math.sin(angle) * len * 0.5;
          return {
            x1: mx,
            y1: my,
            x2: mx + Math.cos(ba) * bl,
            y2: my + Math.sin(ba) * bl,
          };
        },
      );
      arr.push({
        x1: cx,
        y1: cy,
        x2: cx + Math.cos(angle) * len,
        y2: cy + Math.sin(angle) * len,
        opacity: 0.8,
        branches,
      });
    },
    [],
  );

  const redrawCracks = useCallback(() => {
    if (crackRedrawRafRef.current) return;
    crackRedrawRafRef.current = requestAnimationFrame(() => {
      crackRedrawRafRef.current = 0;
      const canvas = crackCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const c of cracksRef.current) {
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.strokeStyle = `rgba(0,0,0,${c.opacity * 0.7})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.strokeStyle = `rgba(255,255,255,${c.opacity * 0.3})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
        for (const b of c.branches) {
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(b.x2, b.y2);
          ctx.strokeStyle = `rgba(0,0,0,${c.opacity * 0.5})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    });
  }, []);

  const triggerShake = useCallback(() => {
    if (isLowEndRef.current) return;
    shakeCounterRef.current++;
    if (shakeCounterRef.current % 2 !== 0) return;
    const el = document.getElementById("root-wrapper");
    if (!el) return;
    el.classList.remove("screen-shake");
    void (el as HTMLElement & { _r?: number })._r;
    el.classList.add("screen-shake");
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(
      () => el.classList.remove("screen-shake"),
      400,
    );
  }, []);

  // ── Crack canvas size ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = crackCanvasRef.current;
    const logo = logoRef.current;
    if (!canvas || !logo) return;
    const upd = () => {
      const r = logo.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
      redrawCracks();
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(logo);
    return () => ro.disconnect();
  }, [logoVisible, redrawCracks]);

  // ── FX canvas resize ─────────────────────────────────────────────────────
  useEffect(() => {
    const c = fxCanvasRef.current;
    if (!c) return;
    const r = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  // ── BG particle canvas ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (isLowEndRef.current) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const createP = (fromTop = false): BgParticle => ({
      x: Math.random() * window.innerWidth,
      y: fromTop ? -Math.random() * 300 : Math.random() * window.innerHeight,
      speed: 1.0 + Math.random() * 2.0,
      size: 24 + Math.random() * 40,
      opacity: 0.04 + Math.random() * 0.12,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.008 + Math.random() * 0.015,
      swayAmount: 15 + Math.random() * 35,
    });
    bgParticlesRef.current = Array.from({ length: BG_PARTICLES }, () =>
      createP(false),
    );
    const img = new Image();
    img.src = "/logo.png";
    img.onload = () => {
      imageRef.current = img;
    };
    let tick = 0;
    let lastTime = 0;
    const animate = (now: number) => {
      bgAnimRef.current = requestAnimationFrame(animate);
      if (now - lastTime < 1000 / 60) return;
      lastTime = now;
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sm = rageModeRef.current ? 2.5 : 1;
      bgParticlesRef.current.forEach((p) => {
        p.y += p.speed * sm;
        p.rotation += p.rotationSpeed * sm;
        const sx =
          p.x + Math.sin(tick * p.swaySpeed + p.swayOffset) * p.swayAmount;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(sx, p.y);
        ctx.rotate(p.rotation);
        const im = imageRef.current;
        if (im) ctx.drawImage(im, -p.size / 2, -p.size / 2, p.size, p.size);
        else {
          ctx.fillStyle = "#A78BFA";
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        if (p.y > canvas.height + 80) Object.assign(p, createP(true));
      });
    };
    bgAnimRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(bgAnimRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hammer mouse tracker ─────────────────────────────────────────────────
  useEffect(() => {
    let rid = 0;
    let px = -400;
    let py = -400;
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof TouchEvent) {
        px = e.touches[0]?.clientX ?? px;
        py = e.touches[0]?.clientY ?? py;
      } else {
        px = e.clientX;
        py = e.clientY;
      }
      if (rid) return;
      rid = requestAnimationFrame(() => {
        hammerPosRef.current = { x: px, y: py };
        if (hammerRef.current) {
          const s = hammerSizeRef.current;
          hammerRef.current.style.transform = `translate3d(${px - s * 0.45}px,${py - s * 0.12}px,0)`;
        }
        rid = 0;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      cancelAnimationFrame(rid);
    };
  }, []);

  const saveHitsToSupabase = useCallback(async (playerId: string) => {
    try {
      const { error } = await supabase.rpc("increment_hits", {
        player_id: playerId,
      });

      if (error) {
        console.error("Update hits error:", error);
      }
    } catch (err) {
      console.error("Update hits exception:", err);
    }
  }, []);

  // ── Hit handler ──────────────────────────────────────────────────────────
  const handleHitRef = useRef<((x: number, y: number) => void) | null>(null);
  handleHitRef.current = (clientX: number, clientY: number) => {
    const now = Date.now();
    if (now - lastHitProcessedRef.current < HIT_THROTTLE) return;
    lastHitProcessedRef.current = now;
    if (soundEnabledRef.current && !bgPlayingRef.current) startBgMusic();
    const newSwing = lastSwingKeyRef.current + 1;
    lastSwingKeyRef.current = newSwing;
    if (!logoRef.current || !hitMaskCanvasRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    )
      return;
    const mc = hitMaskCanvasRef.current;
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    const px = Math.floor(relX * mc.width);
    const py = Math.floor(relY * mc.height);
    const md = hitMaskDataRef.current;
    if (!md) return;
    if ((md[(py * mc.width + px) * 4 + 3] ?? 0) <= 5) return;
    triggerShake();
    const ts = now - lastHitTimeRef.current;
    lastHitTimeRef.current = now;
    const newCombo = ts < 800 ? comboCountRef.current + 1 : 1;
    comboCountRef.current = newCombo;
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      comboCountRef.current = 0;
      setHitContext((p) => ({ ...p, comboCount: 0 }));
    }, 1200);
    playHammerSound(newCombo);
    addCrack(relX, relY, rect.width, rect.height);
    redrawCracks();

    setLogoHits((p) => p + 1); // Increment logo hits state (persistent per page load)
    const newCount = sessionCountRef.current + 1;
    sessionCountRef.current = newCount;

    const newTotal = totalHitsRef.current + 1;
    totalHitsRef.current = newTotal;
    setTotalHits(newTotal);

    if (playerIdRef.current) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        saveHitsToSupabase(playerIdRef.current!);
      }, 800);
    }

    const isMilestone = getMilestoneEmoji(newCount) !== null;
    if (isMilestone) {
      playCrowdCheer();
      spawnConfetti(clientX, clientY, 36);
    } else if (newCombo >= 5) spawnConfetti(clientX, clientY, 10);
    spawnFloat(newCount, clientX, clientY);
    if (newCount >= 20 && !rageModeRef.current) {
      rageModeRef.current = true;
      hammerSizeRef.current = 250;
      if (bgAudioRef.current) bgAudioRef.current.playbackRate = 1.5;
    }

    // Randomize visuals for hit
    const hitColor = getRandomColor();
    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 40;
    const jitterRot = (Math.random() - 0.5) * 20;

    setHitContext((p) => ({
      ...p,
      swingKey: newSwing,
      squishKey: p.squishKey + 1,
      sessionCount: newCount,
      counterBump: p.counterBump + 1,
      comboCount: newCombo,
      showCounter: true,
      rageMode: rageModeRef.current,
      randomColor: hitColor,
      randomJitter: { x: jitterX, y: jitterY, rot: jitterRot },
    }));
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setHitContext((p) => ({ ...p, showCounter: false }));
      setTimeout(() => {
        sessionCountRef.current = 0;
        rageModeRef.current = false;
        hammerSizeRef.current = 150;
        cracksRef.current = [];
        redrawCracks();
        setHitContext((p) => ({
          ...p,
          sessionCount: 0,
          rageMode: false,
          comboCount: 0,
        }));
        if (bgAudioRef.current) bgAudioRef.current.playbackRate = 1.0;
      }, 400);
    }, 2000);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a,button,input,.modal-content"))
        return;
      hammerPosRef.current = { x: e.clientX, y: e.clientY };
      if (hammerRef.current) {
        const s = hammerSizeRef.current;
        hammerRef.current.style.transform = `translate3d(${e.clientX - s * 0.45}px,${e.clientY - s * 0.12}px,0)`;
      }
      handleHitRef.current?.(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("a,button,input,.modal-content"))
        return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      hammerPosRef.current = { x: t.clientX, y: t.clientY };
      if (hammerRef.current) {
        const s = hammerSizeRef.current;
        hammerRef.current.style.transform = `translate3d(${t.clientX - s * 0.45}px,${t.clientY - s * 0.12}px,0)`;
      }
      handleHitRef.current?.(t.clientX, t.clientY);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onTouch, { passive: false });
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (playerIdRef.current) {
        saveHitsToSupabase(playerIdRef.current!);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveHitsToSupabase]);

  useEffect(() => {
    const handleHidden = () => {
      if (document.visibilityState === "hidden" && playerIdRef.current) {
        saveHitsToSupabase(playerIdRef.current!);
      }
    };

    document.addEventListener("visibilitychange", handleHidden);

    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
    };
  }, [saveHitsToSupabase]);

  // ── Name submit ──────────────────────────────────────────────────────────
  const handleNameSubmit = async (val: string) => {
    const cleanName = val.trim();
    if (!cleanName) return;

    setNameChecking(true);
    setNameError(null);

    try {
      const uuid = getOrCreateUUID();

      const { data: existing } = await supabase
        .from("simple_players")
        .select("id, name, total_hits")
        .eq("player_uuid", uuid)
        .maybeSingle();

      if (existing) {
        playerIdRef.current = existing.id;
        setPlayerName(existing.name);
        playerNameRef.current = existing.name;
        setTotalHits(existing.total_hits || 0);
        totalHitsRef.current = existing.total_hits || 0;
      } else {
        const { data: inserted, error } = await supabase
          .from("simple_players")
          .insert([
            {
              player_uuid: uuid,
              name: cleanName,
              total_hits: 0,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        playerIdRef.current = inserted.id;
        setPlayerName(inserted.name);
        playerNameRef.current = inserted.name;
        setTotalHits(inserted.total_hits || 0);
        totalHitsRef.current = inserted.total_hits || 0;
      }

      setShowNameModal(false);
      playPopSound();
    } catch (err) {
      console.error(err);
      setNameError("Gagal menyimpan nama");
    } finally {
      setNameChecking(false);
    }
  };

  // ── Certificate ──────────────────────────────────────────────────────────
  const handlePrintCertificate = useCallback(
    async (forcedName?: string) => {
      const nameToUse = forcedName || playerName;
      if (!nameToUse) {
        setIsCertFlow(true);
        setShowNameModal(true);
        return;
      }
      if (isGeneratingCert) return;
      setIsGeneratingCert(true);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const totalHits = totalHitsRef.current;

        // Cert logo - use the current logo displayed on screen
        const certLogoSrc = currentLogoSrc;

        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = certLogoSrc;
        await new Promise((r) => {
          logoImg.onload = r;
        });

        // Background
        const grad = ctx.createLinearGradient(0, 0, 1200, 800);
        grad.addColorStop(0, "#1a003a");
        grad.addColorStop(0.4, "#330059");
        grad.addColorStop(1, "#4a0080");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, 800);

        // Subtle grid lines for elegance
        ctx.strokeStyle = "rgba(255,215,0,0.04)";
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= 1200; gx += 60) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, 800);
          ctx.stroke();
        }
        for (let gy = 0; gy <= 800; gy += 60) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(1200, gy);
          ctx.stroke();
        }

        // Stars
        for (let i = 0; i < 150; i++) {
          ctx.beginPath();
          const px = Math.random() * 1200;
          const py = Math.random() * 800;
          const ps = Math.random() * 3 + 0.5;
          const po = Math.random() * 0.4 + 0.1;
          ctx.arc(px, py, ps, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,215,0,${po})`;
          ctx.fill();
          if (Math.random() > 0.8) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(
              px + (Math.random() - 0.5) * 40,
              py + (Math.random() - 0.5) * 40,
            );
            ctx.strokeStyle = `rgba(255,255,255,${po * 0.5})`;
            ctx.lineWidth = Math.random() * 1.5;
            ctx.stroke();
          }
        }

        // Watermark logo
        ctx.globalAlpha = 0.07;
        ctx.drawImage(
          logoImg,
          (1200 - 800) / 2,
          (800 - 800) / 2 + 50,
          800,
          800,
        );
        ctx.globalAlpha = 1.0;

        // Border
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 12;
        ctx.strokeRect(30, 30, 1140, 740);
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, 1104, 704);
        ctx.strokeRect(54, 54, 1092, 692);

        // Corners
        const drawCorner = (x: number, y: number, rot: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.moveTo(0, 50);
          ctx.quadraticCurveTo(0, 0, 50, 0);
          ctx.strokeStyle = "#FFD700";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(10, 50);
          ctx.quadraticCurveTo(10, 10, 50, 10);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        };
        drawCorner(54, 54, 0);
        drawCorner(1146, 54, Math.PI / 2);
        drawCorner(1146, 746, Math.PI);
        drawCorner(54, 746, -Math.PI / 2);

        // Logo
        ctx.drawImage(logoImg, (1200 - 160) / 2, 60, 160, 160);

        // Title
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFD700";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.font = "900 58px 'Times New Roman',serif";
        ctx.fillText("SERTIFIKAT PENGHARGAAN", 600, 310);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "italic 400 22px 'Georgia',serif";
        ctx.fillText("Diberikan dengan bangga kepada:", 600, 360);

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 76px 'Times New Roman',serif";
        const nw = ctx.measureText(nameToUse.toUpperCase()).width;
        ctx.fillText(nameToUse.toUpperCase(), 600, 450);
        ctx.beginPath();
        ctx.moveTo(600 - nw / 2 - 40, 470);
        ctx.lineTo(600 + nw / 2 + 40, 470);
        ctx.strokeStyle = "rgba(255,215,0,0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "400 22px 'Georgia',serif";
        ctx.fillText(
          "Atas dedikasi, keberanian, dan semangat pantang menyerah",
          600,
          520,
        );

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 34px 'Times New Roman',serif";
        ctx.fillText(
          `TELAH MEMUKUL TOTAL ${totalHits.toLocaleString("id-ID")} KALI!`,
          600,
          575,
        );

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "italic 22px 'Georgia',serif";
        ctx.fillText(
          "Mewakili seluruh rakyat Indonesia yang haus akan keadilan!",
          600,
          620,
        );

        // Bottom line
        ctx.beginPath();
        ctx.moveTo(150, 685);
        ctx.lineTo(350, 685);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = "italic 22px 'Brush Script MT',cursive,serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Pukul Edryan Team", 250, 673);
        ctx.font = "13px 'Arial',sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("Panitia Resmi", 250, 702);

        ctx.beginPath();
        ctx.moveTo(850, 685);
        ctx.lineTo(1050, 685);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        const dateStr = new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        ctx.font = "bold 16px 'Georgia',serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(dateStr, 950, 673);
        ctx.font = "13px 'Arial',sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("Tanggal Diterbitkan", 950, 702);

        // Seal
        ctx.beginPath();
        ctx.arc(600, 676, 44, 0, Math.PI * 2);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(600, 676, 37, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,215,0,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,215,0,0.15)";
        ctx.fill();
        ctx.font = "bold 11px 'Arial',sans-serif";
        ctx.fillStyle = "#FFD700";
        ctx.fillText("OFFICIAL", 600, 671);
        ctx.fillText("SEAL", 600, 687);

        // Download
        const link = document.createElement("a");
        link.download = `Sertifikat_Pukul_${nameToUse}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        playPopSound();
      } catch (err) {
        console.error("Failed to generate certificate:", err);
      } finally {
        setIsGeneratingCert(false);
      }
    },
    [playerName, isGeneratingCert, currentLogoSrc],
  );

  // ── Profile share ────────────────────────────────────────────────────────
  const handleShareProfile = useCallback(async () => {
    if (!playerName) return;
    const totalHits = totalHitsRef.current;
    const shareText = `🔥 Rekor Pukulan Saya: ${totalHits.toLocaleString("id-ID")} hits!\n\nAyo ikut pukul di Pukul Edryan! 🥊💥\n\nMain di sini:`;
    const shareUrl = "https://myhammergame.vercel.app";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pukul Edryan!",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Pesan ajakan disalin! Ayo ajak temanmu! 🚀");
      } catch (err) {
        console.error(err);
      }
    }
  }, [playerName]);

  // ── Derived values ───────────────────────────────────────────────────────
  const milestone = getMilestoneEmoji(sessionCount);
  const hammerDispSize = rageMode ? 250 : 150;
  const bgStyle = getBgGradient(sessionCount);

  const counterPosObj = (() => {
    const list = [
      { top: -25, right: -25, bottom: "auto", left: "auto" },
      { top: -25, left: -25, bottom: "auto", right: "auto" },
      { bottom: 40, right: -40, top: "auto", left: "auto" },
      { bottom: 40, left: -40, top: "auto", right: "auto" },
    ];
    return list[Math.floor((sessionCount || 0) / 20) % list.length];
  })();

  const comboPosObj = (() => {
    const list = [
      { bottom: -24, left: "50%", transform: "translateX(-50%)" },
      { bottom: 20, left: -20, transform: "rotate(-15deg)" },
      { bottom: 20, right: -20, left: "auto", transform: "rotate(15deg)" },
      { top: 40, left: -20, transform: "rotate(-10deg)" },
      { top: 40, right: -20, left: "auto", transform: "rotate(10deg)" },
    ];
    return list[Math.floor((comboCount || 0) / 10) % list.length];
  })();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      <div
        id="root-wrapper"
        style={{
          minHeight: "100vh",
          background: bgStyle,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "background 1.5s ease",
        }}
      >
        {/* BG canvas */}
        <canvas
          id="bg-canvas"
          ref={bgCanvasRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* FX canvas */}
        <canvas
          id="fx-canvas"
          ref={fxCanvasRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 9989,
          }}
        />

        {/* ── TOP PANEL: Notification + Province + Saweria ────────── */}
        {/* Leaderboard Pukulan Pemain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.9)",
              fontWeight: 700,
              fontSize: "clamp(12px,1.5vw,15px)",
              letterSpacing: "0.04em",
            }}
          >
            🏆 TOP PEMUKUL
          </div>
        </div>

        <div className="marquee-wrapper" style={{ marginTop: 4 }}>
          {(() => {
            const sortedPlayers = topPlayers;
            const needsMarquee = sortedPlayers.length > 5;

            const displayPlayers = needsMarquee
              ? [...sortedPlayers, ...sortedPlayers]
              : sortedPlayers;

            return (
              <div
                className={`marquee-track${rageMode ? " rage" : ""}`}
                style={{
                  animation: needsMarquee
                    ? `leaderboardScroll ${rageMode ? "10s" : "30s"} linear infinite`
                    : "none",
                  justifyContent: !needsMarquee ? "center" : "flex-start",
                }}
              >
                {displayPlayers.length > 0 ? (
                  displayPlayers.map((p, i) => {
                    const playerRank = (i % sortedPlayers.length) + 1;

                    const rankBadge =
                      playerRank <= 3 ? RANK_BADGES[playerRank] : null;

                    return (
                      <div
                        key={`${p.name}-${p.total_hits}-${i}`}
                        className={`province-btn player-btn${playerName === p.name ? " active" : ""}`}
                      >
                        {rankBadge && (
                          <span className="rank-badge">{rankBadge}</span>
                        )}

                        <span className="prov-name">{p.name}</span>

                        <span
                          className="hit-badge"
                          style={{ background: "rgba(255,215,0,0.25)" }}
                        >
                          ×{p.total_hits.toLocaleString("id-ID")}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      padding: "4px 10px",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    Belum ada data pemukul...
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── LOGO CENTER ─────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 20,
            paddingBottom: "clamp(80px,12vh,120px)",
          }}
        >
          {logoVisible && (
            <div style={{ position: "relative" }}>
              {/* Glow ring */}
              <div
                className={rageMode ? "logo-glow-rage" : "logo-glow"}
                style={{
                  position: "absolute",
                  inset: -40,
                  borderRadius: "50%",
                  background: rageMode
                    ? "radial-gradient(circle,rgba(255,50,50,0.6) 0%,rgba(255,100,0,0.25) 55%,transparent 75%)"
                    : "radial-gradient(circle,rgba(102,0,187,0.35) 0%,rgba(51,0,89,0.15) 55%,transparent 75%)",
                  filter: "blur(20px)",
                }}
              />

              <div className="logo-pop">
                <div
                  key={squishKey}
                  ref={logoRef}
                  className={`logo-inner ${
                    squishKey > 0
                      ? rageMode
                        ? "logo-squish-rage"
                        : "logo-squish"
                      : rageMode
                        ? "logo-float-fast"
                        : "logo-float"
                  }`}
                  onAnimationEnd={(e) => {
                    if (
                      e.animationName === "squish" ||
                      e.animationName === "squishRage"
                    )
                      setHitContext((p) => ({ ...p, squishKey: 0 }));
                  }}
                  style={{
                    display: "inline-block",
                    position: "relative",
                    animation:
                      squishKey > 0
                        ? undefined
                        : sessionCount >= 20
                          ? "shake 0.25s ease infinite"
                          : undefined,
                  }}
                >
                  {/* Fading out old logo */}
                  {prevLogoSrc && logoTransitioning && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={prevLogoSrc}
                      alt=""
                      draggable={false}
                      className="logo-fade-out"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "50vw",
                        height: "50vh",
                        objectFit: "contain",
                        display: "block",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentLogoSrc}
                    alt="Logo"
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    className={logoTransitioning ? "logo-fade-in" : undefined}
                    style={{
                      width: "50vw",
                      height: "50vh",
                      objectFit: "contain",
                      filter:
                        "drop-shadow(0 8px 32px rgba(102,0,187,0.5)) drop-shadow(0 0 60px rgba(255,215,0,0.15))",
                      display: "block",
                      animation: logoTransitioning
                        ? undefined
                        : rageMode || sessionCount >= 30
                          ? `rainbowBg ${rageMode ? "0.6s" : "1s"} linear infinite`
                          : undefined,
                    }}
                  />
                  <canvas
                    ref={crackCanvasRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              {/* Combo badge */}
              {comboCount >= 3 && (
                <div
                  key={comboCount}
                  className="combo-badge combo-badge-wrapper"
                  style={{
                    position: "absolute",
                    zIndex: 25,
                    textAlign: "center",
                    pointerEvents: "none",
                    transition: "all 0.15s cubic-bezier(0.23, 1, 0.32, 1)",
                    ...comboPosObj,
                    left: `calc(${comboPosObj.left} + ${randomJitter.x * 0.5}px)`,
                    bottom:
                      typeof comboPosObj.bottom === "number"
                        ? `calc(${comboPosObj.bottom}px + ${randomJitter.y * 0.5}px)`
                        : "auto",
                    top:
                      typeof comboPosObj.top === "number"
                        ? `calc(${comboPosObj.top}px + ${randomJitter.y * 0.5}px)`
                        : "auto",
                    transform: `${comboPosObj.transform} rotate(${randomJitter.rot}deg) scale(${1 + comboCount * 0.02})`,
                  }}
                >
                  <div
                    style={{
                      background:
                        comboCount >= 10
                          ? `linear-gradient(135deg, ${randomColor}, #000)`
                          : "linear-gradient(135deg,#9933FF,#6600BB)",
                      borderRadius: 999,
                      padding: "6px 20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: `0 4px 25px ${randomColor}88`,
                      border: `3px solid ${comboCount >= 10 ? randomColor : "rgba(255,215,0,0.4)"}`,
                      animation:
                        comboCount >= 20
                          ? "extremeShake 0.1s infinite"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        animation: "spin 1s linear infinite",
                      }}
                    >
                      ⚡
                    </span>
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: comboCount >= 10 ? 22 : 16,
                        letterSpacing: "0.06em",
                        textShadow: "0 0 10px rgba(0,0,0,0.5)",
                      }}
                    >
                      {comboCount}x COMBO!
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        animation: "spin 1s linear infinite reverse",
                      }}
                    >
                      ⚡
                    </span>
                  </div>
                </div>
              )}

              {/* Rage mode badge */}
              {rageMode && (
                <div
                  style={{
                    position: "absolute",
                    top: -85,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    className="rage-mode-badge"
                    style={{
                      background:
                        "linear-gradient(135deg,#FF0000,#7C3AED, #FF00FF)",
                      backgroundSize: "200% 200%",
                      borderRadius: 999,
                      padding: "8px 28px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      boxShadow:
                        "0 0 40px rgba(255,0,0,0.8), 0 0 80px rgba(124,58,237,0.4)",
                      border: "3px solid #fff",
                      animation:
                        "rageGlow 0.3s ease-in-out infinite, rageBgShift 3s ease infinite, ragePulseScale 0.6s ease-in-out infinite",
                    }}
                  >
                    <span
                      style={{ fontSize: 24, animation: "popIn 0.3s infinite" }}
                    >
                      🔥
                    </span>
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 950,
                        fontSize: 20,
                        letterSpacing: "0.12em",
                        textShadow: "2px 2px 0px #000",
                        animation: "rainbowBg 0.5s linear infinite",
                      }}
                    >
                      !!! RAGE MODE !!!
                    </span>
                    <span
                      style={{
                        fontSize: 24,
                        animation: "popIn 0.3s infinite reverse",
                      }}
                    >
                      🔥
                    </span>
                  </div>
                </div>
              )}

              {/* Hit counter (visible) */}
              {showCounter && sessionCount > 0 && (
                <div
                  key={`counter-${counterBump}`}
                  className="hit-counter-wrapper"
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    animation:
                      "counterPop 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
                    transition: "all 0.1s ease-out",
                    ...counterPosObj,
                    left:
                      typeof counterPosObj.left === "number"
                        ? `calc(${counterPosObj.left}px + ${randomJitter.x}px)`
                        : "auto",
                    right:
                      typeof counterPosObj.right === "number"
                        ? `calc(${counterPosObj.right}px + ${randomJitter.x}px)`
                        : "auto",
                    top:
                      typeof counterPosObj.top === "number"
                        ? `calc(${counterPosObj.top}px + ${randomJitter.y}px)`
                        : "auto",
                    bottom:
                      typeof counterPosObj.bottom === "number"
                        ? `calc(${counterPosObj.bottom}px + ${randomJitter.y}px)`
                        : "auto",
                    transform: `rotate(${randomJitter.rot}deg) scale(${1 + sessionCount * 0.005})`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: -10,
                      borderRadius: "50%",
                      background: randomColor,
                      filter: "blur(12px)",
                      opacity: 0.8,
                      animation: "glowPulse 0.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      background: `linear-gradient(135deg, ${randomColor}, #000)`,
                      borderRadius: "50%",
                      width: sessionCount >= 10 ? 64 : 52,
                      height: sessionCount >= 10 ? 64 : 52,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 8px 32px ${randomColor}aa`,
                      border: `3px solid #fff`,
                      animation:
                        sessionCount >= 15
                          ? "extremeShake 0.15s infinite"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 900,
                        fontSize:
                          sessionCount >= 100
                            ? 14
                            : sessionCount >= 10
                              ? 20
                              : 24,
                        lineHeight: 1,
                        textShadow: "0 0 8px rgba(0,0,0,0.8)",
                      }}
                    >
                      {sessionCount}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        marginTop: 1,
                      }}
                    >
                      HIT
                    </span>
                  </div>
                  {milestone && (
                    <div
                      style={{
                        position: "absolute",
                        top: -30,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 32,
                        animation: "milestoneFlash 0.5s ease forwards",
                      }}
                    >
                      {milestone}
                    </div>
                  )}
                </div>
              )}

              {/* Hit counter (fading out) */}
              {!showCounter && sessionCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    pointerEvents: "none",
                    animation: "counterFadeOut 0.4s ease forwards",
                    transition: "all 0.3s ease",
                    ...counterPosObj,
                  }}
                >
                  <div
                    style={{
                      background: getCounterColor(sessionCount),
                      borderRadius: "50%",
                      width: 46,
                      height: 46,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 20px rgba(102,0,187,0.4)",
                      border: "2px solid rgba(255,215,0,0.35)",
                      animation: "rainbow-hit 4s linear infinite",
                    }}
                  >
                    <span
                      style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}
                    >
                      {sessionCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SIDE BUTTONS ────────────────────────────────────────── */}
        {/* Cert button */}
        <button
          onClick={() => handlePrintCertificate()}
          className="cert-btn"
          title="Cetak Sertifikat Pukulan"
          disabled={isGeneratingCert}
        >
          {isGeneratingCert ? "⏳" : "📜"}
        </button>

        {/* Sensor button */}
        <button
          onClick={toggleSensor}
          className={`sensor-btn ${sensorEnabled ? "on" : "off"}`}
          title={sensorEnabled ? "Nonaktifkan sensor" : "Aktifkan sensor"}
        >
          {sensorEnabled ? "🙈" : "👁️"}
        </button>

        {/* Sound button */}
        <button
          onClick={toggleSound}
          className={`sound-btn${soundEnabled ? " on sound-btn-active" : " off"}`}
          title={soundEnabled ? "Matikan suara" : "Nyalakan suara"}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>

        {/* Profile button */}
        <button
          onClick={() => {
            if (playerName) setShowProfileModal(true);
            else setShowNameModal(true);
          }}
          style={{
            position: "fixed",
            bottom: 280,
            right: 20,
            zIndex: 9998,
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            backdropFilter: "blur(10px)",
            transition: "background 0.2s,border-color 0.2s,transform 0.1s",
            boxShadow: "0 4px 20px rgba(51,0,89,0.5)",
            border: "2px solid rgba(255,215,0,0.5)",
            background: "rgba(51,0,89,0.6)",
            animation: "soundBounce 1.8s ease-in-out infinite",
            cursor: "pointer",
          }}
          title="Lihat Profil"
        >
          👤
        </button>

        {/* ── HAMMER ──────────────────────────────────────────────── */}
        <div
          ref={hammerRef}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: hammerDispSize,
            height: hammerDispSize,
            pointerEvents: "none",
            zIndex: 9999,
            transform: `translate3d(${hammerPosRef.current.x - hammerDispSize * 0.45}px,${hammerPosRef.current.y - hammerDispSize * 0.12}px,0)`,
          }}
        >
          <div
            id="hammer-cursor"
            key={swingKey}
            className={
              swingKey > 0
                ? rageMode
                  ? "hammer-swing-rage"
                  : "hammer-swing"
                : "hammer-idle"
            }
            style={{
              width: "100%",
              height: "100%",
              transformOrigin: "83.5% 88%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hammer.png"
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                filter: rageMode
                  ? "drop-shadow(2px 4px 6px rgba(255,50,50,0.9)) drop-shadow(0 0 14px rgba(255,100,0,0.8))"
                  : "drop-shadow(2px 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 6px rgba(102,0,187,0.4))",
              }}
            />
          </div>
        </div>

        {/* ── NAME MODAL ────────────────────────────────────────────── */}
        {showNameModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setIsCertFlow(false);
                }}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🥊</div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: 900,
                  marginBottom: 8,
                }}
              >
                SIAPA NAMAMU?
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  marginBottom: 24,
                }}
              >
                Nama ini akan digunakan untuk sertifikat pukulanmu!
              </p>
              <input
                type="text"
                className="name-input"
                placeholder="Masukkan namamu..."
                autoFocus
                maxLength={15}
                disabled={nameChecking}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleNameSubmit(
                      (e.target as HTMLInputElement).value.trim(),
                    );
                }}
              />
              {nameError && (
                <p
                  style={{
                    color: "#CC99FF",
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  {nameError}
                </p>
              )}
              <button
                className="name-submit-btn"
                disabled={nameChecking}
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector(
                    ".name-input",
                  ) as HTMLInputElement;
                  handleNameSubmit(input?.value.trim());
                }}
                style={{
                  opacity: nameChecking ? 0.6 : 1,
                  cursor: nameChecking ? "not-allowed" : "pointer",
                }}
              >
                {nameChecking ? "MENYIAPKAN..." : "MULAI PUKUL!"}
              </button>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setIsCertFlow(false);
                }}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 12,
                }}
              >
                NANTI SAJA
              </button>
            </div>
          </div>
        )}

        {/* ── PROFILE MODAL ─────────────────────────────────────────── */}
        {showProfileModal && playerName && (
          <div
            className="modal-overlay"
            onClick={() => setShowProfileModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowProfileModal(false)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: 56, marginBottom: 12 }}>👤</div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 900,
                  marginBottom: 24,
                  letterSpacing: "0.02em",
                }}
              >
                {playerName.toUpperCase()}
              </h2>
              <div
                style={{
                  background: "rgba(51,0,89,0.4)",
                  borderRadius: 16,
                  padding: "20px",
                  marginBottom: 24,
                  border: "1px solid rgba(255,215,0,0.2)",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  TOTAL PUKULAN SEPANJANG MASA
                </div>
                <div
                  style={{
                    color: "#fff",
                    fontSize: 42,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 24 }}>⭐</span>
                  <span>{totalHits.toLocaleString("id-ID")}</span>
                </div>
              </div>
              <button
                className="name-submit-btn"
                onClick={handleShareProfile}
                style={{
                  background: "linear-gradient(135deg,#6600BB,#330059)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 8px 25px rgba(102,0,187,0.5)",
                  marginBottom: 12,
                  border: "1px solid rgba(255,215,0,0.3)",
                }}
              >
                <span style={{ fontSize: 18 }}>📲</span>
                <span>BAGIKAN KEKUATAN</span>
              </button>
              <button
                className="name-submit-btn"
                onClick={() => {
                  setShowProfileModal(false);
                  handlePrintCertificate();
                }}
                style={{
                  background: "linear-gradient(135deg,#1a0030,#4A0080)",
                }}
              >
                📜 CETAK SERTIFIKAT
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
