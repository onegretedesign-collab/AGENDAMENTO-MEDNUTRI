import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import twilio from "twilio";
import admin from "firebase-admin";

dotenv.config();

// Lazy initialization for services
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Notify Attendant (WhatsApp)
  app.post("/api/notify-attendant", async (req, res) => {
    const { patientName, city, type } = req.body;
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Novo agendamento: ${patientName} - ${type} em ${city}`,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:+5564984530700`, // Attendant number
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Twilio error:", e);
        res.status(500).json({ error: "Failed to notify attendant" });
      }
    } else {
      res.status(500).json({ error: "Twilio not configured" });
    }
  });

  // Notify Patient (Push)
  app.post("/api/notify-patient", async (req, res) => {
    const { token, message } = req.body;
    if (admin.apps.length > 0) {
      try {
        await admin.messaging().send({
          token,
          notification: { title: "MedNutri", body: message },
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Firebase error:", e);
        res.status(500).json({ error: "Failed to notify patient" });
      }
    } else {
      res.status(500).json({ error: "Firebase not configured" });
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("chat:message", (data) => {
      io.emit("chat:message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
