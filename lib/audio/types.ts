export type SoundId =
  | "ui.tap"
  | "ui.tick"
  | "ui.whoosh"
  | "ui.error"
  | "draft.on-clock"
  | "phase"
  | "correct"
  | "wrong"
  | "win"
  | "streak"
  | "hint"
  | "pick"
  | "veto"
  | "veto-success";

export type SoundProfile = "arcade" | "restrained";

export type SynthKey = "tap" | "tick" | "whoosh" | "error" | "phase" | "hint";

export type SoundDefinition =
  | {
      type: "synth";
      synthKey: SynthKey;
      volume: number;
      profile: SoundProfile;
      celebratory?: boolean;
    }
  | {
      type: "sample";
      src: string;
      volume: number;
      profile: SoundProfile;
      celebratory?: boolean;
      /** Loaded only inside Draft Anything rooms, not on the global hub. */
      draftOnly?: boolean;
    };

export type PlayOptions = {
  profile?: SoundProfile;
  volumeScale?: number;
};

export type PlayState = {
  unlocked: boolean;
  muted: boolean;
  reducedMotion: boolean;
};
