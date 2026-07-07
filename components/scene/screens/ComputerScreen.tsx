"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScreenShell } from "./ScreenShell";

/**
 * 컴퓨터 화면 (미니게임 — 장애물 피하기 점프).
 * 스페이스바/클릭으로 점프해서 날아오는 장애물을 피하고, 오래 살아남을수록 점수가 올라간다.
 * 캐릭터: character1.png, 배경: background.png, 구름: cloud1~3.png, 장애물: Obstacle1~2.png (전부 public/game/).
 */

// 스테이지 크기 대비 %(가로/세로) 단위로 물리 계산 — 컨테이너 크기가 바뀌어도 그대로 스케일된다.
// GROUND_Y = background.png의 빨간 경계선(땅 표면) 높이 — 스테이지 바닥 기준 %. 캐릭터/장애물 둘 다 이 값에 맞춰 발이 닿는다.
const GROUND_Y = 15.4;
const PLAYER_X = 8;
const PLAYER_WIDTH = 9;
const PLAYER_HEIGHT = 15;

const JUMP_VELOCITY = 130; // %/s (위로)
const GRAVITY = 260; // %/s^2
const BASE_SPEED = 32; // %/s
const MAX_SPEED = 70;
const SPEED_RAMP = 1.4; // 초당 속도 증가량
const SPAWN_MIN = 1.5; // s — 다음 장애물까지 최소 대기
const SPAWN_MAX = 3; // s — 최대 대기

// 장애물 종류 — 이미지마다 실제 비율에 맞는 너비/높이(스테이지 대비 %)를 따로 잡는다.
const OBSTACLE_TYPES = [
  { src: "/game/Obstacle1.png", width: 16, height: 5 }, // 웅덩이 — 넓고 낮음
  { src: "/game/Obstacle2.png", width: 8, height: 13 }, // 나무 — 좁고 높음
];

// 배경 구름 — 화면 위쪽 1/3에서 땅보다 느리게 흘러가며(패럴랙스) 끝까지 가면 반대편에서 다시 나타난다.
const CLOUD_PARALLAX = 0.35; // 땅 속도 대비 배율
const CLOUDS = [
  { src: "/game/cloud1.png", top: 4, startX: 8, width: 14, height: 8 },
  { src: "/game/cloud2.png", top: 16, startX: 50, width: 14, height: 8 },
  { src: "/game/cloud3.png", top: 9, startX: 78, width: 13, height: 9 },
];

const wrap = (v: number, m: number) => ((v % m) + m) % m;

interface Obstacle {
  id: number;
  type: number;
  /** 스폰 당시 월드 이동 거리 — 장애물 자체는 속도가 없고, (현재 월드 거리 - 이 값)만큼 왼쪽으로 밀린 위치에 그려진다. */
  spawnDistance: number;
}

type GameState = "ready" | "playing" | "over";

export function ComputerScreen({ onClose }: { onClose: () => void }) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [worldDistance, setWorldDistance] = useState(0);

  // 매 프레임 바뀌는 값은 ref에 두고, 화면에 그릴 때만 state로 반영한다 (클로저가 오래된 값 참조하는 걸 방지)
  const playerYRef = useRef(0);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cloudOffsetRef = useRef(0);
  // runSpeed = 캐릭터가 달리는 속도 = 게임 전체 스크롤 속도. 장애물/구름 전부 이 값 하나만 참조해서 움직인다(장애물 자체 속도 없음).
  const runSpeedRef = useRef(BASE_SPEED);
  const worldDistanceRef = useRef(0);
  const elapsedRef = useRef(0);
  const spawnTimerRef = useRef(SPAWN_MIN);
  const nextIdRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const jump = useCallback(() => {
    if (playerYRef.current === 0) velocityRef.current = JUMP_VELOCITY;
  }, []);

  const start = useCallback(() => {
    playerYRef.current = 0;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    cloudOffsetRef.current = 0;
    runSpeedRef.current = BASE_SPEED;
    worldDistanceRef.current = 0;
    elapsedRef.current = 0;
    spawnTimerRef.current = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    lastTimeRef.current = null;
    setPlayerY(0);
    setObstacles([]);
    setCloudOffset(0);
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

      velocityRef.current -= GRAVITY * dt;
      playerYRef.current = Math.max(0, playerYRef.current + velocityRef.current * dt);
      if (playerYRef.current === 0) velocityRef.current = 0;

      elapsedRef.current += dt;
      runSpeedRef.current = Math.min(MAX_SPEED, BASE_SPEED + elapsedRef.current * SPEED_RAMP);
      // 캐릭터가 달린 총 거리 — 장애물은 스폰 시점 거리와의 차이로만 위치가 정해지므로, 이 값 하나가 스크롤 전체를 대표한다.
      worldDistanceRef.current += runSpeedRef.current * dt;
      cloudOffsetRef.current += runSpeedRef.current * CLOUD_PARALLAX * dt;

      spawnTimerRef.current -= dt;
      let next = obstaclesRef.current.filter(
        (o) => worldDistanceRef.current - o.spawnDistance < 100 + OBSTACLE_TYPES[o.type].width
      );
      // 타이머가 다 됐어도 화면에 장애물이 남아있으면 기다렸다가, 다 사라진 다음 프레임에 바로 스폰한다 (안 겹치게)
      if (spawnTimerRef.current <= 0 && next.length === 0) {
        spawnTimerRef.current = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
        const type = Math.floor(Math.random() * OBSTACLE_TYPES.length);
        next = [...next, { id: nextIdRef.current++, type, spawnDistance: worldDistanceRef.current }];
      }
      obstaclesRef.current = next;

      const collided = next.some((o) => {
        const t = OBSTACLE_TYPES[o.type];
        const x = 100 - (worldDistanceRef.current - o.spawnDistance);
        return x < PLAYER_X + PLAYER_WIDTH && x + t.width > PLAYER_X && playerYRef.current < t.height;
      });

      setPlayerY(playerYRef.current);
      setObstacles(next);
      setCloudOffset(cloudOffsetRef.current);
      setWorldDistance(worldDistanceRef.current);
      const currentScore = Math.floor(elapsedRef.current * 10);
      setScore(currentScore);

      if (collided) {
        setBest((b) => Math.max(b, currentScore));
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

        {/* 점수 */}
        <div className="absolute top-3 right-4 text-cream font-mono text-sm tabular-nums drop-shadow">
          {best > 0 && <span className="text-creamdim mr-3">BEST {best}</span>}
          {score}
        </div>

        {/* 플레이어 */}
        <div
          aria-hidden
          style={{
            left: `${PLAYER_X}%`,
            bottom: `${GROUND_Y + playerY}%`,
            width: `${PLAYER_WIDTH}%`,
            height: `${PLAYER_HEIGHT}%`,
            backgroundImage: "url(/game/character1.png)",
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
                bottom: `${GROUND_Y}%`,
                width: `${t.width}%`,
                height: `${t.height}%`,
                backgroundImage: `url(${t.src})`,
              }}
              className="absolute bg-contain bg-no-repeat bg-bottom"
            />
          );
        })}

        {/* 시작 전 / 게임오버 안내 */}
        {gameState !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/60 text-center px-4">
            {gameState === "over" && (
              <p className="text-cream font-bold text-lg">Game Over — Score {score}</p>
            )}
            <p className="text-creamdim text-sm">
              Press <span className="text-amber font-semibold">Space</span> or{" "}
              <span className="text-amber font-semibold">click</span> to{" "}
              {gameState === "over" ? "retry" : "start"}
            </p>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
