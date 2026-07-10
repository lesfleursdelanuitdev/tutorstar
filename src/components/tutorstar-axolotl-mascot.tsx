type TutorstarAxolotlMascotProps = {
  className?: string;
  title?: string;
};

/** Full TutorStar axolotl mascot — pink axolotl in navy hoodie holding a yellow star. */
export function TutorstarAxolotlMascot({
  className,
  title = "TutorStar Axolotl Mascot",
}: TutorstarAxolotlMascotProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      role="img"
      aria-labelledby="axolotl-title axolotl-desc"
      className={className}
    >
      <title id="axolotl-title">{title}</title>
      <desc id="axolotl-desc">
        A cute pink axolotl mascot wearing a navy hoodie, waving, and holding a
        smiling yellow star.
      </desc>

      <defs>
        <linearGradient
          id="bodyGradient"
          x1="120"
          y1="80"
          x2="380"
          y2="420"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffd6df" />
          <stop offset="1" stopColor="#ff9fba" />
        </linearGradient>

        <linearGradient
          id="gillGradient"
          x1="80"
          y1="80"
          x2="430"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff9fba" />
          <stop offset="1" stopColor="#f45f8a" />
        </linearGradient>

        <linearGradient
          id="hoodieGradient"
          x1="130"
          y1="240"
          x2="380"
          y2="430"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#17245f" />
          <stop offset="1" stopColor="#0d1744" />
        </linearGradient>

        <linearGradient
          id="starGradient"
          x1="330"
          y1="250"
          x2="440"
          y2="370"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffe574" />
          <stop offset="1" stopColor="#ffb72e" />
        </linearGradient>
      </defs>

      <g strokeLinecap="round" strokeLinejoin="round">
        <g>
          <path
            d="M325 344 C405 310 455 350 445 410 C438 456 377 458 329 419 C300 395 295 364 325 344 Z"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="8"
          />
          <path
            d="M360 367 C400 351 422 371 419 402 C415 431 379 430 348 407"
            fill="none"
            stroke="#ffcad6"
            strokeWidth="12"
          />
        </g>

        <g>
          <path
            d="M162 150 C105 98 74 96 45 126 C93 132 118 158 156 184 Z"
            fill="#ffd6df"
            stroke="#ef6f91"
            strokeWidth="7"
          />
          <path
            d="M170 116 C137 48 103 37 69 58 C112 83 127 113 163 151 Z"
            fill="#ffd6df"
            stroke="#ef6f91"
            strokeWidth="7"
          />
          <path
            d="M350 150 C407 98 438 96 467 126 C419 132 394 158 356 184 Z"
            fill="#ffd6df"
            stroke="#ef6f91"
            strokeWidth="7"
          />
          <path
            d="M342 116 C375 48 409 37 443 58 C400 83 385 113 349 151 Z"
            fill="#ffd6df"
            stroke="#ef6f91"
            strokeWidth="7"
          />

          <g fill="none" stroke="url(#gillGradient)" strokeWidth="8">
            <path d="M53 123 L32 108" />
            <path d="M69 126 L47 143" />
            <path d="M86 134 L62 156" />
            <path d="M104 145 L80 169" />
            <path d="M122 158 L99 183" />
            <path d="M75 60 L54 47" />
            <path d="M91 72 L77 45" />
            <path d="M108 87 L103 56" />
            <path d="M124 106 L128 75" />
            <path d="M140 128 L151 99" />
          </g>

          <g fill="none" stroke="url(#gillGradient)" strokeWidth="8">
            <path d="M459 123 L480 108" />
            <path d="M443 126 L465 143" />
            <path d="M426 134 L450 156" />
            <path d="M408 145 L432 169" />
            <path d="M390 158 L413 183" />
            <path d="M437 60 L458 47" />
            <path d="M421 72 L435 45" />
            <path d="M404 87 L409 56" />
            <path d="M388 106 L384 75" />
            <path d="M372 128 L361 99" />
          </g>
        </g>

        <g>
          <path
            d="M172 272 C175 229 207 202 256 202 C305 202 337 229 340 272 L354 407 C357 438 332 460 301 460 L211 460 C180 460 155 438 158 407 Z"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="8"
          />
        </g>

        <g>
          <path
            d="M142 292 C147 244 190 220 256 220 C322 220 365 244 370 292 L384 401 C388 433 363 452 326 452 L186 452 C149 452 124 433 128 401 Z"
            fill="url(#hoodieGradient)"
            stroke="#0a1238"
            strokeWidth="8"
          />
          <path
            d="M187 242 C204 278 230 296 256 296 C282 296 308 278 325 242"
            fill="none"
            stroke="#273779"
            strokeWidth="8"
          />
          <path
            d="M205 393 L307 393 L296 438 L216 438 Z"
            fill="#111c52"
            stroke="#0a1238"
            strokeWidth="6"
          />
          <path
            d="M238 296 C227 321 222 340 222 364"
            fill="none"
            stroke="#0a1238"
            strokeWidth="6"
          />
          <path
            d="M274 296 C285 321 290 340 290 364"
            fill="none"
            stroke="#0a1238"
            strokeWidth="6"
          />
          <circle cx="222" cy="369" r="6" fill="#0a1238" />
          <circle cx="290" cy="369" r="6" fill="#0a1238" />
        </g>

        <g>
          <path
            d="M193 446 C184 461 191 477 211 475 C225 473 230 463 222 448 Z"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="7"
          />
          <path
            d="M319 446 C328 461 321 477 301 475 C287 473 282 463 290 448 Z"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="7"
          />
        </g>

        <g>
          <path
            d="M145 302 C107 294 90 268 94 235 C96 214 119 209 130 226 C140 242 151 256 175 263 Z"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="8"
          />
          <path
            d="M101 233 L82 213 M103 232 L98 204 M112 235 L124 209"
            fill="none"
            stroke="#ef6f91"
            strokeWidth="8"
          />
          <path
            d="M367 308 C393 309 410 323 410 350 C410 374 390 388 367 378 C351 371 340 360 333 344 Z"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="8"
          />
        </g>

        <g>
          <ellipse
            cx="256"
            cy="170"
            rx="120"
            ry="102"
            fill="url(#bodyGradient)"
            stroke="#ef6f91"
            strokeWidth="8"
          />
          <ellipse cx="207" cy="186" rx="14" ry="10" fill="#ff88a7" opacity="0.7" />
          <ellipse cx="305" cy="186" rx="14" ry="10" fill="#ff88a7" opacity="0.7" />
          <ellipse cx="226" cy="128" rx="10" ry="6" fill="#ffb6c8" opacity="0.7" />
          <ellipse cx="256" cy="118" rx="9" ry="5" fill="#ffb6c8" opacity="0.7" />
          <ellipse cx="286" cy="128" rx="10" ry="6" fill="#ffb6c8" opacity="0.7" />
        </g>

        <g>
          <circle cx="214" cy="164" r="25" fill="#071949" />
          <circle cx="298" cy="164" r="25" fill="#071949" />
          <circle cx="205" cy="154" r="8" fill="#ffffff" />
          <circle cx="289" cy="154" r="8" fill="#ffffff" />
          <circle cx="223" cy="176" r="6" fill="#2d3e86" />
          <circle cx="307" cy="176" r="6" fill="#2d3e86" />
          <path
            d="M232 205 C244 220 268 220 280 205"
            fill="none"
            stroke="#5a1437"
            strokeWidth="7"
          />
          <path
            d="M191 132 C199 122 211 121 220 129"
            fill="none"
            stroke="#5a1437"
            strokeWidth="6"
          />
          <path
            d="M292 129 C301 121 313 122 321 132"
            fill="none"
            stroke="#5a1437"
            strokeWidth="6"
          />
        </g>

        <g>
          <polygon
            points="385,257 401,306 453,306 411,336 427,386 385,355 343,386 359,336 317,306 369,306"
            fill="url(#starGradient)"
            stroke="#f49b18"
            strokeWidth="8"
          />
          <circle cx="370" cy="318" r="5" fill="#071949" />
          <circle cx="400" cy="318" r="5" fill="#071949" />
          <path
            d="M374 338 C381 346 391 346 398 338"
            fill="none"
            stroke="#7a3a12"
            strokeWidth="5"
          />
          <ellipse cx="360" cy="333" rx="6" ry="4" fill="#ff8b55" />
          <ellipse cx="410" cy="333" rx="6" ry="4" fill="#ff8b55" />
        </g>

        <g>
          <polygon
            points="256,330 265,348 285,351 270,365 274,385 256,375 238,385 242,365 227,351 247,348"
            fill="#ffffff"
          />
        </g>
      </g>
    </svg>
  );
}
