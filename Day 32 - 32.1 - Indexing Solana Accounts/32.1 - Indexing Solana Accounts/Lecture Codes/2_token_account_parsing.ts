async function getUSDC(pub) {
  const info = await connection.getParsedAccountInfo(new PublicKey(pub));
  return info.value?.data.parsed.info.tokenAmount.uiAmount;
}
