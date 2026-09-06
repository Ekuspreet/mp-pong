import argon2 from 'argon2'
const argon2PasswordHasher = {
  hash: (password) => argon2.hash(password, { type: argon2.argon2id }),
  verify: (hash, password) => argon2.verify(hash, password),
}
export { argon2PasswordHasher }
