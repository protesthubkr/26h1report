"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type IntroPhase = "entering" | "visible" | "holding" | "leaving" | "done";

const END_HOLD_MS = 3000;
const FADE_OUT_MS = 1200;

export function StopTheTrainIntro() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<IntroPhase>("entering");
  const [videoRatio, setVideoRatio] = useState(16 / 9);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPhase("visible");
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      void video.play().catch(() => {
        // Muted inline autoplay should work; if a browser still blocks it,
        // keep the loaded first frame visible instead of interrupting the page.
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo();
    }

    video.addEventListener("canplay", playVideo, { once: true });

    return () => {
      video.removeEventListener("canplay", playVideo);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;

    fadeTimerRef.current = window.setTimeout(() => {
      setPhase("done");
    }, FADE_OUT_MS);

    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [phase]);

  if (phase === "done") return null;

  const frameStyle = {
    "--stop-train-video-ratio": videoRatio,
  } as CSSProperties;

  return (
    <section
      aria-label="색동원 영상 인트로"
      className="stop-train-intro"
      data-phase={phase}
      style={{
        opacity: phase === "visible" || phase === "holding" ? 1 : 0,
        transitionDuration:
          phase === "leaving" ? `${FADE_OUT_MS}ms` : "2200ms",
      }}
    >
      <div className="stop-train-intro-frame" style={frameStyle}>
        <video
          ref={videoRef}
          aria-label="색동원"
          autoPlay
          className="stop-train-intro-video"
          controls={false}
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          muted
          onLoadedMetadata={(event) => {
            const { videoHeight, videoWidth } = event.currentTarget;
            if (videoWidth > 0 && videoHeight > 0) {
              setVideoRatio(videoWidth / videoHeight);
            }
          }}
          onEnded={() => {
            setPhase("holding");
            holdTimerRef.current = window.setTimeout(() => {
              setPhase("leaving");
            }, END_HOLD_MS);
          }}
          playsInline
          preload="auto"
          src="/saekdongwon.mp4"
        />
      </div>
    </section>
  );
}
