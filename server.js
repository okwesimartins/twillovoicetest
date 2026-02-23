// server.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const http = require("http");
const cors = require("cors");
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER; // your Twilio phone number
const client = twilio(accountSid, authToken);

// Call person A, say a message, then bridge them to person B
async function startCallAndBridge({ to, bridgeTo, message }) {
  // This URL is the webhook Twilio will request when the call is answered
  const twimlUrl = `https://twillovoicetest-156084498565.europe-west1.run.app/voice/entry` +
                   `?msg=${encodeURIComponent(message)}` +
                   `&bridgeTo=${encodeURIComponent(bridgeTo)}`;

  return client.calls.create({
    from: twilioNumber,
    to,           // person A
    url: twimlUrl // Twilio will fetch this when A answers
  });
}



// Example manual trigger route (optional)
app.get('/call-test', async (req, res) => {
  try {
    await startCallAndBridge({
      to: req.query.phone,            // person A
      bridgeTo: '+2347036176833',      // person B
      message: 'Hello, this is the EVADE device. An accident has just occurred. I will now connect you to the victim. Please hold.'
    });
    res.send('Call started');
  } catch (err) {
    console.error(err);
    res.status(500).json({"message":err});
  }
});


// Twilio will POST here when the call is answered
app.post('/voice/entry', (req, res) => {
  const msg = req.query.msg || 'Hello, please hold.';
  const bridgeTo = req.query.bridgeTo; // person B’s number

  const twiml = new twilio.twiml.VoiceResponse();

  // 1) Say something to the called party
  twiml.say(
    { voice: 'Polly.Joanna', language: 'en-US' },  // customise or remove attrs
    msg
  );

  // 2) Then dial/bridge to another number
  const dial = twiml.dial({
    callerId: twilioNumber, // what B sees as caller ID
  });

  dial.number(bridgeTo);    // bridges A <-> B

  res.type('text/xml');
  res.send(twiml.toString());
});

const server = http.createServer(app);

const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () =>
  console.log(
    `🚀 Praxis Voice (Gemini+TTS+WS) listening on ${PORT}`
  )
);


