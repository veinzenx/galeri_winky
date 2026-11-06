import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import Footer from "../componnents/Footer";
import Header from "../componnents/Header";

const moods = ["lavender", "ocean", "rose", "aurora"];

export default function Layout() {
  const [mood, setMood] = useState(moods[0]);
  const [navVisible, setNavVisible] = useState(true);
  const wrapperRef = useRef(null);
  const navVisibilityTimerRef = useRef(0);
  const frameRef = useRef(0);
  const latestPointerRef = useRef(null);
  const activeCardRef = useRef(null);
  const previousPlanetPointerRef = useRef(null);
  const planetRotationRef = useRef({ x: 0, y: 0 });
  const planetDragPointerIdRef = useRef(null);

  function cycleMood() {
    setMood(current => moods[(moods.indexOf(current) + 1) % moods.length]);
  }

  const showNav = useCallback(() => {
    window.clearTimeout(navVisibilityTimerRef.current);
    setNavVisible(true);
  }, []);

  const scheduleNavHide = useCallback((delay) => {
    window.clearTimeout(navVisibilityTimerRef.current);
    navVisibilityTimerRef.current = window.setTimeout(() => setNavVisible(false), delay);
  }, []);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (document.activeElement?.closest(".site-header") || currentScrollY <= 8) {
        showNav();
      } else if (currentScrollY < previousScrollY) {
        showNav();
      } else if (currentScrollY > previousScrollY) {
        scheduleNavHide(650);
      }
      previousScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.clearTimeout(navVisibilityTimerRef.current);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scheduleNavHide, showNav]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    function resetCard() {
      if (!activeCardRef.current) return;
      activeCardRef.current.style.removeProperty("--tilt-x");
      activeCardRef.current.style.removeProperty("--tilt-y");
      activeCardRef.current = null;
    }

    function handlePointerMove(event) {
      if (event.pointerType === "touch") return;
      latestPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        target: event.target,
        pointerId: event.pointerId,
      };
      if (frameRef.current) return;

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;
        const pointer = latestPointerRef.current;
        if (!pointer) return;

        const bounds = wrapper.getBoundingClientRect();
        const normalizedX = (pointer.x / window.innerWidth - 0.5) * 2;
        const normalizedY = (pointer.y / window.innerHeight - 0.5) * 2;
        wrapper.dataset.pointerActive = "true";
        wrapper.style.setProperty("--cursor-x", `${pointer.x}px`);
        wrapper.style.setProperty("--cursor-y", `${pointer.y}px`);
        wrapper.style.setProperty("--pointer-x", normalizedX.toFixed(3));
        wrapper.style.setProperty("--pointer-y", normalizedY.toFixed(3));

        const planet = wrapper.querySelector(".hero-sun");
        if (planet && planetDragPointerIdRef.current === pointer.pointerId) {
          const previousPointer = previousPlanetPointerRef.current;
          if (previousPointer) {
            const rotation = planetRotationRef.current;
            rotation.y = (rotation.y + (pointer.x - previousPointer.x) * 0.45) % 360;
            rotation.x = (rotation.x - (pointer.y - previousPointer.y) * 0.45) % 360;
            planet.style.setProperty("--planet-rotate-x", `${rotation.x.toFixed(2)}deg`);
            planet.style.setProperty("--planet-rotate-y", `${rotation.y.toFixed(2)}deg`);
          }
          previousPlanetPointerRef.current = { x: pointer.x, y: pointer.y };
        }

        const target = pointer.target instanceof Element
          ? pointer.target.closest(
            ".photo-card, .profile-card, .category-form, .table-wrap, .ai-panel, .ai-sidebar",
          )
          : null;
        if (!target || !bounds.width || !bounds.height) {
          resetCard();
          return;
        }

        if (activeCardRef.current && activeCardRef.current !== target) resetCard();
        activeCardRef.current = target;
        const cardBounds = target.getBoundingClientRect();
        const localX = (pointer.x - cardBounds.left) / cardBounds.width - 0.5;
        const localY = (pointer.y - cardBounds.top) / cardBounds.height - 0.5;
        target.style.setProperty("--tilt-x", `${(localY * -9).toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${(localX * 9).toFixed(2)}deg`);
      });
    }

    function handlePlanetPointerDown(event) {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const planet = event.target.closest(".hero-sun");
      if (!planet) return;
      planetDragPointerIdRef.current = event.pointerId;
      previousPlanetPointerRef.current = { x: event.clientX, y: event.clientY };
      if (planet.hasPointerCapture?.(event.pointerId)) return;
      planet.setPointerCapture(event.pointerId);
    }

    function handlePlanetPointerEnd(event) {
      if (planetDragPointerIdRef.current !== event.pointerId) return;
      planetDragPointerIdRef.current = null;
      previousPlanetPointerRef.current = null;
    }

    function handlePointerLeave() {
      latestPointerRef.current = null;
      wrapper.dataset.pointerActive = "false";
      wrapper.style.setProperty("--pointer-x", "0");
      wrapper.style.setProperty("--pointer-y", "0");
      resetCard();
    }

    wrapper.addEventListener("pointermove", handlePointerMove, { passive: true });
    wrapper.addEventListener("pointerdown", handlePlanetPointerDown);
    wrapper.addEventListener("pointerup", handlePlanetPointerEnd);
    wrapper.addEventListener("pointercancel", handlePlanetPointerEnd);
    wrapper.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      wrapper.removeEventListener("pointermove", handlePointerMove);
      wrapper.removeEventListener("pointerdown", handlePlanetPointerDown);
      wrapper.removeEventListener("pointerup", handlePlanetPointerEnd);
      wrapper.removeEventListener("pointercancel", handlePlanetPointerEnd);
      wrapper.removeEventListener("pointerleave", handlePointerLeave);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      resetCard();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="wrapper" data-mood={mood}>
      <div className="cursor-aura" aria-hidden="true" />
      <Header
        mood={mood}
        onCycleMood={cycleMood}
        navVisible={navVisible}
        onNavFocus={showNav}
        onNavPointerLeave={() => scheduleNavHide(650)}
      />
      <main className="page-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}