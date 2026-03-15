export type EncryptedPayload = {
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
};

export type EncryptedWalletFile = {
  version: 1;
  name: string;
  wallet: EncryptedPayload;
  secret?: EncryptedPayload;
};
