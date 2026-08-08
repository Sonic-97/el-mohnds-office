export class InactivityLockTimer {
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly delayMs: number, private readonly onExpire: () => void) {}

  activity(): void {
    this.stop()
    this.timer = setTimeout(this.onExpire, this.delayMs)
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
