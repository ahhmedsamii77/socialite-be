"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityEnum = exports.AllowCommentsEnum = exports.StorageApproachEnum = exports.ProviderTypeEnum = exports.FlagTypeEnum = exports.SignatureLevel = exports.TokenTypeEnum = exports.RoleEnum = exports.GenderEnum = exports.OtpTypeEnum = void 0;
var OtpTypeEnum;
(function (OtpTypeEnum) {
    OtpTypeEnum["FORGOT_PASSWORD"] = "forgot_password";
    OtpTypeEnum["CONFIRM_EMAIL"] = "confirm_email";
})(OtpTypeEnum || (exports.OtpTypeEnum = OtpTypeEnum = {}));
var GenderEnum;
(function (GenderEnum) {
    GenderEnum["MALE"] = "male";
    GenderEnum["FEMALE"] = "female";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["USER"] = "user";
    RoleEnum["ADMIN"] = "admin";
    RoleEnum["SUPER_ADMIN"] = "super-admin";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var TokenTypeEnum;
(function (TokenTypeEnum) {
    TokenTypeEnum["ACCESS_TOKEN"] = "access_token";
    TokenTypeEnum["REFRESH_TOKEN"] = "refresh_token";
})(TokenTypeEnum || (exports.TokenTypeEnum = TokenTypeEnum = {}));
var SignatureLevel;
(function (SignatureLevel) {
    SignatureLevel["BEARER"] = "Bearer";
    SignatureLevel["SYSTEM"] = "System";
})(SignatureLevel || (exports.SignatureLevel = SignatureLevel = {}));
var FlagTypeEnum;
(function (FlagTypeEnum) {
    FlagTypeEnum["ALL"] = "all";
    FlagTypeEnum["SINGLE"] = "single";
})(FlagTypeEnum || (exports.FlagTypeEnum = FlagTypeEnum = {}));
var ProviderTypeEnum;
(function (ProviderTypeEnum) {
    ProviderTypeEnum["GOOGLE"] = "google";
    ProviderTypeEnum["SYSTEM"] = "system";
})(ProviderTypeEnum || (exports.ProviderTypeEnum = ProviderTypeEnum = {}));
var StorageApproachEnum;
(function (StorageApproachEnum) {
    StorageApproachEnum["MEMORY"] = "memory";
    StorageApproachEnum["DISK"] = "disk";
})(StorageApproachEnum || (exports.StorageApproachEnum = StorageApproachEnum = {}));
var AllowCommentsEnum;
(function (AllowCommentsEnum) {
    AllowCommentsEnum["ALLOW"] = "allow";
    AllowCommentsEnum["DENY"] = "deny";
})(AllowCommentsEnum || (exports.AllowCommentsEnum = AllowCommentsEnum = {}));
var AvailabilityEnum;
(function (AvailabilityEnum) {
    AvailabilityEnum["PUBLIC"] = "public";
    AvailabilityEnum["ONLY_ME"] = "only_me";
    AvailabilityEnum["FRIENDS"] = "friends";
})(AvailabilityEnum || (exports.AvailabilityEnum = AvailabilityEnum = {}));
