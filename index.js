const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GS_PROJECT_ID,
    private_key_id: process.env.GS_PRIVATE_KEY_ID,
    private_key: process.env.GS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GS_CLIENT_EMAIL,
    client_id: process.env.GS_CLIENT_ID,
    client_x509_cert_url: process.env.GS_CLIENT_CERT_URL,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

app.post('/submit', async (req, res) => {
  const { name, email, message } = req.body;

  const msg = {
    to: process.env.RECEIVER_EMAIL,
    from: process.env.RECEIVER_EMAIL,
    subject: `New message from ${name}`,
    html: `<strong>${name}</strong> (${email}) says:<br><br>${message}`,
  };

  try {
    await sgMail.send(msg);

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [[name, email, message, new Date().toLocaleString()]],
      },
    });

    res.status(200).send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});