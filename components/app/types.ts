export type Equipment = "machine" | "cable" | "dumbbell" | "barbell" | "bodyweight" | "other";
export type Muscle = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "fullbody" | "other";

export type Exercise = {
  id: string;
  name: string;
  equipment: Equipment;
  muscle: Muscle;
  notes?: string | null;
  imageUrl?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  ownerId?: string | null;
};

export type LogEntry = {
  id: string;
  exerciseId: string;
  dateTime: string; // ISO
  weightKg: string | number; // Prisma Decimal dažnai ateina kaip string
  reps: number;
  comment?: string | null;
};
