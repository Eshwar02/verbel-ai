import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";

/** Whether the user asked the OS to reduce motion. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/**
 * Thin wrapper around lottie-react (v3) that freezes to a static frame when the
 * user prefers reduced motion. Pass `animationData` from ../assets/lottie.
 */
export default function LottiePlayer({
  animationData,
  loop = true,
  className = "",
  style,
  ariaLabel = "animation",
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <Lottie
      src={animationData}
      loop={reduced ? false : loop}
      autoplay={!reduced}
      className={className}
      style={style}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
