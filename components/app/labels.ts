import type { Equipment, Muscle } from "./types";

export const muscleLabel: Record<Muscle, string> = {
  chest: "Krūtinė",
  back: "Nugara",
  legs: "Kojos",
  shoulders: "Pečiai",
  arms: "Rankos",
  core: "Korsetas",
  fullbody: "Visas kūnas",
  other: "Kita",
};

export const equipmentLabel: Record<Equipment, string> = {
  machine: "Aparatas",
  cable: "Lynai",
  dumbbell: "Hanteliai",
  barbell: "Štanga",
  bodyweight: "Savo svoris",
  other: "Kita",
};
