// Direction guides stay visible while the picture demonstrates the actual curve.
const guides: Record<string, string> = {
  'fade in': 'M29 48H67 M29 48V22 M33 44H71 M33 44V18',
  'fade out': 'M29 18V48H67 M33 22V44H71',
  pause: 'M17 32H36 M31 27L36 32 31 37 M46 24V40 M53 24V40 M63 32H83 M78 27L83 32 78 37',
  'slide right': 'M8 32H29 M24 27L29 32 24 37',
  'slide left': 'M92 32H71 M76 27L71 32 76 37',
  'slide up': 'M50 58V47 M45 52L50 47 55 52',
  'slide down': 'M50 6V17 M45 12L50 17 55 12',
  'vortex in':
    'M35 13C47 2 67 7 69 19 M63 15L69 19 72 12 M78 25C90 37 78 51 65 50 M69 44L65 50 73 54 M57 55C41 65 27 53 28 43 M23 47L28 43 33 49 M22 37C10 25 20 13 31 16 M26 10L31 16 24 21',
  'vortex out':
    'M69 19C67 7 47 2 35 13 M35 6V13H42 M65 50C78 51 90 37 78 25 M85 25H78V32 M28 43C27 53 41 65 57 55 M57 62V55H50 M31 16C20 13 10 25 22 37 M15 37H22V30',
  'zoom in':
    'M25 16H75V48H25Z M32 23L23 14 M23 21V14H30 M68 23L77 14 M70 14H77V21 M32 41L23 50 M23 43V50H30 M68 41L77 50 M70 50H77V43',
  'zoom out':
    'M25 16H75V48H25Z M23 14L35 26 M28 26H35V19 M77 14L65 26 M65 19V26H72 M23 50L35 38 M28 38H35V45 M77 50L65 38 M65 45V38H72',
};

export function KeyframeArt({ name }: { name: string }) {
  return (
    <g
      className="keyframe-direction-guide"
      fill="none"
      stroke="#b6c0c7"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={guides[name.toLowerCase()] ?? guides.pause} />
    </g>
  );
}
