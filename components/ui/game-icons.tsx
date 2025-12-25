import React from "react";
import Svg, { Path, Circle, Rect, G, Polygon } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

// Word Games Icons
export function WordIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M4 12h16M4 17h10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CrosswordIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={9} y={3} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={15} y={3} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={3} y={9} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={9} y={9} width={6} height={6} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.2} />
      <Rect x={15} y={9} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={3} y={15} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={9} y={15} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={15} y={15} width={6} height={6} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function PuzzleIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C10.3431 2 9 3.34315 9 5C9 5.55228 8.55228 6 8 6H5C3.89543 6 3 6.89543 3 8V11C3 11.5523 3.44772 12 4 12C5.65685 12 7 13.3431 7 15C7 16.6569 5.65685 18 4 18C3.44772 18 3 18.4477 3 19V21C3 22.1046 3.89543 23 5 23H8C8.55228 23 9 22.5523 9 22C9 20.3431 10.3431 19 12 19C13.6569 19 15 20.3431 15 22C15 22.5523 15.4477 23 16 23H19C20.1046 23 21 22.1046 21 21V18C21 17.4477 20.5523 17 20 17C18.3431 17 17 15.6569 17 14C17 12.3431 18.3431 11 20 11C20.5523 11 21 10.5523 21 10V8C21 6.89543 20.1046 6 19 6H16C15.4477 6 15 5.55228 15 5C15 3.34315 13.6569 2 12 2Z"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

// Strategy Icons
export function StrategyIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M12 3v18M3 12h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={12} r={3} fill={color} />
    </Svg>
  );
}

// Trivia Icons
export function TriviaIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M12 16v.01M12 8c-1.1 0-2 .9-2 2 0 .74.4 1.39 1 1.73V13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GlobeIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

export function MusicIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18V5l12-2v13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={6} cy={18} r={3} stroke={color} strokeWidth={2} fill="none" />
      <Circle cx={18} cy={16} r={3} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// Number Icons
export function NumberIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={14} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={3} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={14} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M6 6h2M17 6h2M6 17h2M17 17h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Connection/Link Icon
export function ConnectionIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// Bee Icon
export function BeeIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M12 7v10M7 12h10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M8 8l8 8M16 8l-8 8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}

// Thread/Strand Icon
export function ThreadIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M3 12h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 3c2.5 0 4.5 4.03 4.5 9s-2 9-4.5 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Waffle Icon
export function WaffleIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M3 9h18M3 15h18M9 3v18M15 3v18"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

// Thought/Reunion Icon
export function ThoughtIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={9} cy={10} r={1} fill={color} />
      <Circle cx={12} cy={10} r={1} fill={color} />
      <Circle cx={15} cy={10} r={1} fill={color} />
    </Svg>
  );
}

// Pin/Location Icon
export function PinIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// Crown/Queens Icon
export function CrownIcon({ size = 24, color = "#7C3AED" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 20h20M3 8l3 4 4-6 4 6 3-4v10H3V8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={6} cy={8} r={1.5} fill={color} />
      <Circle cx={12} cy={6} r={1.5} fill={color} />
      <Circle cx={18} cy={8} r={1.5} fill={color} />
    </Svg>
  );
}

// Helper function to get icon by game type
export function getGameIcon(gameId: string, size: number = 24, color: string = "#7C3AED"): React.ReactElement {
  const iconMap: { [key: string]: React.ReactElement } = {
    wordle: <WordIcon size={size} color={color} />,
    "nyt-mini": <CrosswordIcon size={size} color={color} />,
    "linkedin-queens": <CrownIcon size={size} color={color} />,
    "linkedin-pinpoint": <PinIcon size={size} color={color} />,
    connections: <ConnectionIcon size={size} color={color} />,
    "spelling-bee": <BeeIcon size={size} color={color} />,
    sudoku: <NumberIcon size={size} color={color} />,
    "guardian-mini": <CrosswordIcon size={size} color={color} />,
    geoguessr: <GlobeIcon size={size} color={color} />,
    bandle: <MusicIcon size={size} color={color} />,
    reunion: <ThoughtIcon size={size} color={color} />,
    strands: <ThreadIcon size={size} color={color} />,
    waffle: <WaffleIcon size={size} color={color} />,
  };

  return iconMap[gameId] || <PuzzleIcon size={size} color={color} />;
}
