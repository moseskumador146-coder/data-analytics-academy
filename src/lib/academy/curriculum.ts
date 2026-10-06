import { CURRICULUM_A, type PathLevel } from "./curriculum-a";
import { CURRICULUM_B } from "./curriculum-b";

export type { Lesson, Module, PathLevel } from "./curriculum-a";

export const PATH_LEVELS: PathLevel[] = [...CURRICULUM_A, ...CURRICULUM_B];

export const ALL_LESSONS = PATH_LEVELS.flatMap((l) =>
  l.modules.flatMap((m) => m.lessons.map((ls) => ({ ...ls, levelId: l.id, moduleId: m.id })))
);

export const TOTAL_LESSONS = ALL_LESSONS.length;

export function findLesson(id: string) {
  return ALL_LESSONS.find((l) => l.id === id);
}
