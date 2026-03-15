let _now = $state(Date.now());
let _refCount = 0;
let _intervalId: ReturnType<typeof setInterval> | null = null;

export function getNow(): number {
  return _now;
}

export function subscribeToTick(): () => void {
  _refCount++;
  if (_refCount === 1) {
    _intervalId = setInterval(() => {
      _now = Date.now();
    }, 30_000);
  }
  return () => {
    _refCount--;
    if (_refCount === 0 && _intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  };
}
