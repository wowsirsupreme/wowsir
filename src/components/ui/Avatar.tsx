'use client';

import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar config type + encode/decode
//
// We pack the full card config into a single integer (avatarId) so it can be
// stored in RTDB / URL params without schema changes.
//
// Bit layout (12 bits):
//   bits 0–2   color (0–5)
//   bits 3–5   char  (0–7)
//   bits 6–8   hat   (0–5, 0 = none)
//   bits 9–11  item  (0–5, 0 = none)
//
// Old avatarIds 0–9 decode gracefully: they fall in the lower 3 bits, giving
// a color-variant card with the default character and no accessories.
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarConfig {
  color: number; // 0–5
  char: number;  // 0–7
  hat: number;   // 0–5  (0 = none)
  item: number;  // 0–5  (0 = none)
}

export function encodeAvatar(cfg: AvatarConfig): number {
  return (cfg.color & 0x7) | ((cfg.char & 0x7) << 3) | ((cfg.hat & 0x7) << 6) | ((cfg.item & 0x7) << 9);
}

export function decodeAvatar(id: number): AvatarConfig {
  return {
    color: id & 0x7,
    char:  (id >> 3) & 0x7,
    hat:   (id >> 6) & 0x7,
    item:  (id >> 9) & 0x7,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette data
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_COLORS = [
  { bg: '#3b82f6', dark: '#1d4ed8', name: 'Blue'   },
  { bg: '#ef4444', dark: '#b91c1c', name: 'Red'    },
  { bg: '#22c55e', dark: '#15803d', name: 'Green'  },
  { bg: '#f59e0b', dark: '#b45309', name: 'Yellow' },
  { bg: '#8b5cf6', dark: '#6d28d9', name: 'Purple' },
  { bg: '#f97316', dark: '#c2410c', name: 'Orange' },
] as const;

export const CHARACTERS = [
  { emoji: '🤖', label: 'Robot'      },
  { emoji: '🧙', label: 'Wizard'     },
  { emoji: '🥷', label: 'Ninja'      },
  { emoji: '👨‍🚀', label: 'Astronaut' },
  { emoji: '🦸', label: 'Hero'       },
  { emoji: '🎨', label: 'Artist'     },
  { emoji: '🔬', label: 'Scientist'  },
  { emoji: '🐲', label: 'Dragon'     },
] as const;

export const HATS = [
  { emoji: '',   label: 'None'    },
  { emoji: '🎩', label: 'Top Hat' },
  { emoji: '👑', label: 'Crown'   },
  { emoji: '🎓', label: 'Grad'    },
  { emoji: '🪖', label: 'Helmet'  },
  { emoji: '🎪', label: 'Party'   },
] as const;

export const ITEMS = [
  { emoji: '',   label: 'None'    },
  { emoji: '⚡', label: 'Zap'     },
  { emoji: '⭐', label: 'Star'    },
  { emoji: '🔥', label: 'Fire'    },
  { emoji: '🛡️', label: 'Shield'  },
  { emoji: '🎮', label: 'Game'    },
] as const;

export const AVATAR_COUNT = 10; // legacy compat

// ─────────────────────────────────────────────────────────────────────────────
// UnoCard — the main card component
// ─────────────────────────────────────────────────────────────────────────────

export function UnoCard({
  config,
  name,
  size = 100,
  spotlight = false,
  animate = false,
  className,
  onClick,
}: {
  config: AvatarConfig | number;
  name?: string;
  size?: number;
  spotlight?: boolean;
  /** play a pop-in animation on mount */
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const cfg = typeof config === 'number' ? decodeAvatar(config) : config;
  const col  = CARD_COLORS[cfg.color % CARD_COLORS.length];
  const char = CHARACTERS[cfg.char  % CHARACTERS.length];
  const hat  = HATS[cfg.hat   % HATS.length];
  const item = ITEMS[cfg.item  % ITEMS.length];

  const W      = size;
  const H      = Math.round(size * 1.44);
  const R      = Math.round(size * 0.13);
  const stripH = Math.round(H * 0.19);
  const ovalW  = Math.round(W * 0.73);
  const ovalH  = Math.round(H * 0.48);
  const ovalTop = Math.round((H - stripH - ovalH) / 2 + 2);
  const ovalLeft = Math.round((W - ovalW) / 2);
  const charSize = Math.round(W * 0.40);
  const hatSize  = Math.round(W * 0.24);
  const itemSize = Math.round(W * 0.22);
  const diamS    = Math.round(W * 0.11);
  const diamOff  = Math.round(W * 0.065);

  return (
    <div
      className={cn(className, animate ? 'uno-card-pop' : '')}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        width:  W,
        height: H,
        flexShrink: 0,
        borderRadius: R,
        background: `radial-gradient(ellipse 90% 70% at 50% 25%, ${col.bg}, ${col.dark})`,
        border: '1.5px solid rgba(255,255,255,0.28)',
        boxShadow: spotlight
          ? `0 0 0 3px #fff, 0 0 30px 10px ${col.bg}aa, 0 8px 28px rgba(0,0,0,0.5)`
          : '0 4px 18px rgba(0,0,0,0.38)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.35s ease, transform 0.2s ease',
        userSelect: 'none',
      }}
      onClick={onClick}
    >
      {/* Subtle inner shine */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: R,
        background: 'radial-gradient(ellipse 60% 40% at 50% 5%, rgba(255,255,255,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Corner diamonds */}
      {[
        { top: diamOff,          left:  diamOff,          visible: true  },
        { bottom: diamOff + stripH, right: diamOff,        visible: true  },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: diamS, height: diamS,
          background: 'rgba(255,255,255,0.30)',
          borderRadius: 2,
          transform: 'rotate(45deg)',
          ...(pos.top    !== undefined ? { top:    pos.top    } : {}),
          ...(pos.left   !== undefined ? { left:   pos.left   } : {}),
          ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
          ...(pos.right  !== undefined ? { right:  pos.right  } : {}),
        }} />
      ))}

      {/* Centre oval */}
      <div style={{
        position: 'absolute',
        top: ovalTop, left: ovalLeft,
        width: ovalW,  height: ovalH,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.16)',
        border: '1.5px solid rgba(255,255,255,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}>
        {/* Hat — floats above oval */}
        {hat.emoji && (
          <div style={{
            position: 'absolute',
            top:      -(hatSize * 0.52),
            fontSize: hatSize,
            lineHeight: 1,
            zIndex: 4,
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
          }}>
            {hat.emoji}
          </div>
        )}

        {/* Character */}
        <div style={{
          fontSize: charSize,
          lineHeight: 1,
          zIndex: 2,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
        }}>
          {char.emoji}
        </div>

        {/* Item — bottom-right corner of oval */}
        {item.emoji && (
          <div style={{
            position: 'absolute',
            bottom: -(itemSize * 0.28),
            right:  -(itemSize * 0.15),
            fontSize: itemSize,
            lineHeight: 1,
            zIndex: 5,
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
          }}>
            {item.emoji}
          </div>
        )}
      </div>

      {/* Name strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: stripH,
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(4px)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${Math.round(W * 0.08)}px`,
      }}>
        {name !== undefined && (
          <span style={{
            color: '#fff',
            fontSize: Math.max(10, Math.round(W * 0.115)),
            fontWeight: 700,
            letterSpacing: '0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            {name}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvatarCustomizer — the join-page picker
// ─────────────────────────────────────────────────────────────────────────────

export function AvatarCustomizer({
  value,
  onChange,
  previewName,
}: {
  value: number;
  onChange: (id: number) => void;
  previewName?: string;
}) {
  const cfg = decodeAvatar(value);

  function update(patch: Partial<AvatarConfig>) {
    onChange(encodeAvatar({ ...cfg, ...patch }));
  }

  const btnBase: React.CSSProperties = {
    borderRadius: 10,
    border: '2px solid transparent',
    cursor: 'pointer',
    padding: 4,
    background: 'rgba(255,255,255,0.06)',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const selectedStyle: React.CSSProperties = {
    border: '2px solid rgba(255,255,255,0.9)',
    background: 'rgba(255,255,255,0.14)',
    transform: 'scale(1.1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Live card preview */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <UnoCard config={cfg} name={previewName} size={110} spotlight />
      </div>

      {/* ── Card colour ── */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Card Colour</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CARD_COLORS.map((c, i) => (
            <button
              key={i}
              title={c.name}
              onClick={() => update({ color: i })}
              style={{
                ...btnBase,
                width: 36, height: 36,
                borderRadius: '50%',
                background: c.bg,
                border: cfg.color === i ? '2.5px solid white' : '2.5px solid transparent',
                boxShadow: cfg.color === i ? `0 0 0 2px ${c.bg}80, 0 0 12px ${c.bg}80` : 'none',
                transform: cfg.color === i ? 'scale(1.18)' : 'scale(1)',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Character ── */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Character</p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {CHARACTERS.map((ch, i) => (
            <button
              key={i}
              title={ch.label}
              onClick={() => update({ char: i })}
              style={{
                ...btnBase,
                width: 44, height: 44,
                fontSize: 22,
                ...(cfg.char === i ? selectedStyle : {}),
              }}
            >
              {ch.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hat ── */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hat</p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {HATS.map((h, i) => (
            <button
              key={i}
              title={h.label}
              onClick={() => update({ hat: i })}
              style={{
                ...btnBase,
                width: 44, height: 44,
                fontSize: i === 0 ? 14 : 22,
                color: 'rgba(255,255,255,0.35)',
                ...(cfg.hat === i ? selectedStyle : {}),
              }}
            >
              {h.emoji || '∅'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Item ── */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Item</p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {ITEMS.map((it, i) => (
            <button
              key={i}
              title={it.label}
              onClick={() => update({ item: i })}
              style={{
                ...btnBase,
                width: 44, height: 44,
                fontSize: i === 0 ? 14 : 22,
                color: 'rgba(255,255,255,0.35)',
                ...(cfg.item === i ? selectedStyle : {}),
              }}
            >
              {it.emoji || '∅'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Avatar — now renders as a small circle (unchanged visual API)
// ─────────────────────────────────────────────────────────────────────────────

export function Avatar({
  id,
  size = 48,
  className,
}: {
  id: number;
  size?: number;
  className?: string;
}) {
  const cfg = decodeAvatar(id);
  const col  = CARD_COLORS[cfg.color % CARD_COLORS.length];
  const char = CHARACTERS[cfg.char  % CHARACTERS.length];

  return (
    <div
      className={cn('rounded-full flex items-center justify-center flex-shrink-0 select-none', className)}
      style={{
        width: size, height: size,
        background: col.bg,
        fontSize: size * 0.52,
        lineHeight: 1,
      }}
    >
      {char.emoji}
    </div>
  );
}

// Legacy grid — replaced by AvatarCustomizer but kept to avoid import errors
export function AvatarGrid({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (id: number) => void;
}) {
  return <AvatarCustomizer value={selected} onChange={onSelect} />;
}
