import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");

async function getSOL(pub) {
  const balance = await connection.getBalance(new PublicKey(pub));
  return balance / 1e9;
}
