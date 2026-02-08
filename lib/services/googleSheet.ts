import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

export async function addReplyToSheet(
  name: string,
  email: string,
  message: string,
  category: string,
  reply: string
): Promise<void> {
  if (!process.env.SPREADSHEET_ID) throw new Error("SPREADSHEET_ID missing");

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A:E",
    valueInputOption: "RAW",
    requestBody: { values: [[name, email, message, category, reply]] }
  });
}
