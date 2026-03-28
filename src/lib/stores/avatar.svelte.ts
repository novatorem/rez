import { browser } from '$app/environment';

export type AvatarVariant = 'beam' | 'marble' | 'pixel' | 'sunset' | 'bauhaus' | 'ring';

export const DEFAULT_AVATAR_COLORS = ['#FFC8DD', '#BDE0FE', '#A2D2FF', '#FFAFCC', '#CDB4DB'];
export const DEFAULT_AVATAR_VARIANT: AvatarVariant = 'beam';

class AvatarSettings {
  variant = $state<AvatarVariant>(DEFAULT_AVATAR_VARIANT);
  colors = $state<string[]>([...DEFAULT_AVATAR_COLORS]);

  constructor() {
    if (browser) {
      const storedVariant = localStorage.getItem('avatar_variant');
      if (storedVariant) this.variant = storedVariant as AvatarVariant;

      const storedColors = localStorage.getItem('avatar_colors');
      if (storedColors) {
        try {
          const parsed = JSON.parse(storedColors);
          if (Array.isArray(parsed) && parsed.length === 5) {
            this.colors = parsed;
          }
        } catch (e) {
          console.error('Failed to parse avatar colors', e);
        }
      }
    }
  }

  save() {
    if (browser) {
      localStorage.setItem('avatar_variant', this.variant);
      localStorage.setItem('avatar_colors', JSON.stringify(this.colors));
    }
  }

  updateVariant(v: AvatarVariant) {
    this.variant = v;
    this.save();
  }

  updateColors(c: string[]) {
    this.colors = [...c];
    this.save();
  }
}

export const avatarSettings = new AvatarSettings();
