(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* =========================
     Reveal-анимация
  ========================= */

  const revealElements =
    document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("visible");

          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
      }
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach((element) => {
      element.classList.add("visible");
    });
  }

  /* =========================
     Navbar
  ========================= */

  const siteHeader =
    document.querySelector(".site-header");

  const navLinks = Array.from(
    document.querySelectorAll(".nav-link")
  );

  const sections = navLinks
    .map((link) => {
      const selector = link.getAttribute("href");

      if (
        !selector ||
        !selector.startsWith("#")
      ) {
        return null;
      }

      return document.querySelector(selector);
    })
    .filter(Boolean);

  function updateHeaderState() {
    if (!siteHeader) return;

    siteHeader.classList.toggle(
      "is-scrolled",
      window.scrollY > 30
    );
  }

  function setActiveNav(sectionId) {
    navLinks.forEach((link) => {
      const isActive =
        link.getAttribute("href") ===
        `#${sectionId}`;

      link.classList.toggle(
        "active",
        isActive
      );

      if (isActive) {
        link.setAttribute(
          "aria-current",
          "page"
        );

        const navContainer =
          link.closest(".nav-links");

        if (
          navContainer &&
          window.innerWidth <= 900
        ) {
          const targetLeft =
            link.offsetLeft -
            navContainer.clientWidth / 2 +
            link.clientWidth / 2;

          navContainer.scrollTo({
            left: targetLeft,
            behavior: reducedMotion
              ? "auto"
              : "smooth",
          });
        }
      } else {
        link.removeAttribute(
          "aria-current"
        );
      }
    });
  }

  function getHeaderOffset() {
    if (!siteHeader) return 0;

    return siteHeader.offsetHeight + 18;
  }

  navLinks.forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        const selector =
          link.getAttribute("href");

        if (
          !selector ||
          !selector.startsWith("#")
        ) {
          return;
        }

        const target =
          document.querySelector(selector);

        if (!target) return;

        event.preventDefault();

        const targetTop =
          target.getBoundingClientRect().top +
          window.scrollY -
          getHeaderOffset();

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: reducedMotion
            ? "auto"
            : "smooth",
        });

        setActiveNav(target.id);
      }
    );
  });

  if (
    "IntersectionObserver" in window &&
    sections.length
  ) {
    const sectionObserver =
      new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter(
              (entry) =>
                entry.isIntersecting
            )
            .sort(
              (first, second) =>
                second.intersectionRatio -
                first.intersectionRatio
            );

          if (!visibleEntries.length) {
            return;
          }

          setActiveNav(
            visibleEntries[0].target.id
          );
        },
        {
          rootMargin:
            "-25% 0px -55% 0px",

          threshold: [
            0.05,
            0.15,
            0.3,
            0.5,
            0.75,
          ],
        }
      );

    sections.forEach((section) => {
      sectionObserver.observe(section);
    });
  }

  window.addEventListener(
    "scroll",
    updateHeaderState,
    {
      passive: true,
    }
  );

  updateHeaderState();

  /* =========================
     Слайдеры
  ========================= */

  document
    .querySelectorAll("[data-carousel]")
    .forEach((carousel) => {
      const slides = Array.from(
        carousel.children
      );

      const shell =
        carousel.closest(
          ".carousel-shell"
        );

      if (
        !shell ||
        slides.length < 2
      ) {
        return;
      }

      const autoplayInterval =
        Number(
          carousel.dataset.autoplay
        ) || 4000;

      /*
       * Автопрокрутка запускается
       * только после 7 секунд
       * бездействия пользователя.
       */
      const idleDelay = 3000;

      let currentIndex = 0;

      let autoplayTimer = null;
      let idleTimer = null;
      let scrollFrame = null;
      let programmaticTimer = null;

      let isVisible = false;
      let isPointerInside = false;
      let isUserActive = false;
      let isProgrammaticScroll = false;

      /* =========================
         Управление слайдером
      ========================= */

      const controls =
        document.createElement("div");

      controls.className =
        "carousel-controls";

      const status =
        document.createElement("div");

      status.className =
        "carousel-status";

      status.innerHTML =
        "<strong>Автослайдер</strong> · можно листать вручную";

      const dots =
        document.createElement("div");

      dots.className =
        "carousel-dots";

      dots.setAttribute(
        "aria-label",
        "Навигация по слайдеру"
      );

      const arrows =
        document.createElement("div");

      arrows.className =
        "carousel-arrows";

      const previousButton =
        document.createElement("button");

      previousButton.className =
        "carousel-arrow";

      previousButton.type =
        "button";

      previousButton.textContent =
        "←";

      previousButton.setAttribute(
        "aria-label",
        "Предыдущий слайд"
      );

      const nextButton =
        document.createElement("button");

      nextButton.className =
        "carousel-arrow";

      nextButton.type =
        "button";

      nextButton.textContent =
        "→";

      nextButton.setAttribute(
        "aria-label",
        "Следующий слайд"
      );

      arrows.append(
        previousButton,
        nextButton
      );

      controls.append(
        status,
        dots,
        arrows
      );

      shell.append(controls);

      /* =========================
         Точки
      ========================= */

      const dotButtons =
        slides.map((_, index) => {
          const dot =
            document.createElement(
              "button"
            );

          dot.className =
            "carousel-dot";

          dot.type =
            "button";

          dot.setAttribute(
            "aria-label",
            `Перейти к слайду ${
              index + 1
            }`
          );

          dot.addEventListener(
            "click",
            () => {
              registerUserActivity();

              goToSlide(
                index,
                true
              );
            }
          );

          dots.append(dot);

          return dot;
        });

      function updateControls() {
        dotButtons.forEach(
          (dot, index) => {
            const isActive =
              index === currentIndex;

            dot.classList.toggle(
              "is-active",
              isActive
            );

            if (isActive) {
              dot.setAttribute(
                "aria-current",
                "true"
              );
            } else {
              dot.removeAttribute(
                "aria-current"
              );
            }
          }
        );
      }

      /* =========================
         Горизонтальная прокрутка
      ========================= */

      function getSlideLeft(slide) {
        return (
          slide.offsetLeft -
          carousel.offsetLeft
        );
      }

      function goToSlide(
        index,
        smooth = true
      ) {
        currentIndex =
          (
            index +
            slides.length
          ) %
          slides.length;

        const targetSlide =
          slides[currentIndex];

        isProgrammaticScroll =
          true;

        if (
          programmaticTimer !== null
        ) {
          window.clearTimeout(
            programmaticTimer
          );
        }

        carousel.scrollTo({
          left:
            getSlideLeft(
              targetSlide
            ),

          behavior:
            smooth &&
            !reducedMotion
              ? "smooth"
              : "auto",
        });

        updateControls();

        programmaticTimer =
          window.setTimeout(
            () => {
              isProgrammaticScroll =
                false;

              programmaticTimer =
                null;
            },
            smooth ? 800 : 50
          );
      }

      /* =========================
         Автопрокрутка
      ========================= */

      function stopAutoplay() {
        if (
          autoplayTimer !== null
        ) {
          window.clearInterval(
            autoplayTimer
          );

          autoplayTimer = null;
        }
      }

      function clearIdleTimer() {
        if (
          idleTimer !== null
        ) {
          window.clearTimeout(
            idleTimer
          );

          idleTimer = null;
        }
      }

      function canAutoplay() {
        return (
          !reducedMotion &&
          isVisible &&
          !document.hidden &&
          !isPointerInside &&
          !isUserActive
        );
      }

      function startAutoplay() {
        stopAutoplay();

        if (!canAutoplay()) {
          return;
        }

        autoplayTimer =
          window.setInterval(
            () => {
              goToSlide(
                currentIndex + 1,
                true
              );
            },
            autoplayInterval
          );
      }

      function waitForIdle() {
        stopAutoplay();
        clearIdleTimer();

        if (
          reducedMotion ||
          !isVisible ||
          document.hidden
        ) {
          return;
        }

        idleTimer =
          window.setTimeout(
            () => {
              isUserActive =
                false;

              if (
                !isPointerInside
              ) {
                startAutoplay();
              }
            },
            idleDelay
          );
      }

      function registerUserActivity() {
        isUserActive = true;

        stopAutoplay();
        clearIdleTimer();
        waitForIdle();
      }

      /* =========================
         Стрелки
      ========================= */

      previousButton.addEventListener(
        "click",
        () => {
          registerUserActivity();

          goToSlide(
            currentIndex - 1,
            true
          );
        }
      );

      nextButton.addEventListener(
        "click",
        () => {
          registerUserActivity();

          goToSlide(
            currentIndex + 1,
            true
          );
        }
      );

      /* =========================
         Мышь и касания
      ========================= */

      carousel.addEventListener(
        "pointerenter",
        () => {
          isPointerInside =
            true;

          isUserActive =
            true;

          stopAutoplay();
          clearIdleTimer();
        }
      );

      carousel.addEventListener(
        "pointerleave",
        () => {
          isPointerInside =
            false;

          waitForIdle();
        }
      );

      carousel.addEventListener(
        "pointerdown",
        registerUserActivity,
        {
          passive: true,
        }
      );

      carousel.addEventListener(
        "touchstart",
        registerUserActivity,
        {
          passive: true,
        }
      );

      carousel.addEventListener(
        "wheel",
        registerUserActivity,
        {
          passive: true,
        }
      );

      /* =========================
         Определение текущего слайда
      ========================= */

      carousel.addEventListener(
        "scroll",
        () => {
          if (
            !isProgrammaticScroll
          ) {
            registerUserActivity();
          }

          if (
            scrollFrame !== null
          ) {
            window.cancelAnimationFrame(
              scrollFrame
            );
          }

          scrollFrame =
            window.requestAnimationFrame(
              () => {
                const carouselRect =
                  carousel.getBoundingClientRect();

                let closestIndex =
                  0;

                let closestDistance =
                  Number
                    .POSITIVE_INFINITY;

                slides.forEach(
                  (
                    slide,
                    index
                  ) => {
                    const slideRect =
                      slide.getBoundingClientRect();

                    const distance =
                      Math.abs(
                        slideRect.left -
                        carouselRect.left
                      );

                    if (
                      distance <
                      closestDistance
                    ) {
                      closestDistance =
                        distance;

                      closestIndex =
                        index;
                    }
                  }
                );

                currentIndex =
                  closestIndex;

                updateControls();

                scrollFrame = null;
              }
            );
        },
        {
          passive: true,
        }
      );

      /* =========================
         Видимость слайдера
      ========================= */

      if (
        "IntersectionObserver" in
        window
      ) {
        const visibilityObserver =
          new IntersectionObserver(
            (entries) => {
              entries.forEach(
                (entry) => {
                  isVisible =
                    entry.isIntersecting &&
                    entry.intersectionRatio >=
                      0.55;

                  if (isVisible) {
                    isUserActive =
                      true;

                    waitForIdle();
                  } else {
                    stopAutoplay();
                    clearIdleTimer();

                    isUserActive =
                      false;

                    isPointerInside =
                      false;
                  }
                }
              );
            },
            {
              threshold: [
                0,
                0.25,
                0.55,
                0.75,
                1,
              ],
            }
          );

        visibilityObserver.observe(
          shell
        );
      } else {
        isVisible = true;
        waitForIdle();
      }

      /* =========================
         Вкладки браузера
      ========================= */

      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) {
            stopAutoplay();
            clearIdleTimer();

            return;
          }

          if (isVisible) {
            isUserActive =
              true;

            waitForIdle();
          }
        }
      );

      updateControls();
    });
})();