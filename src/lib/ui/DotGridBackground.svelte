<div class="dot-grid-bg">
  <div class="dot-grid-glow glow-1"></div>
  <div class="dot-grid-glow glow-2"></div>
</div>

<style>
  .dot-grid-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    background-image: radial-gradient(
      circle,
      color-mix(in oklch, var(--color-base-content) 10%, transparent) 1px,
      transparent 1px
    );
    background-size: 32px 32px;
  }

  .dot-grid-glow {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.2;
    will-change: transform;
  }

  .glow-1 {
    background: var(--color-primary);
    top: -10%;
    left: -10%;
    animation: orbit1 25s ease-in-out infinite;
  }

  .glow-2 {
    background: var(--color-secondary);
    top: 30%;
    left: 50%;
    animation: orbit2 35s ease-in-out infinite;
  }

  @keyframes orbit1 {
    0% {
      transform: translate(5vw, 5vh);
    }
    25% {
      transform: translate(45vw, 10vh);
    }
    50% {
      transform: translate(35vw, 50vh);
    }
    75% {
      transform: translate(5vw, 40vh);
    }
    100% {
      transform: translate(5vw, 5vh);
    }
  }

  @keyframes orbit2 {
    0% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(-30vw, 20vh);
    }
    50% {
      transform: translate(-10vw, -25vh);
    }
    75% {
      transform: translate(15vw, 15vh);
    }
    100% {
      transform: translate(0, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .glow-1,
    .glow-2 {
      animation: none;
    }
  }
</style>
