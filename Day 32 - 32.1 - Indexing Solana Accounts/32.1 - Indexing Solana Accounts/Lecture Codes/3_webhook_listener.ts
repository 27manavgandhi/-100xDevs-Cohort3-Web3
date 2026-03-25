function webhook(data) {
  console.log("update", data);
}
setInterval(()=>webhook({price:Math.random()}),1000);
