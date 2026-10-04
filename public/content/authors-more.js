// Shorter guides for the rest of the Complete Works shelf. Original descriptions of technique; no passages reproduced.
import { PART_A } from './authors-a.js';
import { PART_B } from './authors-b.js';
import { PART_C } from './authors-c.js';
import { PART_D } from './authors-d.js';

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const AUTHORS_MORE = [...PART_A, ...PART_B, ...PART_C, ...PART_D].map(([lib, name, kind, known, voice, borrow, exercise]) => ({ id: slug(name), name, lib: lib || undefined, kind, known, voice, borrow, exercises: [exercise] }));
