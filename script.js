// Rotate the hero photos with a three-second pause and a reveal fade.
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Wait until a photo is ready to paint before revealing or crossfading it.
function waitForImageReady(image) {
  if (!image) return Promise.resolve(false);

  if (typeof image.decode === "function") {
    return image.decode().then(() => true).catch(() => false);
  }

  // Older browsers can fall back to the image's load and error events.
  return new Promise((resolve) => {
    if (image.complete) {
      resolve(image.naturalWidth > 0);
      return;
    }

    image.addEventListener("load", () => resolve(true), { once: true });
    image.addEventListener("error", () => resolve(false), { once: true });
  });
}

// The hours data is shared with any other section that needs to display it.
const clinicHoursConfig = window.NorthernSmiles.clinicHours;
const clinicHours = clinicHoursConfig.weeklySchedule;
const clinicStatus = document.querySelector("#clinic-status");
const clinicHoursLabel = document.querySelector("#clinic-hours");
const clinicClock = new Intl.DateTimeFormat("en-US", {
  timeZone: clinicHoursConfig.timeZone,
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

// Convert a schedule time such as "8:00 AM" into minutes since midnight.
function timeToMinutes(timeLabel) {
  const [time, period] = timeLabel.split(" ");
  const [hour, minute] = time.split(":").map(Number);
  const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);

  return hour24 * 60 + minute;
}

function updateClinicHours() {
  const currentParts = Object.fromEntries(
    clinicClock
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );
  const todayName = currentParts.weekday;
  const todayHours = clinicHours[todayName];
  let isOpen = false;
  let hoursText;

  if (todayHours) {
    const currentHour =
      (Number(currentParts.hour) % 12) +
      (currentParts.dayPeriod === "PM" ? 12 : 0);
    const currentTime = currentHour * 60 + Number(currentParts.minute);

    isOpen =
      currentTime >= timeToMinutes(todayHours.opens) &&
      currentTime < timeToMinutes(todayHours.closes);
    hoursText = `${todayName.toUpperCase()} ${todayHours.opens} – ${todayHours.closes}`;
  } else {
    hoursText = `${todayName.toUpperCase()} — CLOSED`;
  }

  const statusText = isOpen
    ? "WE ARE CURRENTLY OPEN"
    : "WE ARE CURRENTLY CLOSED";

  // Update only changed text so the live status isn't announced repeatedly.
  if (clinicStatus.textContent !== statusText) {
    clinicStatus.textContent = statusText;
  }
  if (clinicHoursLabel.textContent !== hoursText) {
    clinicHoursLabel.textContent = hoursText;
  }
}

function refreshClinicHours() {
  updateClinicHours();

  // Align updates to the next minute so open/closed changes happen on time.
  const untilNextMinute = 60_000 - (Date.now() % 60_000);
  window.setTimeout(refreshClinicHours, untilNextMinute);
}

if (clinicStatus && clinicHoursLabel) {
  refreshClinicHours();

  // Recheck immediately when returning to a tab that may have been paused.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateClinicHours();
  });
}

// Add a class only when animations can run. Without it, all content stays visible.
const entranceElements = Array.from(document.querySelectorAll("[data-entrance]"));

if (
  !prefersReducedMotion &&
  "IntersectionObserver" in window &&
  entranceElements.length > 0
) {
  document.documentElement.classList.add("motion-ready");

  const loadElements = entranceElements.filter((element) =>
    element.hasAttribute("data-entrance-on-load")
  );

  // Reveal the first-view items in a gentle sequence instead of all at once.
  loadElements.forEach((element, index) => {
    element.style.setProperty("--entrance-delay", `${index * 75}ms`);

    const portrait = element.matches(".hero-image-frame")
      ? element.querySelector(".hero-portrait.is-top")
      : null;
    const revealElement = () => {
      window.setTimeout(() => element.classList.add("is-visible"), 40);
    };

    if (portrait) {
      waitForImageReady(portrait).then(revealElement);
    } else {
      revealElement();
    }
  });

  const scrollElements = entranceElements.filter(
    (element) => !element.hasAttribute("data-entrance-on-load")
  );

  // Benefits appear as they enter view, then stay visible for the rest of the visit.
  const entranceObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const siblingEntrances = Array.from(
          entry.target.parentElement.querySelectorAll(
            '[data-entrance]:not([data-entrance-on-load])'
          )
        );
        const staggerIndex = siblingEntrances.indexOf(entry.target);

        entry.target.style.setProperty(
          "--entrance-delay",
          `${staggerIndex * 90}ms`
        );
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
  );

  scrollElements.forEach((element) => entranceObserver.observe(element));
}

const heroFrame = document.querySelector(".hero-image-frame");
const portraits = heroFrame?.querySelectorAll(".hero-portrait");

if (heroFrame && portraits?.length === 2) {
  const slides = [
    {
      src: portraits[0].getAttribute("src"),
      description: heroFrame.getAttribute("aria-label"),
    },
    {
      src: "./assets/home_slide_img_2.png",
      description:
        "Three Northern Smiles team members with a dental model and oral health awareness sign",
    },
    {
      src: "./assets/home_slide_img_3.png",
      description: "A child having a dental hygiene visit",
    },
  ];

  if (!prefersReducedMotion) {
    const slideDelay = 3000;
    const fadeDuration = 2000;
    let currentSlide = 0;
    let topPortrait = portraits[0];
    let underPortrait = portraits[1];
    const slideReadiness = new Map();

    // Cache decoded images, loading a slide only when the slideshow needs it.
    function prepareSlide(slideIndex) {
      const slide = slides[slideIndex];

      if (!slideReadiness.has(slide.src)) {
        const existingImage = Array.from(portraits).find(
          (portrait) => portrait.getAttribute("src") === slide.src
        );
        const image = existingImage || new Image();

        if (!existingImage) image.src = slide.src;

        const readiness = waitForImageReady(image).then((isReady) => {
          if (!isReady) slideReadiness.delete(slide.src);
          return isReady;
        });
        slideReadiness.set(slide.src, readiness);
      }

      return slideReadiness.get(slide.src);
    }

    async function showNextSlide() {
      const nextSlide = (currentSlide + 1) % slides.length;
      const upcomingSlide = (nextSlide + 1) % slides.length;
      const [nextSlideReady, upcomingSlideReady] = await Promise.all([
        waitForImageReady(underPortrait),
        prepareSlide(upcomingSlide),
      ]);

      // Keep the current photo visible and retry if either image isn't ready.
      if (!nextSlideReady || !upcomingSlideReady) {
        window.setTimeout(showNextSlide, 1000);
        return;
      }

      // Fade the top photo away to reveal the fully visible photo below.
      topPortrait.classList.add("is-fading-out");
      heroFrame.setAttribute("aria-label", slides[nextSlide].description);

      window.setTimeout(async () => {
        // Reuse the faded photo as the layer beneath the next slide.
        topPortrait.src = slides[upcomingSlide].src;
        await waitForImageReady(topPortrait);
        topPortrait.classList.remove("is-top", "is-fading-out");
        topPortrait.classList.add("is-under");
        underPortrait.classList.remove("is-under");
        underPortrait.classList.add("is-top");

        currentSlide = nextSlide;
        const previousTop = topPortrait;
        topPortrait = underPortrait;
        underPortrait = previousTop;

        // Give the newly revealed photo its full hold time before fading again.
        window.setTimeout(showNextSlide, slideDelay);
      }, fadeDuration);
    }

    // Start the slide timer only after the initial portrait is decoded.
    prepareSlide(currentSlide).then((isReady) => {
      if (isReady) window.setTimeout(showNextSlide, slideDelay);
    });
  }
}

// Add the compact glass style once the statement banner has scrolled away.
const statementBanner = document.querySelector(".site-header");
const navigation = document.querySelector(".site-navigation");

if (statementBanner && navigation) {
  function updateStickyNavigation() {
    navigation.classList.toggle(
      "is-sticky",
      window.scrollY >= statementBanner.offsetHeight
    );
  }

  window.addEventListener("scroll", updateStickyNavigation, { passive: true });
  window.addEventListener("resize", updateStickyNavigation);
  updateStickyNavigation();
}
