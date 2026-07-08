"use client";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { ScreenShell } from "./ScreenShell";

/**
 * 컴퓨터 화면 (미니게임 — 장애물 피하기 점프, 제한시간 30초 + 카드 수집).
 * 스페이스바/클릭으로 점프해서 장애물을 피하고, 점프해서 카드를 먹는다. 30초가 지나면 결과 화면.
 * 캐릭터 달리기: 1.png~3.png, 게임오버 포즈: character2.png, 배경: background.png, 구름: cloud1~3.png,
 * 장애물: Obstacle1~2.png, 카드: card.png (전부 public/game/).
 */

// 스테이지 크기 대비 %(가로/세로) 단위로 물리 계산 — 컨테이너 크기가 바뀌어도 그대로 스케일된다.
// GROUND_Y = background.png의 빨간 경계선(땅 표면) 높이 — 스테이지 바닥 기준 %. 캐릭터/장애물 둘 다 이 값에 맞춰 발이 닿는다.
const GROUND_Y = 15.4;
const PLAYER_X = 8;
const PLAYER_WIDTH = 9;
const PLAYER_HEIGHT = 15;
// 스프라이트 안에 투명 여백이 있어서, 그림이 실제로 닿기 전에 박스만 겹쳐서 죽는 걸 막기 위한 충돌판정 여유(1=전체 박스, 작을수록 관대해짐)
const HIT_MARGIN_X = 0.55;
const HIT_MARGIN_Y = 0.7;

// 달리기 3프레임 애니메이션 — 캐릭터 크기가 튀지 않도록 프레임마다 여백을 맞춘 이미지(1~3.png)를 쓴다.
const RUN_FRAMES = ["/game/1.png", "/game/2.png", "/game/3.png"];
const RUN_FRAME_MS = 100; // 프레임 전환 간격 — 짧게 잡아 빠르게 도는 느낌

const JUMP_VELOCITY = 130; // %/s (위로)
const GRAVITY = 260; // %/s^2
const BASE_SPEED = 32; // %/s
const MAX_SPEED = 70;
const SPEED_RAMP = 1.4; // 초당 속도 증가량
const SPAWN_MIN = 1.5; // s — 다음 장애물까지 최소 대기
const SPAWN_MAX = 3; // s — 최대 대기

const TOTAL_TIME = 30; // s — 게임 전체 제한시간

// 카드 아이템 — 점프해야 닿는 높이에 떠 있고, 장애물과 x구간이 겹치지 않게 스폰된다.
const CARD_WIDTH = 6;
const CARD_HEIGHT = 13.4; // card.png(422x699) 비율에 맞춤
const CARD_FLOAT_MIN = 4; // 땅(GROUND_Y) 기준 최소 높이(%) — 점프해야 닿음
const CARD_FLOAT_MAX = 25; // 최대 높이(%) — 점프 최고점(약 32.5%) 안에서 확실히 닿는 선까지
const CARD_SPAWN_MIN = 1; // s — 30초 안에 10장을 모을 수 있도록 장애물보다 자주, 짧게
const CARD_SPAWN_MAX = 2; // s
const CARD_OBSTACLE_GAP = 12; // % — 카드와 장애물 사이 최소 x 간격

// 장애물 종류 — 이미지마다 실제 비율에 맞는 너비/높이(스테이지 대비 %)를 따로 잡는다.
// yOffset은 이미지 안 여백 때문에 그림별로 살짝 뜨거나 파묻혀 보일 때 GROUND_Y를 기준으로 미세 보정하는 값(%, 기본 0).
const OBSTACLE_TYPES = [
  { src: "/game/Obstacle1.png", width: 16, height: 5, yOffset: -3.5 }, // 웅덩이 — 넓고 낮음, 땅에 맞춰 살짝 내림
  { src: "/game/Obstacle2.png", width: 8, height: 13, yOffset: -1.5 }, // 나무 — 좁고 높음, 땅에 맞춰 살짝 내림
];

// 배경 구름 — 화면 위쪽 1/3에서 땅보다 느리게 흘러가며(패럴랙스) 끝까지 가면 반대편에서 다시 나타난다.
const CLOUD_PARALLAX = 0.35; // 땅 속도 대비 배율
const CLOUDS = [
  { src: "/game/cloud1.png", top: 4, startX: 8, width: 14, height: 8 },
  { src: "/game/cloud2.png", top: 16, startX: 50, width: 14, height: 8 },
  { src: "/game/cloud3.png", top: 9, startX: 78, width: 13, height: 9 },
];

const wrap = (v: number, m: number) => ((v % m) + m) % m;

// 5장/10장 리워드 연출 — 실버는 아기자기하게, 골드는 더 크고 화려하게
type Celebration = "silver" | "gold" | null;
const CELEBRATION_MS: Record<"silver" | "gold", number> = { silver: 2400, gold: 3000 };
const CELEBRATION_COLORS = ["#EFEAFF", "#B78CFF", "#6FE8C8", "#FF8BA8", "#FFD54A"];

interface Particle {
  dx: number; // 중심에서 최종 위치까지 x 이동량(%)
  dy: number; // y 이동량(%)
  size: number; // px
  color: string;
  delay: number; // s
}

/** 카드를 중심으로 사방으로 고르게(약간의 랜덤 편차와 함께) 퍼지는 불꽃 파티클 생성 */
function makeFireworkParticles(count: number, spread: number): Particle[] {
  return Array.from({ length: count }).map((_, i) => {
    const angle = ((360 / count) * i + (Math.random() * 20 - 10)) * (Math.PI / 180);
    const distance = spread * (0.65 + Math.random() * 0.35);
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: 4 + Math.random() * 6,
      color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
      delay: Math.random() * 0.25,
    };
  });
}

interface Obstacle {
  id: number;
  type: number;
  /** 스폰 당시 월드 이동 거리 — 장애물 자체는 속도가 없고, (현재 월드 거리 - 이 값)만큼 왼쪽으로 밀린 위치에 그려진다. */
  spawnDistance: number;
}

interface Card {
  id: number;
  spawnDistance: number;
  /** 땅(GROUND_Y) 기준 뜬 높이(%) — 스폰 시 랜덤으로 정해져서 고정된다. */
  floatY: number;
}

type GameState = "ready" | "playing" | "over";

export function ComputerScreen({ onClose }: { onClose: () => void }) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsCollected, setCardsCollected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [worldDistance, setWorldDistance] = useState(0);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const [celebrationParticles, setCelebrationParticles] = useState<Particle[]>([]);
  const [runFrame, setRunFrame] = useState(0);

  // 매 프레임 바뀌는 값은 ref에 두고, 화면에 그릴 때만 state로 반영한다 (클로저가 오래된 값 참조하는 걸 방지)
  const playerYRef = useRef(0);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cardsRef = useRef<Card[]>([]);
  const cardSpawnTimerRef = useRef(CARD_SPAWN_MIN);
  const timeLeftRef = useRef(TOTAL_TIME);
  const cloudOffsetRef = useRef(0);
  // runSpeed = 캐릭터가 달리는 속도 = 게임 전체 스크롤 속도. 장애물/구름 전부 이 값 하나만 참조해서 움직인다(장애물 자체 속도 없음).
  const runSpeedRef = useRef(BASE_SPEED);
  const worldDistanceRef = useRef(0);
  const elapsedRef = useRef(0);
  const spawnTimerRef = useRef(SPAWN_MIN);
  const nextIdRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const cardsCollectedRef = useRef(0);
  const celebrationRef = useRef<Celebration>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silverShownRef = useRef(false);
  const goldShownRef = useRef(false);
  const runFrameRef = useRef(0);
  const runFrameTimerRef = useRef(0);
  const jumpSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameBgmRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

  // 점프 효과음 — 미리 로드해둬서 클릭 시 지연 없이 바로 재생
  useEffect(() => {
    const audio = new Audio("/sounds/jump.mp3");
    audio.volume = 0.5;
    jumpSoundRef.current = audio;
  }, []);

  // 게임오버 효과음 — 미리 로드만, 재생은 게임오버 시점에
  useEffect(() => {
    const audio = new Audio("/sounds/gameover.mp3");
    audio.volume = 0.6;
    gameOverSoundRef.current = audio;
  }, []);

  // 게임 화면 BGM — 열려 있는 동안 반복 재생하고, 방 배경음악은 완전히 꺼둔다(게임 화면에선 게임 BGM만)
  useEffect(() => {
    const audio = new Audio("/sounds/gamebgm.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    gameBgmRef.current = audio;
    audio.play().catch(() => {
      const retry = () => audio.play().catch(() => {});
      document.addEventListener("pointerdown", retry, { once: true });
    });
    window.dispatchEvent(new CustomEvent("suppress-room-bgm", { detail: true }));
    return () => {
      audio.pause();
      window.dispatchEvent(new CustomEvent("suppress-room-bgm", { detail: false }));
    };
  }, []);

  const jump = useCallback(() => {
    if (playerYRef.current !== 0) return;
    velocityRef.current = JUMP_VELOCITY;
    const sound = jumpSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }, []);

  // 5장/10장 리워드 연출 — 잠깐 게임을 멈추고 카드+불꽃을 보여준 뒤 자동으로 재개한다
  const triggerCelebration = useCallback((tier: "silver" | "gold") => {
    celebrationRef.current = tier;
    setCelebration(tier);
    setCelebrationParticles(makeFireworkParticles(tier === "gold" ? 32 : 26, tier === "gold" ? 58 : 50));
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => {
      celebrationRef.current = null;
      setCelebration(null);
    }, CELEBRATION_MS[tier]);
  }, []);

  const start = useCallback(() => {
    playerYRef.current = 0;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    cardsRef.current = [];
    cardSpawnTimerRef.current = CARD_SPAWN_MIN + Math.random() * (CARD_SPAWN_MAX - CARD_SPAWN_MIN);
    timeLeftRef.current = TOTAL_TIME;
    cloudOffsetRef.current = 0;
    runSpeedRef.current = BASE_SPEED;
    worldDistanceRef.current = 0;
    elapsedRef.current = 0;
    spawnTimerRef.current = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    lastTimeRef.current = null;
    runFrameRef.current = 0;
    runFrameTimerRef.current = 0;
    cardsCollectedRef.current = 0;
    silverShownRef.current = false;
    goldShownRef.current = false;
    celebrationRef.current = null;
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    gameOverSoundRef.current?.pause();
    if (gameOverSoundRef.current) gameOverSoundRef.current.currentTime = 0;
    const bgm = gameBgmRef.current;
    if (bgm) {
      bgm.currentTime = 0;
      bgm.play().catch(() => {});
    }
    setPlayerY(0);
    setObstacles([]);
    setCards([]);
    setCardsCollected(0);
    setCelebration(null);
    setTimeLeft(TOTAL_TIME);
    setCloudOffset(0);
    setRunFrame(0);
    setWorldDistance(0);
    setScore(0);
    setGameState("playing");
  }, []);

  const handleInput = useCallback(() => {
    if (gameState === "playing") jump();
    else start();
  }, [gameState, jump, start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      e.preventDefault();
      handleInput();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleInput]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // 리워드 연출 중엔 게임을 잠시 멈춘다 (시간을 계속 흘려보내지 않도록 여기서 그대로 반환)
      if (celebrationRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      velocityRef.current -= GRAVITY * dt;
      playerYRef.current = Math.max(0, playerYRef.current + velocityRef.current * dt);
      if (playerYRef.current === 0) velocityRef.current = 0;

      // 달리기 프레임 전환 — 땅에 있을 때만 다리를 바꾼다 (점프 중엔 한 프레임 유지)
      if (playerYRef.current === 0) {
        runFrameTimerRef.current += dt * 1000;
        if (runFrameTimerRef.current >= RUN_FRAME_MS) {
          runFrameTimerRef.current -= RUN_FRAME_MS;
          runFrameRef.current = (runFrameRef.current + 1) % RUN_FRAMES.length;
          setRunFrame(runFrameRef.current);
        }
      }

      elapsedRef.current += dt;
      runSpeedRef.current = Math.min(MAX_SPEED, BASE_SPEED + elapsedRef.current * SPEED_RAMP);
      // 캐릭터가 달린 총 거리 — 장애물은 스폰 시점 거리와의 차이로만 위치가 정해지므로, 이 값 하나가 스크롤 전체를 대표한다.
      worldDistanceRef.current += runSpeedRef.current * dt;
      cloudOffsetRef.current += runSpeedRef.current * CLOUD_PARALLAX * dt;

      // 남은 시간 — 0이 되면 게임 종료(결과 화면)
      timeLeftRef.current = Math.max(0, timeLeftRef.current - dt);
      setTimeLeft(timeLeftRef.current);

      spawnTimerRef.current -= dt;
      let next = obstaclesRef.current.filter(
        (o) => worldDistanceRef.current - o.spawnDistance < 100 + OBSTACLE_TYPES[o.type].width
      );

      // 카드 스폰 — 장애물보다 우선권을 준다. 타이머가 다 되면 장애물과 상관없이 바로 스폰한다(자주 나오도록).
      let nextCards = cardsRef.current.filter((c) => worldDistanceRef.current - c.spawnDistance < 100 + CARD_WIDTH);
      cardSpawnTimerRef.current -= dt;
      if (cardSpawnTimerRef.current <= 0) {
        cardSpawnTimerRef.current = CARD_SPAWN_MIN + Math.random() * (CARD_SPAWN_MAX - CARD_SPAWN_MIN);
        const floatY = CARD_FLOAT_MIN + Math.random() * (CARD_FLOAT_MAX - CARD_FLOAT_MIN);
        nextCards = [...nextCards, { id: nextIdRef.current++, spawnDistance: worldDistanceRef.current, floatY }];
      }

      // 장애물 스폰 — 카드가 스폰 지점 근처에 있으면 장애물이 양보한다(타이머 유지, 다음 프레임에 재시도).
      if (spawnTimerRef.current <= 0 && next.length === 0) {
        const type = Math.floor(Math.random() * OBSTACLE_TYPES.length);
        const width = OBSTACLE_TYPES[type].width;
        const spawnX = 100;
        const overlapsCard = nextCards.some((c) => {
          const cx = 100 - (worldDistanceRef.current - c.spawnDistance);
          return spawnX < cx + CARD_WIDTH + CARD_OBSTACLE_GAP && spawnX + width > cx - CARD_OBSTACLE_GAP;
        });
        if (!overlapsCard) {
          spawnTimerRef.current = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
          next = [...next, { id: nextIdRef.current++, type, spawnDistance: worldDistanceRef.current }];
        }
      }
      obstaclesRef.current = next;

      // 스프라이트 안 투명 여백만큼 박스보다 실제 그림은 작으므로, 판정 박스를 안쪽으로 줄여서 눈에 보이는 것과 가깝게 맞춘다.
      const px1 = PLAYER_X + (PLAYER_WIDTH * (1 - HIT_MARGIN_X)) / 2;
      const pWidth = PLAYER_WIDTH * HIT_MARGIN_X;
      const collided = next.some((o) => {
        const t = OBSTACLE_TYPES[o.type];
        const ox = 100 - (worldDistanceRef.current - o.spawnDistance) + (t.width * (1 - HIT_MARGIN_X)) / 2;
        const oWidth = t.width * HIT_MARGIN_X;
        const oHeight = t.height * HIT_MARGIN_Y;
        return ox < px1 + pWidth && ox + oWidth > px1 && playerYRef.current < oHeight;
      });

      // 캐릭터가 점프해서 카드에 닿으면 먹은 것으로 처리하고 화면에서 제거
      let eaten = 0;
      nextCards = nextCards.filter((c) => {
        const x = 100 - (worldDistanceRef.current - c.spawnDistance);
        const hit =
          x < PLAYER_X + PLAYER_WIDTH &&
          x + CARD_WIDTH > PLAYER_X &&
          playerYRef.current < c.floatY + CARD_HEIGHT &&
          playerYRef.current + PLAYER_HEIGHT > c.floatY;
        if (hit) eaten++;
        return !hit;
      });
      if (eaten > 0) {
        cardsCollectedRef.current += eaten;
        setCardsCollected(cardsCollectedRef.current);
        if (cardsCollectedRef.current >= 5 && !silverShownRef.current) {
          silverShownRef.current = true;
          triggerCelebration("silver");
        }
        if (cardsCollectedRef.current >= 10 && !goldShownRef.current) {
          goldShownRef.current = true;
          triggerCelebration("gold");
        }
      }
      cardsRef.current = nextCards;

      setPlayerY(playerYRef.current);
      setObstacles(next);
      setCards(nextCards);
      setCloudOffset(cloudOffsetRef.current);
      setWorldDistance(worldDistanceRef.current);
      const currentScore = Math.floor(elapsedRef.current * 10);
      setScore(currentScore);

      if (collided || timeLeftRef.current <= 0) {
        gameBgmRef.current?.pause();
        const overSound = gameOverSoundRef.current;
        if (overSound) {
          overSound.currentTime = 0;
          overSound.play().catch(() => {});
        }
        setGameState("over");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  return (
    <ScreenShell title="Computer" onClose={onClose}>
      <div
        onClick={handleInput}
        style={{ backgroundImage: "url(/game/background.png)" }}
        className="relative w-[min(92vw,640px)] aspect-[1456/1080] rounded-2xl border-2 border-glassline overflow-hidden bg-inkdark bg-cover bg-center cursor-pointer select-none"
      >
        {/* 배경 구름 — 땅보다 느리게 흘러가는 패럴랙스, 끝까지 가면 반대편에서 다시 나타난다(루프) */}
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              left: `${wrap(c.startX - cloudOffset, 100 + c.width) - c.width}%`,
              top: `${c.top}%`,
              width: `${c.width}%`,
              height: `${c.height}%`,
              backgroundImage: `url(${c.src})`,
            }}
            className="absolute bg-contain bg-no-repeat bg-center"
          />
        ))}

        {/* 점수 + 남은 시간 */}
        <div className="absolute top-3 right-4 text-cream font-mono text-sm tabular-nums drop-shadow text-right">
          <div>{score}</div>
          <div className="text-down font-black text-3xl leading-none mt-1 drop-shadow-[0_2px_6px_rgba(255,139,168,0.6)]">
            {Math.ceil(timeLeft)}s
          </div>
        </div>

        {/* 먹은 카드 개수 — 왼쪽 위, 카드 아이콘 1개 + ×N */}
        {cardsCollected > 0 && (
          <div className="absolute top-3 left-4 flex items-center gap-1.5">
            <div
              aria-hidden
              style={{ backgroundImage: "url(/game/card.png)" }}
              className="w-6 h-8 bg-contain bg-no-repeat bg-center shrink-0"
            />
            <span className="text-cream font-black text-2xl drop-shadow">×{cardsCollected}</span>
          </div>
        )}

        {/* 플레이어 */}
        <div
          aria-hidden
          style={{
            left: `${PLAYER_X}%`,
            bottom: `${GROUND_Y + playerY}%`,
            width: `${PLAYER_WIDTH}%`,
            height: `${PLAYER_HEIGHT}%`,
            backgroundImage: `url(${gameState === "over" ? "/game/character2.png" : RUN_FRAMES[runFrame]})`,
          }}
          className="absolute bg-contain bg-no-repeat bg-center"
        />

        {/* 장애물 — 자체 속도 없이, 공유된 worldDistance와 스폰 시점 거리의 차이로만 위치가 정해진다 */}
        {obstacles.map((o) => {
          const t = OBSTACLE_TYPES[o.type];
          const x = 100 - (worldDistance - o.spawnDistance);
          return (
            <div
              key={o.id}
              aria-hidden
              style={{
                left: `${x}%`,
                bottom: `${GROUND_Y + t.yOffset}%`,
                width: `${t.width}%`,
                height: `${t.height}%`,
                backgroundImage: `url(${t.src})`,
              }}
              className="absolute bg-contain bg-no-repeat bg-bottom"
            />
          );
        })}

        {/* 카드 아이템 — 점프해야 닿는 높이에 떠 있다 */}
        {cards.map((c) => {
          const x = 100 - (worldDistance - c.spawnDistance);
          return (
            <div
              key={c.id}
              aria-hidden
              style={{
                left: `${x}%`,
                bottom: `${GROUND_Y + c.floatY}%`,
                width: `${CARD_WIDTH}%`,
                height: `${CARD_HEIGHT}%`,
                backgroundImage: "url(/game/card.png)",
              }}
              className="absolute bg-contain bg-no-repeat bg-center"
            />
          );
        })}

        {/* 시작 전 / 게임오버 안내 */}
        {gameState !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/60 text-center px-4">
            {gameState === "over" && (
              <>
                <p className="text-down font-serif font-black text-5xl sm:text-6xl tracking-wide drop-shadow-[0_4px_16px_rgba(255,139,168,0.6)] animate-card-pop">
                  GAME OVER
                </p>
                <p className="text-cream font-semibold">Score {score}</p>
              </>
            )}
            <p className="text-creamdim text-sm">
              Press <span className="text-amber font-semibold">Space</span> or{" "}
              <span className="text-amber font-semibold">click</span> to{" "}
              {gameState === "over" ? "retry" : "start"}
            </p>
          </div>
        )}

        {/* 5장/10장 리워드 연출 — 카드가 화면 중앙에서 팝업, 주변으로 불꽃이 카드를 가리지 않게 퍼진다 */}
        {celebration && (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none">
            {celebrationParticles.map((p, i) => (
              <span
                key={i}
                aria-hidden
                style={
                  {
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    animationDelay: `${p.delay}s`,
                    "--fw-left": `${50 + p.dx}%`,
                    "--fw-top": `${50 + p.dy}%`,
                  } as CSSProperties
                }
                className="absolute rounded-full animate-firework"
              />
            ))}

            {(() => {
              const sparkleCount = celebration === "gold" ? 10 : 6;
              const sparkleRadius = celebration === "gold" ? 32 : 26;
              return Array.from({ length: sparkleCount }).map((_, i) => (
                <span
                  key={`sparkle-${i}`}
                  aria-hidden
                  style={{
                    left: `${50 + Math.cos((i / sparkleCount) * Math.PI * 2) * sparkleRadius}%`,
                    top: `${50 + Math.sin((i / sparkleCount) * Math.PI * 2) * sparkleRadius}%`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                  className={`absolute w-3 h-3 animate-sparkle ${
                    celebration === "gold" ? "bg-[#FFD54A]" : "bg-cream"
                  }`}
                />
              ));
            })()}

            <div className="relative flex flex-col items-center">
              <div
                aria-hidden
                className={`absolute inset-0 rounded-full blur-2xl animate-celebration-glow ${
                  celebration === "gold" ? "bg-[#FFD54A]/50 scale-[2.2]" : "bg-cream/40 scale-[1.7]"
                }`}
              />
              <div className="relative w-[32vw] max-w-[190px] aspect-[422/699] animate-card-pop">
                <div
                  style={{ backgroundImage: "url(/game/card.png)" }}
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center"
                />
                {celebration === "gold" && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-[24%] bg-gradient-to-b from-[#FFD54A]/85 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[#FFD54A]/85 to-transparent pointer-events-none" />
                  </>
                )}
              </div>
              <p
                className={`relative mt-3 font-serif font-bold animate-reward-label ${
                  celebration === "gold" ? "text-3xl text-[#FFD54A]" : "text-xl text-cream"
                }`}
              >
                {celebration === "gold" ? "GOLD CARD!" : "SILVER CARD!"}
              </p>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
