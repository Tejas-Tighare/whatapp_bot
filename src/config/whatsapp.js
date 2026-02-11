import dotenv from "dotenv";
dotenv.config();

export const config = {
  token: process.env.WHATSAPP_TOKEN,
  phoneId: process.env.PHONE_NUMBER_ID,
  verifyToken: process.env.VERIFY_TOKEN
};
