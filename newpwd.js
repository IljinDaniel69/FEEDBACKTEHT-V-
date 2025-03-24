import bcrypt from "bcrypt";

const hash = await bcrypt.hash("salasana", 10);

console.log(hash);
