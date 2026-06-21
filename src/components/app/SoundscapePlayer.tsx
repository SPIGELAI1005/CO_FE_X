import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function SoundscapePlayer({ url }: { url: string | null | undefined }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!url) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-[color:var(--cofex-cream)] px-3 py-1.5">
      <button
        type="button"
        onClick={() => {
          const a = audioRef.current;
          if (!a) return;
          if (playing) {
            a.pause();
            setPlaying(false);
          } else {
            void a.play().then(() => setPlaying(true)).catch(() => {});
          }
        }}
        className="text-[color:var(--cofex-coffee-deep)]"
        aria-label={playing ? "Mute soundscape" : "Play soundscape"}
      >
        {playing ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <span className="text-[11px] font-medium text-[color:var(--cofex-black)]/65">Café vibe</span>
      <audio ref={audioRef} src={url} loop preload="none" onEnded={() => setPlaying(false)} />
    </div>
  );
}
