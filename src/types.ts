import { Type, Static } from '@sinclair/typebox';

export const ShapeTypeSchema = Type.Union([
  Type.Literal('box'),
  Type.Literal('sphere'),
  Type.Literal('cylinder'),
]);

export const WorldObjectSchema = Type.Object({
  id: Type.String(),
  type: ShapeTypeSchema,
  color: Type.String(),
  position: Type.Tuple([Type.Number(), Type.Number(), Type.Number()]),
});

export type WorldObject = Static<typeof WorldObjectSchema>;