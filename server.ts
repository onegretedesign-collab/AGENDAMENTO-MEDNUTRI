import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import twilio from "twilio";
import admin from "firebase-admin";
import path from "path";

dotenv.config();

// Lazy initialization for Twilio
let twilioClient: twilio.Twilio | null = null;
function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
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

  // SQLite setup
  const Database = (await import("better-sqlite3")).default;
  const db = new Database("appointments.db");

  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patientName TEXT,
      contact TEXT,
      date TEXT,
      time TEXT,
      status TEXT,
      city TEXT,
      type TEXT,
      pushToken TEXT,
      showExams INTEGER DEFAULT 0,
      observations TEXT
    )
  `);

  // Migration: Add columns if they don't exist
  try { db.exec("ALTER TABLE appointments ADD COLUMN showExams INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE appointments ADD COLUMN observations TEXT"); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      patientName TEXT,
      contact TEXT,
      city TEXT,
      type TEXT,
      timestamp TEXT,
      showExams INTEGER DEFAULT 0
    )
  `);
  
  try { db.exec("ALTER TABLE requests ADD COLUMN showExams INTEGER DEFAULT 0"); } catch (e) {}

  app.get("/api/requests", (req, res) => {
    const requests = db.prepare("SELECT * FROM requests ORDER BY timestamp DESC").all();
    res.json(requests);
  });

  app.get("/api/appointments", (req, res) => {
    const appointments = db.prepare("SELECT * FROM appointments").all();
    res.json(appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const { patientName, contact, date, time, status, city, type, pushToken, showExams, observations } = req.body;
    const id = Date.now().toString();
    const stmt = db.prepare("INSERT INTO appointments (id, patientName, contact, date, time, status, city, type, pushToken, showExams, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, patientName, contact, date, time, status || 'Scheduled', city, type, pushToken, showExams ? 1 : 0, observations);
    
    const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    
    // Emit socket event for real-time update
    io.emit("new-appointment", appointment);
    
    res.json(appointment);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const { status, date, time, observations } = req.body;
    const oldAppointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id) as any;
    
    if (!oldAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (status) {
      db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
    }
    if (date) {
      db.prepare("UPDATE appointments SET date = ? WHERE id = ?").run(date, req.params.id);
    }
    if (time) {
      db.prepare("UPDATE appointments SET time = ? WHERE id = ?").run(time, req.params.id);
    }
    if (observations !== undefined) {
      db.prepare("UPDATE appointments SET observations = ? WHERE id = ?").run(observations, req.params.id);
    }

    const newAppointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id) as any;

    // Emit socket event for real-time update
    io.emit("update-appointment", newAppointment);

    if (newAppointment && newAppointment.pushToken) {
      let message = "";
      if (status && status !== oldAppointment?.status) {
        message = `Seu agendamento foi atualizado para: ${status}`;
      } else if (date || time) {
        message = `Seu agendamento foi reagendado para: ${newAppointment.date} às ${newAppointment.time}`;
      }

      if (message && admin.apps.length > 0) {
        try {
          await admin.messaging().send({
            token: newAppointment.pushToken,
            notification: { title: "MedNutri", body: message },
          });
        } catch (e) {
          console.error("Firebase error:", e);
        }
      }
    }

    res.json(newAppointment);
  });

  app.delete("/api/appointments/:id", (req, res) => {
    db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
    io.emit("delete-appointment", req.params.id);
    res.status(204).send();
  });

  app.delete("/api/requests/:id", (req, res) => {
    db.prepare("DELETE FROM requests WHERE id = ?").run(req.params.id);
    io.emit("delete-request", req.params.id);
    res.status(204).send();
  });

  // Notify Attendant (WhatsApp)
  app.post("/api/notify-attendant", async (req, res) => {
    const { patientName, contact, city, type, showExams } = req.body;
    
    // Save request to database
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    const newRequest = { id, patientName, contact, city, type, timestamp, showExams: showExams ? 1 : 0 };
    db.prepare("INSERT INTO requests (id, patientName, contact, city, type, timestamp, showExams) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, patientName, contact, city, type, timestamp, showExams ? 1 : 0);

    // Emit socket event for real-time update
    io.emit("new-request", newRequest);

    const client = getTwilioClient();
    if (client && process.env.TWILIO_PHONE_NUMBER && process.env.ATTENDANT_PHONE_NUMBER) {
      try {
        await client.messages.create({
          body: `Novo agendamento: ${patientName} - ${type} em ${city}`,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${process.env.ATTENDANT_PHONE_NUMBER.startsWith('+') ? process.env.ATTENDANT_PHONE_NUMBER : '+' + process.env.ATTENDANT_PHONE_NUMBER}`,
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Twilio error:", e);
        res.status(500).json({ error: "Failed to notify attendant" });
      }
    } else {
      // Still success if saved to DB even if Twilio fails
      res.json({ success: true, note: "Twilio not configured, but request saved" });
    }
  });

  // Notify Patient (WhatsApp)
  app.post("/api/notify-patient-whatsapp", async (req, res) => {
    const { phoneNumber, message } = req.body;
    
    // Better phone formatting for Brazil
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.length === 11 && !formattedNumber.startsWith('55')) {
      formattedNumber = '55' + formattedNumber;
    }
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    console.log(`Attempting to send WhatsApp to ${formattedNumber}`);

    const client = getTwilioClient();
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const result = await client.messages.create({
          body: message,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${formattedNumber}`,
        });
        console.log("Twilio success:", result.sid);
        res.json({ success: true, sid: result.sid });
      } catch (e) {
        console.error("Twilio WhatsApp error:", e);
        res.status(500).json({ error: "Failed to notify patient", details: e instanceof Error ? e.message : String(e) });
      }
    } else {
      console.warn("Twilio not configured. Message would have been:", message);
      res.status(500).json({ error: "Twilio not configured" });
    }
  });

  // Notify Patient (SMS)
  app.post("/api/notify-patient-sms", async (req, res) => {
    const { phoneNumber, message } = req.body;
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const client = getTwilioClient();
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedNumber,
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Twilio SMS error:", e);
        res.status(500).json({ error: "Failed to notify patient" });
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
    // SPA fallback for production
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
