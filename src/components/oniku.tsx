// The "oniku" brand mark — the meat-on-bone logo shared across the 2018 & 2019
// meatup sites (vector original: 2018/src/asset/oniku.svg, mirrored in this repo
// at public/oniku.svg). The literal hexes here ARE the source the design tokens
// (--color-meat / --color-grill / --color-gold) were distilled from, so they're
// kept as-is to stay identical to the past editions. Inlined as an SVG component
// so the mark renders crisp at any size and can take a className.
export function Oniku({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      role="img"
      aria-label="meatup"
    >
      <g fill="none" fillRule="evenodd">
        <rect
          fill="#D8D8D8"
          transform="translate(161.388348, 165.388348) rotate(-45) translate(-161.388348, -165.388348)"
          x="118.388348"
          y="83.3883476"
          width="86"
          height="164"
          rx="43"
        />
        <ellipse
          fill="#DC7C34"
          transform="translate(249.989899, 253.989899) rotate(45) translate(-249.989899, -253.989899)"
          cx="249.989899"
          cy="253.989899"
          rx="151"
          ry="129"
        />
        <ellipse
          fill="#F4A047"
          transform="translate(324.237590, 322.237590) rotate(-45) translate(-324.237590, -322.237590)"
          cx="324.23759"
          cy="322.23759"
          rx="97.5"
          ry="48.5"
        />
        <ellipse
          fill="#B33D44"
          transform="translate(325.338095, 323.338095) rotate(-45) translate(-325.338095, -323.338095)"
          cx="325.338095"
          cy="323.338095"
          rx="88"
          ry="44"
        />
        <circle fill="#D8D8D8" cx="131" cy="104" r="30" />
        <circle fill="#D8D8D8" cx="103" cy="135" r="30" />
        <path
          fill="#D8D8D8"
          d="M352.504305,314.166648 L352.504305,314.166648 C372.035349,315.439706 388.143467,329.943531 391.451089,349.234513 L392.133658,353.215451 C395.077987,370.387612 383.544051,386.695249 366.37189,389.639578 C364.610885,389.941519 362.827413,390.093308 361.04071,390.093308 L351.472655,390.093308 C331.657392,390.093308 315.593947,374.029863 315.593947,354.2146 C315.593947,353.156349 315.640767,352.098617 315.73427,351.044505 L316.248956,345.242138 C317.888708,326.756227 333.98511,312.959544 352.504305,314.166648 Z"
          transform="translate(354.093217, 352.093217) rotate(-45) translate(-354.093217, -352.093217)"
        />
        <circle fill="#D8D8D8" cx="398" cy="368" r="30" />
        <circle fill="#D8D8D8" cx="370" cy="396" r="30" />
      </g>
    </svg>
  );
}
