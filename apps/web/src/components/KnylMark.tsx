import { useId } from "react";

interface Props {
  className?: string;
}

export default function KnylMark({ className }: Props) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 610.00818 554.7558" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="569.36572"
          y1="438.0968"
          x2="851.64734"
          y2="718.24396"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1.3806336,0,0,1.3806336,452.13468,-116.26665)"
        >
          <stop offset="0" stopColor="#3e5aff" stopOpacity="0.79813403" />
          <stop offset="0.47045985" stopColor="#4b4d6f" stopOpacity="1" />
          <stop offset="1" stopColor="#8e2bff" stopOpacity="0.80328321" />
        </linearGradient>
      </defs>
      <g transform="translate(-1048.881,-333.87114)">
        <path
          fill={`url(#${gradientId})`}
          d="m 1444.5027,333.87114 -254.1688,259.3272 -13.2616,-34.62369 -128.1913,268.90264 349.9448,-380.88497 -2.9473,119.34929 37.5737,-38.30987 z m 102.4042,194.49675 -203.336,243.85441 1.4749,-160.60382 -53.7827,57.46348 v 218.06999 l 41.2572,-1.47232 111.2462,-145.1364 135.5583,148.08373 79.5644,-2.21116 -177.5489,-190.81058 54.5161,-67.04432 z"
        />
      </g>
    </svg>
  );
}
