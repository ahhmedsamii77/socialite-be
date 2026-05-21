import { z } from "zod";
import {
  acceptRequestSchema,
  changeRoleSchema,
  freezeAccountSchema,
  hardDeleteAccountSchema,
  logoutSchema,
  rejectRequestSchema,
  removeFriendSchema,
  reStoreAccountSchema,
  sendRequestSchema,
  shareProfileSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "./user.validation";

export type LogoutType = z.infer<typeof logoutSchema.body>;
export type UpdatePasswordDto = z.infer<typeof updatePasswordSchema.body>;
export type shareProfileDto = z.infer<typeof shareProfileSchema.params>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema.body>;
export type FreezeAccountDto = z.infer<typeof freezeAccountSchema.params>;
export type ReStoreAccountDto = z.infer<typeof reStoreAccountSchema.params>;
export type HardDeleteAccountDto = z.infer<typeof hardDeleteAccountSchema.params>;

export type ChangeRoleParamsDto = z.infer<typeof changeRoleSchema.params>;
export type ChangeRoleBodyDto = z.infer<typeof changeRoleSchema.body>;
export type SendRequsetDto = z.infer<typeof sendRequestSchema.params>;
export type AcceptRequestDto = z.infer<typeof acceptRequestSchema.params>;
export type RejectRequestDto = z.infer<typeof rejectRequestSchema.params>;
export type RemoveFriendDto = z.infer<typeof removeFriendSchema.params>;